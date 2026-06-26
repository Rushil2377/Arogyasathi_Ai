import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Upload,
  FileCheck,
  AlertTriangle,
  TrendingUp,
  Stethoscope,
  MapPin,
  Star,
  Sparkles,
  Trash2,
  Brain,
  Activity,
  Navigation,
  Search,
  Loader2,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import Reveal from "@/components/Reveal";
import { storage, KEYS } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import HospitalMap from "@/components/HospitalMap";
import { useTranslation } from "@/lib/translationContext";

export const Route = createFileRoute("/report-analysis")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "Report Analysis & Expert Consultation • ArogyaSathi AI" }] }),
  component: ReportsAndDoctors,
});

type ReportRecord = {
  id: string;
  name: string;
  time: number;
  summary: string;
  findings: { label: string; value: string; status: "normal" | "abnormal" | "borderline" }[];
  riskLevel: "Low" | "Moderate" | "High";
  recommendations: string[];
};

const sampleReports: Omit<ReportRecord, "id" | "name" | "time">[] = [
  {
    summary:
      "Complete Blood Count and lipid profile from a 42-year-old patient. Most values are within range; cholesterol is elevated and Vitamin D is deficient.",
    findings: [
      { label: "Hemoglobin", value: "13.8 g/dL", status: "normal" },
      { label: "Total Cholesterol", value: "238 mg/dL", status: "abnormal" },
      { label: "HDL", value: "38 mg/dL", status: "borderline" },
      { label: "Vitamin D", value: "16 ng/mL", status: "abnormal" },
      { label: "Fasting Glucose", value: "98 mg/dL", status: "normal" },
    ],
    riskLevel: "Moderate",
    recommendations: [
      "Adopt a low-fat, high-fiber diet",
      "Vitamin D3 60,000 IU weekly for 8 weeks",
      "30 minutes brisk walk daily",
      "Repeat lipid profile in 3 months",
    ],
  },
  {
    summary:
      "Thyroid function test of a 28-year-old female. TSH is elevated, suggesting subclinical hypothyroidism.",
    findings: [
      { label: "TSH", value: "6.8 mIU/L", status: "abnormal" },
      { label: "T3", value: "1.2 ng/mL", status: "normal" },
      { label: "T4", value: "8.4 µg/dL", status: "normal" },
    ],
    riskLevel: "Low",
    recommendations: [
      "Repeat TSH after 6 weeks",
      "Iodine-rich diet (sea salt, dairy)",
      "Endocrinology consult if persistently elevated",
    ],
  },
  {
    summary:
      "HbA1c and renal function for a known diabetic. Sugar control is poor and kidney markers show early strain.",
    findings: [
      { label: "HbA1c", value: "9.2 %", status: "abnormal" },
      { label: "Fasting Glucose", value: "186 mg/dL", status: "abnormal" },
      { label: "Creatinine", value: "1.4 mg/dL", status: "borderline" },
      { label: "Urea", value: "44 mg/dL", status: "normal" },
    ],
    riskLevel: "High",
    recommendations: [
      "Urgent diabetology consult — review medication",
      "Strict diet: low carb, no sugar",
      "Daily blood sugar monitoring",
      "Repeat creatinine in 4 weeks",
    ],
  },
];

// Dynamic hospital lookup is handled inside the component state

const riskColor: Record<string, string> = {
  Low: "bg-medical-tint text-medical-dark border-medical-light/40",
  Moderate: "gradient-soft text-medical-dark border-medical-dark/30",
  High: "gradient-medical text-white border-medical-dark",
};

const statusBadge: Record<string, string> = {
  normal: "bg-medical-tint text-medical-dark",
  borderline: "gradient-soft text-medical-dark",
  abnormal: "gradient-medical text-white",
};

function ReportsAndDoctors() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDiscussReport = (r: ReportRecord) => {
    const findingsText = r.findings.map((f) => `${f.label}: ${f.value} (${f.status})`).join(", ");
    const recommendationsText = r.recommendations.join(". ");
    const messageText = `I want to discuss my medical report "${r.name}".
Summary: ${r.summary}
Risk Level: ${r.riskLevel}
Findings: ${findingsText}
Recommendations: ${recommendationsText}`;

    navigate({
      to: "/ai-health-assistant",
      search: {
        reportText: messageText,
      },
    });
  };

  const [hospitalsList, setHospitalsList] = useState<
    {
      name: string;
      distance: string;
      phone: string;
      website?: string;
      x: number;
      y: number;
      lat: number;
      lon: number;
    }[]
  >([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
    name: string;
  } | null>(null);
  const [locationSearch, setLocationSearch] = useState("");
  const [searchRadius, setSearchRadius] = useState(5000); // 5km default
  const [selectedHospitalIndex, setSelectedHospitalIndex] = useState<number | null>(null);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  const generateDummyPhoneNumber = (name: string): string => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const absHash = Math.abs(hash);
    const numPart = (absHash % 9000000) + 1000000; // 7 digits
    const prefixes = ["9879", "9924", "9426", "8866", "7573", "9099"];
    const prefix = prefixes[absHash % prefixes.length];
    return `+91 ${prefix} ${String(numPart).substring(0, 3)} ${String(numPart).substring(3)}`;
  };

  const fetchHospitals = async (lat: number, lon: number) => {
    setLoadingHospitals(true);
    try {
      const query = `[out:json][timeout:25];(node["amenity"="hospital"](around:${searchRadius},${lat},${lon});way["amenity"="hospital"](around:${searchRadius},${lat},${lon});node["amenity"="clinic"](around:${searchRadius},${lat},${lon});way["amenity"="clinic"](around:${searchRadius},${lat},${lon}););out body center;`;
      const response = await fetch(
        `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
      );
      if (!response.ok) throw new Error("Failed to fetch hospital data");
      const data = await response.json();

      const elements = data.elements || [];

      let parsed = elements
        .map((el: any) => {
          const tags = el.tags || {};
          const elLat = el.lat || (el.center && el.center.lat);
          const elLon = el.lon || (el.center && el.center.lon);
          if (!elLat || !elLon) return null;

          const name =
            tags.name || (tags.amenity === "hospital" ? "Unnamed Hospital" : "Unnamed Clinic");
          const distanceVal = calculateDistance(lat, lon, elLat, elLon);
          const rawPhone =
            tags.phone ||
            tags["contact:phone"] ||
            tags.mobile ||
            tags["contact:mobile"] ||
            tags["emergency:phone"] ||
            "N/A";
          const phone = rawPhone !== "N/A" ? rawPhone : generateDummyPhoneNumber(name);
          const website = tags.website || tags["contact:website"] || undefined;

          return {
            name,
            distance: `${distanceVal} km`,
            distanceNum: parseFloat(distanceVal),
            phone,
            website,
            lat: elLat,
            lon: elLon,
            x: 50,
            y: 50,
          };
        })
        .filter(Boolean);

      parsed.sort((a: any, b: any) => a.distanceNum - b.distanceNum);

      if (parsed.length > 0) {
        const dxs = parsed.map((h: any) => h.lon - lon);
        const dys = parsed.map((h: any) => h.lat - lat);
        const maxDx = Math.max(...dxs.map(Math.abs), 0.0001);
        const maxDy = Math.max(...dys.map(Math.abs), 0.0001);
        const maxOffset = Math.max(maxDx, maxDy);

        parsed = parsed.map((h: any) => {
          const dx = h.lon - lon;
          const dy = h.lat - lat;

          const x = Math.min(85, Math.max(15, 50 + (dx / maxOffset) * 35));
          const y = Math.min(85, Math.max(15, 50 - (dy / maxOffset) * 35));

          return { ...h, x, y };
        });
      }

      setHospitalsList(parsed.slice(0, 8));
      setSelectedHospitalIndex(null);
    } catch (err) {
      console.error("Error fetching hospitals:", err);
      toast.error("Failed to load nearby hospitals.");
    } finally {
      setLoadingHospitals(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setLoadingHospitals(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lon: longitude, name: "Current Location" });
        setLocationSearch("");
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLoadingHospitals(false);
        toast.error("Unable to retrieve location. Please search manually.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleLocationSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationSearch.trim()) return;

    setLoadingHospitals(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearch)}&limit=1`,
      );
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();

      if (data && data.length > 0) {
        const firstResult = data[0];
        const lat = parseFloat(firstResult.lat);
        const lon = parseFloat(firstResult.lon);
        const displayName = firstResult.display_name.split(",")[0] || locationSearch;

        setUserLocation({ lat, lon, name: displayName });
      } else {
        toast.error("Location not found. Please try another query.");
      }
    } catch (err) {
      console.error("Search location error:", err);
      toast.error("Failed to search location.");
    } finally {
      setLoadingHospitals(false);
    }
  };

  useEffect(() => {
    const initDefaultLocation = async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ lat: latitude, lon: longitude, name: "Current Location" });
          },
          (error) => {
            console.warn("Default geolocation error, falling back to default:", error);
            const defaultLat = 23.0225;
            const defaultLon = 72.5714;
            setUserLocation({ lat: defaultLat, lon: defaultLon, name: "Ahmedabad, Gujarat" });
          },
          { enableHighAccuracy: false, timeout: 5000 }
        );
      } else {
        const defaultLat = 23.0225;
        const defaultLon = 72.5714;
        setUserLocation({ lat: defaultLat, lon: defaultLon, name: "Ahmedabad, Gujarat" });
      }
    };
    initDefaultLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchHospitals(userLocation.lat, userLocation.lon);
    }
  }, [userLocation, searchRadius]);

  useEffect(() => {
    const initReports = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const uid = session.user.id;
        setUserId(uid);

        const { data: dbReports } = await supabase
          .from("report_analyses")
          .select("*")
          .order("created_at", { ascending: false });

        if (dbReports) {
          setReports(
            dbReports.map((r: any) => ({
              id: r.id,
              name: r.file_name,
              time: new Date(r.created_at).getTime(),
              summary: r.summary,
              findings: r.findings,
              riskLevel: r.risk_level,
              recommendations: r.recommendations,
            })),
          );
        }
      } else {
        setReports(storage.get<ReportRecord[]>(KEYS.reports, []));
      }
    };
    initReports();
  }, []);

  useEffect(() => {
    if (!userId) {
      storage.set(KEYS.reports, reports);
    }
  }, [reports, userId]);

  const handleFile = (file: File) => {
    setAnalyzing(true);
    setTimeout(async () => {
      const tmpl = sampleReports[reports.length % sampleReports.length];
      const rec: ReportRecord = {
        id: crypto.randomUUID(),
        name: file.name,
        time: Date.now(),
        ...tmpl,
      };

      setReports((prev) => {
        const next = [rec, ...prev].slice(0, 15);
        return next;
      });

      if (userId) {
        try {
          await supabase.from("report_analyses").insert({
            id: rec.id,
            user_id: userId,
            file_name: rec.name,
            summary: rec.summary,
            findings: rec.findings,
            risk_level: rec.riskLevel,
            recommendations: rec.recommendations,
          });
        } catch (err) {
          console.error("Error saving report:", err);
        }
      }

      setAnalyzing(false);
    }, 1600);
  };

  const clearAll = async () => {
    setReports([]);
    if (userId) {
      try {
        await supabase.from("report_analyses").delete().eq("user_id", userId);
      } catch (err) {
        console.error("Error clearing reports:", err);
      }
    } else {
      storage.remove(KEYS.reports);
    }
  };

  const consolidated = useMemo(() => {
    if (reports.length < 2) return null;
    const abnormalCount = reports.reduce(
      (n, r) => n + r.findings.filter((f) => f.status === "abnormal").length,
      0,
    );
    const highRisk = reports.filter((r) => r.riskLevel === "High").length;
    const overall =
      highRisk > 0 ? "Needs attention" : abnormalCount > 2 ? "Watch closely" : "Stable";
    const concerns = Array.from(
      new Set(
        reports.flatMap((r) =>
          r.findings.filter((f) => f.status === "abnormal").map((f) => f.label),
        ),
      ),
    ).slice(0, 5);
    const trend =
      reports.length >= 2
        ? highRisk > 0
          ? "Worsening on metabolic markers"
          : "Generally improving"
        : "Insufficient data";
    return { overall, concerns, trend, abnormalCount, total: reports.length };
  }, [reports]);

  return (
    <PageShell>
      <div className="px-4 sm:px-6 pb-16">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mb-8">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl gradient-medical text-white flex items-center justify-center shadow-[var(--shadow-glow)]">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-medical-dark">
                  {t("report_title")}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t("report_subtitle")}
                </p>
              </div>
            </div>
          </Reveal>

          {/* upload */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
                }}
                className={`relative glass rounded-3xl p-8 transition-all ${dragOver ? "ring-4 ring-medical-light" : ""}`}
              >
                <div className="text-center py-8">
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="inline-flex h-20 w-20 rounded-3xl gradient-soft items-center justify-center mb-5"
                  >
                    <Upload className="h-9 w-9 text-medical-dark" />
                  </motion.div>
                  <h3 className="font-display text-lg font-bold text-medical-dark">
                    {t("drag_drop_report")}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("upload_report_desc")}
                  </p>
                  <button
                    onClick={() => inputRef.current?.click()}
                    className="ripple mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full gradient-medical text-white font-semibold shadow-[var(--shadow-glow)] hover:-translate-y-0.5 transition"
                  >
                    <FileCheck className="h-4 w-4" /> {t("choose_file")}
                  </button>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,.docx,image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </div>
                {analyzing && (
                  <div className="absolute inset-0 rounded-3xl bg-white/70 backdrop-blur flex items-center justify-center">
                    <div className="text-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="inline-flex h-12 w-12 rounded-full border-2 border-medical-light border-t-transparent"
                      />
                      <div className="mt-3 text-sm font-semibold text-medical-dark">
                        {t("analyzing_report")}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* report list */}
              <AnimatePresence>
                {reports.map((r) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="glass rounded-3xl p-6"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(r.time).toLocaleString()}
                        </div>
                        <h3 className="mt-1 font-display text-lg font-bold text-medical-dark">
                          {r.name}
                        </h3>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${riskColor[r.riskLevel]}`}
                      >
                        {t("risk_label")}: {r.riskLevel}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                      {r.summary}
                    </p>

                    <div className="mt-5">
                      <h4 className="text-xs font-bold tracking-widest text-medical-light uppercase mb-2.5">
                        {t("findings_title")}
                      </h4>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {r.findings.map((f) => (
                          <div
                            key={f.label}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-border"
                          >
                            <div>
                              <div className="text-xs text-muted-foreground">{f.label}</div>
                              <div className="text-sm font-semibold text-medical-dark">
                                {f.value}
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${statusBadge[f.status]}`}
                            >
                              {t("status_" + f.status)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5">
                      <h4 className="text-xs font-bold tracking-widest text-medical-light uppercase mb-2.5">
                        {t("recommendations_title")}
                      </h4>
                      <ul className="space-y-1.5">
                        {r.recommendations.map((rec) => (
                          <li key={rec} className="flex gap-2 text-sm text-muted-foreground">
                            <span className="mt-1.5 h-1 w-1 rounded-full bg-medical-dark shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-6 pt-4 border-t border-border flex justify-end">
                      <button
                        onClick={() => handleDiscussReport(r)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-medical-light hover:text-medical-dark transition cursor-pointer"
                      >
                        <Brain className="h-3.5 w-3.5" />
                        {t("discuss_ai_assistant")}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {reports.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-medical-dark/60 hover:text-medical-dark flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> {t("clear_all_reports")}
                </button>
              )}
            </div>

            {/* sidebar: consolidated summary */}
            <div className="space-y-6">
              <AnimatePresence>
                {consolidated && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-3xl p-6 gradient-medical text-white shadow-[var(--shadow-elegant)] sticky top-28"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Brain className="h-4 w-4" />
                      <div className="text-xs font-bold tracking-widest uppercase">
                        {t("ai_conclusive_report")}
                      </div>
                    </div>
                    <h3 className="font-display text-xl font-bold">{t("patient_health_summary")}</h3>
                    <p className="mt-2 text-sm text-white/85">
                      {t("based_on_reports_prefix")} <strong>{consolidated.total}</strong> {t("based_on_reports_suffix")}
                    </p>

                    <div className="mt-5 space-y-4">
                      <Block icon={Activity} title={t("overall_status")}>
                        {consolidated.overall}
                      </Block>
                      <Block icon={TrendingUp} title={t("health_trend")}>
                        {consolidated.trend}
                      </Block>
                      <Block icon={AlertTriangle} title={t("major_concerns")}>
                        <div className="flex flex-wrap gap-1.5">
                          {consolidated.concerns.length === 0
                            ? "None"
                            : consolidated.concerns.map((c) => (
                                <span
                                  key={c}
                                  className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 backdrop-blur"
                                >
                                  {c}
                                </span>
                              ))}
                        </div>
                      </Block>
                      <Block icon={Sparkles} title={t("suggested_next_step")}>
                        {consolidated.overall === "Needs attention"
                          ? t("next_step_desc_specialist")
                          : t("next_step_desc_physician")}
                      </Block>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* AI PATIENT SUMMARY card (doctor-ready) */}
          {reports.length > 0 && (
            <Reveal className="mt-10">
              <div className="glass rounded-3xl p-7 border-2 border-medical-light/40">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-medical-light" />
                  <div className="text-xs font-bold tracking-widest text-medical-light uppercase">
                    {t("ai_patient_summary")}
                  </div>
                </div>
                <h3 className="font-display text-xl font-bold text-medical-dark">
                  {t("doctor_ready_briefing")}
                </h3>
                <div className="mt-5 grid md:grid-cols-3 gap-4 text-sm">
                  <div className="p-4 rounded-2xl bg-white border border-border">
                    <div className="text-xs font-bold text-medical-light uppercase tracking-wider mb-2">
                      {t("symptoms_reported")}
                    </div>
                    <p className="text-muted-foreground">
                      {t("symptoms_reported_desc")}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-border">
                    <div className="text-xs font-bold text-medical-light uppercase tracking-wider mb-2">
                      {t("report_findings")}
                    </div>
                    <p className="text-muted-foreground">
                      {reports
                        .flatMap((r) =>
                          r.findings.filter((f) => f.status === "abnormal").map((f) => f.label),
                        )
                        .slice(0, 4)
                        .join(", ") || t("all_values_normal")}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-border">
                    <div className="text-xs font-bold text-medical-light uppercase tracking-wider mb-2">
                      {t("risk_assessment")}
                    </div>
                    <p className="text-muted-foreground">
                      {reports.find((r) => r.riskLevel === "High")
                        ? t("risk_high_desc")
                        : reports.find((r) => r.riskLevel === "Moderate")
                          ? t("risk_moderate_desc")
                          : t("risk_low_desc")}
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          )}

          {/* HOSPITALS / MAP */}
          <section className="mt-14">
            <Reveal>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-medical-light" />
                  <h2 className="font-display text-2xl font-bold text-medical-dark">
                    {t("nearby_hospitals_section")}
                  </h2>
                </div>

                {/* Search & controls */}
                <form onSubmit={handleLocationSearch} className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t("search_location")}
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-full border border-border bg-card outline-none focus:border-medical-light w-44 transition-all"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  </div>

                  <select
                    value={searchRadius}
                    onChange={(e) => setSearchRadius(Number(e.target.value))}
                    className="px-3 py-1.5 text-xs rounded-full border border-border bg-card outline-none focus:border-medical-light transition-all"
                  >
                    <option value={2000}>2 {t("km")} {t("radius")}</option>
                    <option value={5000}>5 {t("km")} {t("radius")}</option>
                    <option value={10000}>10 {t("km")} {t("radius")}</option>
                    <option value={20000}>20 {t("km")} {t("radius")}</option>
                  </select>

                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full gradient-medical text-white shadow-sm hover:opacity-95 transition cursor-pointer"
                  >
                    <Navigation className="h-3 w-3" /> {t("use_current_loc")}
                  </button>
                </form>
              </div>
            </Reveal>

            {userLocation && (
              <div className="text-xs text-muted-foreground mb-4">
                {t("showing_results_near")}{" "}
                <span className="font-semibold text-medical-dark">{userLocation.name}</span> (
                {userLocation.lat.toFixed(4)}, {userLocation.lon.toFixed(4)})
              </div>
            )}

            <div className="grid lg:grid-cols-5 gap-6">
              <Reveal className="lg:col-span-3">
                <div className="relative aspect-[16/10] rounded-3xl overflow-hidden glass border border-border bg-card">
                  <HospitalMap
                    userLocation={userLocation}
                    hospitals={hospitalsList}
                    loading={loadingHospitals}
                    selectedHospitalIndex={selectedHospitalIndex}
                    onSelectHospital={setSelectedHospitalIndex}
                  />
                </div>
              </Reveal>

              <div className="lg:col-span-2 space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {loadingHospitals ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="glass rounded-2xl p-4 animate-pulse h-[80px] bg-muted/20"
                    />
                  ))
                ) : hospitalsList.length > 0 ? (
                  hospitalsList.map((h, i) => (
                    <Reveal key={h.name + i} delay={i * 0.04}>
                      <div
                        onClick={() => setSelectedHospitalIndex(i)}
                        className={`glass rounded-2xl p-4 cursor-pointer transition-all duration-300 ${
                          selectedHospitalIndex === i
                            ? "ring-2 ring-medical-light border-medical-light/40 bg-medical-tint/40 shadow-sm"
                            : "hover-lift hover:bg-card/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-medical-dark text-sm">{h.name}</h4>
                            <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                              <Navigation className="h-3 w-3" /> {h.distance} {t("away")}
                            </div>
                            {h.website && (
                              <div className="flex flex-wrap gap-2 mt-1.5">
                                <a
                                  href={h.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs text-medical-light font-semibold flex items-center gap-1 hover:underline"
                                >
                                  🌐 Website
                                </a>
                              </div>
                            )}
                          </div>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lon}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="h-9 w-9 rounded-full gradient-medical text-white flex items-center justify-center shrink-0 hover:scale-110 transition"
                            aria-label="Directions"
                          >
                            <Navigation className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    </Reveal>
                  ))
                ) : (
                  <div className="text-center p-8 glass rounded-2xl text-muted-foreground text-sm">
                    {t("no_hospitals_found")}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}

function Block({ icon: Icon, title, children }: any) {
  return (
    <div className="p-3 rounded-2xl bg-white/15 backdrop-blur">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1">
        <Icon className="h-3 w-3" /> {title}
      </div>
      <div className="text-sm font-semibold">{children}</div>
    </div>
  );
}
