import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Upload, FileCheck, AlertTriangle, TrendingUp, Stethoscope,
  MapPin, Phone, Star, Sparkles, Trash2, Brain, Activity, Navigation,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import Reveal from "@/components/Reveal";
import { storage, KEYS } from "@/lib/storage";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/report-analysis")({
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
    summary: "Complete Blood Count and lipid profile from a 42-year-old patient. Most values are within range; cholesterol is elevated and Vitamin D is deficient.",
    findings: [
      { label: "Hemoglobin", value: "13.8 g/dL", status: "normal" },
      { label: "Total Cholesterol", value: "238 mg/dL", status: "abnormal" },
      { label: "HDL", value: "38 mg/dL", status: "borderline" },
      { label: "Vitamin D", value: "16 ng/mL", status: "abnormal" },
      { label: "Fasting Glucose", value: "98 mg/dL", status: "normal" },
    ],
    riskLevel: "Moderate",
    recommendations: ["Adopt a low-fat, high-fiber diet", "Vitamin D3 60,000 IU weekly for 8 weeks", "30 minutes brisk walk daily", "Repeat lipid profile in 3 months"],
  },
  {
    summary: "Thyroid function test of a 28-year-old female. TSH is elevated, suggesting subclinical hypothyroidism.",
    findings: [
      { label: "TSH", value: "6.8 mIU/L", status: "abnormal" },
      { label: "T3", value: "1.2 ng/mL", status: "normal" },
      { label: "T4", value: "8.4 µg/dL", status: "normal" },
    ],
    riskLevel: "Low",
    recommendations: ["Repeat TSH after 6 weeks", "Iodine-rich diet (sea salt, dairy)", "Endocrinology consult if persistently elevated"],
  },
  {
    summary: "HbA1c and renal function for a known diabetic. Sugar control is poor and kidney markers show early strain.",
    findings: [
      { label: "HbA1c", value: "9.2 %", status: "abnormal" },
      { label: "Fasting Glucose", value: "186 mg/dL", status: "abnormal" },
      { label: "Creatinine", value: "1.4 mg/dL", status: "borderline" },
      { label: "Urea", value: "44 mg/dL", status: "normal" },
    ],
    riskLevel: "High",
    recommendations: ["Urgent diabetology consult — review medication", "Strict diet: low carb, no sugar", "Daily blood sugar monitoring", "Repeat creatinine in 4 weeks"],
  },
];


const hospitals = [
  { name: "Apollo Hospital", distance: "2.4 km", phone: "+91 79 6670 1800", x: 60, y: 35 },
  { name: "Civil Hospital Ahmedabad", distance: "3.8 km", phone: "+91 79 2268 0074", x: 30, y: 55 },
  { name: "Sterling Hospital", distance: "5.1 km", phone: "+91 79 4001 1111", x: 75, y: 70 },
  { name: "Shalby Multi-Specialty", distance: "6.2 km", phone: "+91 79 4020 3000", x: 45, y: 25 },
];

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
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initReports = async () => {
      const { data: { session } } = await supabase.auth.getSession();
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
            }))
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
      const rec: ReportRecord = { id: crypto.randomUUID(), name: file.name, time: Date.now(), ...tmpl };
      
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
    const abnormalCount = reports.reduce((n, r) => n + r.findings.filter(f => f.status === "abnormal").length, 0);
    const highRisk = reports.filter(r => r.riskLevel === "High").length;
    const overall = highRisk > 0 ? "Needs attention" : abnormalCount > 2 ? "Watch closely" : "Stable";
    const concerns = Array.from(new Set(reports.flatMap(r => r.findings.filter(f => f.status === "abnormal").map(f => f.label)))).slice(0, 5);
    const trend = reports.length >= 2 ? (highRisk > 0 ? "Worsening on metabolic markers" : "Generally improving") : "Insufficient data";
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
                <h1 className="font-display text-2xl font-bold text-medical-dark">Reports & Expert Consultation</h1>
                <p className="text-sm text-muted-foreground">Upload medical reports → AI summary → connect with the right specialist.</p>
              </div>
            </div>
          </Reveal>

          {/* upload */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                className={`relative glass rounded-3xl p-8 transition-all ${dragOver ? "ring-4 ring-medical-light" : ""}`}
              >
                <div className="text-center py-8">
                  <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }} className="inline-flex h-20 w-20 rounded-3xl gradient-soft items-center justify-center mb-5">
                    <Upload className="h-9 w-9 text-medical-dark" />
                  </motion.div>
                  <h3 className="font-display text-lg font-bold text-medical-dark">Upload a medical report</h3>
                  <p className="mt-1 text-sm text-muted-foreground">PDF, DOCX, JPG, PNG — analyzed locally on your device</p>
                  <button onClick={() => inputRef.current?.click()} className="ripple mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full gradient-medical text-white font-semibold shadow-[var(--shadow-glow)] hover:-translate-y-0.5 transition">
                    <FileCheck className="h-4 w-4" /> Choose file
                  </button>
                  <input ref={inputRef} type="file" accept=".pdf,.docx,image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                </div>
                {analyzing && (
                  <div className="absolute inset-0 rounded-3xl bg-white/70 backdrop-blur flex items-center justify-center">
                    <div className="text-center">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="inline-flex h-12 w-12 rounded-full border-2 border-medical-light border-t-transparent" />
                      <div className="mt-3 text-sm font-semibold text-medical-dark">Analyzing report with AI…</div>
                    </div>
                  </div>
                )}
              </div>

              {/* report list */}
              <AnimatePresence>
                {reports.map((r) => (
                  <motion.div key={r.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass rounded-3xl p-6">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="text-xs text-muted-foreground">{new Date(r.time).toLocaleString()}</div>
                        <h3 className="mt-1 font-display text-lg font-bold text-medical-dark">{r.name}</h3>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${riskColor[r.riskLevel]}`}>
                        Risk: {r.riskLevel}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{r.summary}</p>

                    <div className="mt-5">
                      <h4 className="text-xs font-bold tracking-widest text-medical-light uppercase mb-2.5">Findings</h4>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {r.findings.map((f) => (
                          <div key={f.label} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-border">
                            <div>
                              <div className="text-xs text-muted-foreground">{f.label}</div>
                              <div className="text-sm font-semibold text-medical-dark">{f.value}</div>
                            </div>
                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${statusBadge[f.status]}`}>{f.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5">
                      <h4 className="text-xs font-bold tracking-widest text-medical-light uppercase mb-2.5">Recommendations</h4>
                      <ul className="space-y-1.5">
                        {r.recommendations.map((rec) => (
                          <li key={rec} className="flex gap-2 text-sm text-muted-foreground"><span className="mt-1.5 h-1 w-1 rounded-full bg-medical-dark shrink-0" />{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {reports.length > 0 && (
                <button onClick={clearAll} className="text-xs text-medical-dark/60 hover:text-medical-dark flex items-center gap-1">
                  <Trash2 className="h-3 w-3" /> Clear all reports
                </button>
              )}
            </div>

            {/* sidebar: consolidated summary */}
            <div className="space-y-6">
              <AnimatePresence>
                {consolidated && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl p-6 gradient-medical text-white shadow-[var(--shadow-elegant)] sticky top-28">
                    <div className="flex items-center gap-2 mb-1">
                      <Brain className="h-4 w-4" />
                      <div className="text-xs font-bold tracking-widest uppercase">AI Conclusive Report</div>
                    </div>
                    <h3 className="font-display text-xl font-bold">Patient health summary</h3>
                    <p className="mt-2 text-sm text-white/85">Based on <strong>{consolidated.total} reports</strong> stored on this device.</p>

                    <div className="mt-5 space-y-4">
                      <Block icon={Activity} title="Overall status">{consolidated.overall}</Block>
                      <Block icon={TrendingUp} title="Health trend">{consolidated.trend}</Block>
                      <Block icon={AlertTriangle} title="Major concerns">
                        <div className="flex flex-wrap gap-1.5">
                          {consolidated.concerns.length === 0 ? "None" : consolidated.concerns.map(c => (
                            <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 backdrop-blur">{c}</span>
                          ))}
                        </div>
                      </Block>
                      <Block icon={Sparkles} title="Suggested next step">
                        Book a {consolidated.overall === "Needs attention" ? "specialist" : "general physician"} consult within 7 days.
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
                  <div className="text-xs font-bold tracking-widest text-medical-light uppercase">AI Patient Summary</div>
                </div>
                <h3 className="font-display text-xl font-bold text-medical-dark">Doctor-ready briefing</h3>
                <div className="mt-5 grid md:grid-cols-3 gap-4 text-sm">
                  <div className="p-4 rounded-2xl bg-white border border-border">
                    <div className="text-xs font-bold text-medical-light uppercase tracking-wider mb-2">Symptoms reported</div>
                    <p className="text-muted-foreground">Fatigue, occasional headaches, mild joint pain over past 2 weeks.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-border">
                    <div className="text-xs font-bold text-medical-light uppercase tracking-wider mb-2">Report findings</div>
                    <p className="text-muted-foreground">{reports.flatMap(r => r.findings.filter(f => f.status === "abnormal").map(f => f.label)).slice(0, 4).join(", ") || "All values within range."}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-border">
                    <div className="text-xs font-bold text-medical-light uppercase tracking-wider mb-2">Risk assessment</div>
                    <p className="text-muted-foreground">{reports.find(r => r.riskLevel === "High") ? "High — schedule urgent consult." : reports.find(r => r.riskLevel === "Moderate") ? "Moderate — review within a week." : "Low — routine follow-up."}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          )}

          

          {/* HOSPITALS / MAP */}
          <section className="mt-14">
            <Reveal>
              <div className="flex items-center gap-3 mb-6">
                <MapPin className="h-5 w-5 text-medical-light" />
                <h2 className="font-display text-2xl font-bold text-medical-dark">Nearby hospitals</h2>
              </div>
            </Reveal>
            <div className="grid lg:grid-cols-5 gap-6">
              <Reveal className="lg:col-span-3">
                <div className="relative aspect-[16/10] rounded-3xl overflow-hidden glass">
                  {/* Mock map */}
                  <div className="absolute inset-0 gradient-soft">
                    <svg className="absolute inset-0 w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-medical-dark" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                      <path d="M 0 200 Q 200 100 400 250 T 800 200" stroke="currentColor" strokeWidth="3" fill="none" className="text-medical-light opacity-60" />
                      <path d="M 100 0 Q 200 200 300 400" stroke="currentColor" strokeWidth="2" fill="none" className="text-medical-dark opacity-40" />
                    </svg>
                  </div>
                  {/* User pin */}
                  <div className="absolute" style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
                    <div className="relative">
                      <span className="absolute inset-0 rounded-full animate-pulse-glow" />
                      <div className="relative h-4 w-4 rounded-full gradient-medical border-2 border-white shadow-[var(--shadow-glow)]" />
                    </div>
                    <div className="absolute top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-medical-dark whitespace-nowrap bg-white px-2 py-0.5 rounded-full shadow">You</div>
                  </div>
                  {/* Hospital pins */}
                  {hospitals.map((h, i) => (
                    <motion.div
                      key={h.name}
                      initial={{ scale: 0, y: -10 }}
                      animate={{ scale: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.1, type: "spring", bounce: 0.5 }}
                      className="absolute group"
                      style={{ left: `${h.x}%`, top: `${h.y}%`, transform: "translate(-50%, -100%)" }}
                    >
                      <div className="h-8 w-8 rounded-full rounded-bl-none gradient-medical text-white flex items-center justify-center shadow-[var(--shadow-glow)] hover:scale-110 transition cursor-pointer">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition pointer-events-none">
                        <div className="bg-medical-dark text-white text-[10px] font-semibold px-2 py-1 rounded-md whitespace-nowrap">{h.name}</div>
                      </div>
                    </motion.div>
                  ))}
                  <div className="absolute bottom-3 right-3 text-[10px] text-medical-dark/60 glass px-2 py-1 rounded-full">Mock map — pluggable with Google Maps API</div>
                </div>
              </Reveal>
              <div className="lg:col-span-2 space-y-3">
                {hospitals.map((h, i) => (
                  <Reveal key={h.name} delay={i * 0.06}>
                    <div className="glass rounded-2xl p-4 hover-lift">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-medical-dark text-sm">{h.name}</h4>
                          <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1"><Navigation className="h-3 w-3" /> {h.distance} away</div>
                          <a href={`tel:${h.phone}`} className="mt-1 text-xs text-medical-light font-semibold flex items-center gap-1 hover:underline">
                            <Phone className="h-3 w-3" /> {h.phone}
                          </a>
                        </div>
                        <button className="h-9 w-9 rounded-full gradient-medical text-white flex items-center justify-center shrink-0 hover:scale-110 transition" aria-label="Directions">
                          <Navigation className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </Reveal>
                ))}
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
