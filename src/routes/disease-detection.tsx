import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  ImageIcon,
  ScanLine,
  AlertCircle,
  Check,
  Trash2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Eye,
  Activity,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import Reveal from "@/components/Reveal";
import { storage, KEYS } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { predictEyeDisease, checkBackendHealth } from "@/lib/retinasense";
import { predictSkinDisease } from "@/lib/skinDetection";
import { explainDisease, validateEyeImage, explainSkinDisease, validateSkinImage } from "@/lib/gemini";

export const Route = createFileRoute("/disease-detection")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "Disease Detection • ArogyaSathi AI" }] }),
  component: Detection,
});

type Detection = {
  id: string;
  image: string;
  disease: string;
  confidence: number;
  symptoms: string[];
  precautions: string[];
  time: number;
  explanation?: string;
  allProbabilities?: Record<string, number>;
  scanType: "eye" | "skin";
};

const langs = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "gu", label: "ગુજરાતી" },
];

const STATIC_GUIDELINES: Record<string, { symptoms: string[]; precautions: string[] }> = {
  // Eye Diseases
  "Normal": {
    symptoms: ["Clear central and peripheral vision", "No visual distortions", "Normal color perception"],
    precautions: ["Schedule annual eye exams", "Wear UV-blocking sunglasses", "Eat leafy greens and omega-3s", "Follow 20-20-20 rule for screen time"]
  },
  "Diabetic Retinopathy": {
    symptoms: ["Blurry or fluctuating vision", "Floaters (spots/strings)", "Dark or empty areas in vision", "Difficulty with color perception"],
    precautions: ["Maintain strict blood sugar control", "Monitor blood pressure and cholesterol", "Get annual dilated eye exams", "Avoid smoking and exercise regularly"]
  },
  "Glaucoma": {
    symptoms: ["Gradual loss of peripheral vision (tunnel vision)", "Severe eye pain (in acute cases)", "Blurred vision or seeing halos", "Nausea or vomiting accompanying eye pain"],
    precautions: ["Get regular eye pressure checks", "Use prescribed pressure-lowering drops consistently", "Wear protective eyewear", "Inform blood relatives (strong genetic link)"]
  },
  "Cataract": {
    symptoms: ["Cloudy, blurry, or dim vision", "Increasing difficulty with vision at night", "Sensitivity to light and glare", "Fading or yellowing of colors"],
    precautions: ["Protect eyes from UV light", "Quit smoking and limit alcohol", "Ensure corrective lens prescription is updated", "Discuss surgical options with ophthalmologist"]
  },
  "AMD": {
    symptoms: ["Gradual or sudden loss of central vision", "Visual distortions (straight lines wavy)", "Difficulty recognizing faces", "Dark/blurry spot in center of vision"],
    precautions: ["Take advised eye health supplements (AREDS2)", "Protect eyes from blue light and UV", "Eat diet rich in lutein and zeaxanthin", "Monitor vision daily using an Amsler grid"]
  },
  // Skin Diseases
  "Acne": {
    symptoms: ["Pimples or whiteheads", "Blackheads", "Red, tender bumps (papules)", "Pus-filled lumps (pustules)"],
    precautions: ["Wash face twice daily with mild cleanser", "Avoid touching or squeezing pimples", "Use non-comedogenic skincare products", "Stay hydrated and limit sugary foods"]
  },
  "Eczema": {
    symptoms: ["Dry, sensitive skin", "Intense itching", "Red to brownish-grey patches", "Small, raised bumps which may leak fluid"],
    precautions: ["Moisturize skin at least twice a day", "Avoid harsh soaps and hot showers", "Wear soft, breathable cotton clothes", "Identify and avoid environmental triggers"]
  },
  "Psoriasis": {
    symptoms: ["Red patches of skin covered with thick, silvery scales", "Dry, cracked skin that may bleed", "Itching, burning, or soreness", "Thickened or ridged nails"],
    precautions: ["Keep skin well-moisturized", "Avoid skin injuries or sunburns", "Limit alcohol and reduce stress levels", "Discuss topical steroids or light therapy with doctor"]
  },
  "Vitiligo": {
    symptoms: ["Patchy loss of skin color", "Premature whitening/greying of hair", "Loss of color in tissues inside mouth/nose"],
    precautions: ["Apply sunscreen with high SPF strictly", "Avoid skin trauma or tattooing", "Consult dermatologist for repigmentation options"]
  },
  "Warts": {
    symptoms: ["Small, fleshy, grainy bumps", "Flesh-colored, white, pink, or tan growths", "Bumps rough to the touch"],
    precautions: ["Do not pick or scratch warts", "Wash hands thoroughly after touching", "Keep feet dry and wear shoes in public pools/showers"]
  },
  "Melanoma": {
    symptoms: ["A large brownish spot with darker speckles", "A mole that changes in color, size, or feel", "A small lesion with an irregular border", "A painful lesion that itches or burns"],
    precautions: ["URGENT: Seek immediate evaluation by a dermatologist", "Perform monthly skin self-exams using ABCDE rule", "Avoid peak sun exposure and tanning beds", "Always wear protective clothing and sunscreen"]
  },
  "Basal Cell Carcinoma": {
    symptoms: ["A pearly or waxy bump", "A flat, flesh-colored or brown scar-like lesion", "A bleeding or scabbing sore that heals and returns"],
    precautions: ["IMPORTANT: Schedule a biopsy/excision with a doctor", "Avoid prolonged direct sunlight exposure", "Conduct regular skin inspections"]
  },
  "Fungal Infections": {
    symptoms: ["Itchy, scaly red patches on skin", "Ring-shaped rash (ringworm)", "Cracking, peeling, or scaling skin on feet (athlete's foot)"],
    precautions: ["Keep skin dry and clean", "Change socks and underwear daily", "Do not share towels, clothing, or footwear", "Apply topical over-the-counter antifungal creams"]
  },
  "Dermatitis": {
    symptoms: ["Red, swollen skin rash", "Dry, itchy, or burning skin", "Blisters that may ooze and crust"],
    precautions: ["Avoid contact with known allergens or irritants", "Wash skin immediately after exposure to triggers", "Apply cool, wet compresses to soothe skin"]
  },
  "Rosacea": {
    symptoms: ["Persistent facial redness", "Swollen red bumps resembling acne", "Visible small blood vessels on nose and cheeks", "Eye irritation or dryness"],
    precautions: ["Avoid trigger foods (spicy dishes, hot beverages)", "Use gentle, fragrance-free skincare products", "Protect your face from extreme heat, cold, or wind"]
  }
};

function GetSeverityBadge(disease: string) {
  const highRisk = ["Melanoma", "Basal Cell Carcinoma", "Glaucoma", "Cataract"];
  const moderateRisk = ["Eczema", "Psoriasis", "Fungal Infections", "Dermatitis", "Diabetic Retinopathy", "AMD"];

  if (highRisk.includes(disease)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
        <AlertTriangle className="h-3.5 w-3.5" /> High Risk - Consult Doctor
      </span>
    );
  } else if (moderateRisk.includes(disease)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
        <AlertCircle className="h-3.5 w-3.5" /> Moderate - Treatable
      </span>
    );
  } else {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
        <ShieldCheck className="h-3.5 w-3.5" /> Mild / Common
      </span>
    );
  }
}

function Detection() {
  const [scanType, setScanType] = useState<"eye" | "skin">("eye");
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [result, setResult] = useState<Detection | null>(null);
  const [history, setHistory] = useState<Detection[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [lang, setLang] = useState("en");
  const [backendDown, setBackendDown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check health of FastAPI backend on mount
  useEffect(() => {
    const verifyBackend = async () => {
      const isHealthy = await checkBackendHealth();
      setBackendDown(!isHealthy);
    };
    verifyBackend();
  }, []);

  // Initialize history from Supabase or LocalStorage
  useEffect(() => {
    const initHistory = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const uid = session.user.id;
        setUserId(uid);

        const { data: dbDets } = await supabase
          .from("disease_detections")
          .select("*")
          .order("created_at", { ascending: false });

        if (dbDets) {
          const cachedDetails = storage.get<Record<string, { explanation?: string; allProbabilities?: Record<string, number>; scanType?: "eye" | "skin" }>>("disease_detection_cached_details", {});

          setHistory(
            dbDets.map((d: any) => {
              const cache = cachedDetails[d.id] ?? {};
              return {
                id: d.id,
                image: d.image_data,
                disease: d.predicted_condition,
                confidence: Number(d.accuracy_rate),
                symptoms: d.symptoms || STATIC_GUIDELINES[d.predicted_condition]?.symptoms || [],
                precautions: d.recommendations || STATIC_GUIDELINES[d.predicted_condition]?.precautions || [],
                explanation: cache.explanation,
                allProbabilities: cache.allProbabilities,
                scanType: cache.scanType ?? (d.predicted_condition.includes("Retinopathy") || ["Normal", "Glaucoma", "Cataract", "AMD"].includes(d.predicted_condition) ? "eye" : "skin"),
                time: new Date(d.created_at).getTime(),
              };
            }),
          );
        }
      } else {
        setHistory(storage.get<Detection[]>(KEYS.detections, []));
      }
    };
    initHistory();
  }, []);

  // Sync guest history to LocalStorage
  useEffect(() => {
    if (!userId) {
      storage.set(KEYS.detections, history);
    }
  }, [history, userId]);

  // Effect to automatically generate Gemini explanation if it's missing
  useEffect(() => {
    if (result && !result.explanation && !analyzing && !explaining) {
      const generateReport = async () => {
        setExplaining(true);
        try {
          let res;
          if (result.scanType === "skin") {
            res = await explainSkinDisease(result.disease, result.confidence, lang);
          } else {
            res = await explainDisease(result.disease, result.confidence, lang);
          }
          const updatedResult = { ...result, explanation: res.text };
          setResult(updatedResult);

          // Update in history list
          setHistory((prev) =>
            prev.map((item) => (item.id === result.id ? updatedResult : item))
          );

          // Cache details locally
          const cachedDetails = storage.get<Record<string, any>>("disease_detection_cached_details", {});
          cachedDetails[result.id] = {
            explanation: res.text,
            allProbabilities: result.allProbabilities,
            scanType: result.scanType,
          };
          storage.set("disease_detection_cached_details", cachedDetails);
        } catch (err) {
          console.error("Error generating medical explanation:", err);
        } finally {
          setExplaining(false);
        }
      };
      generateReport();
    }
  }, [result?.id, result?.disease, lang, analyzing, explaining]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        setPreview(dataUrl);
        setResult(null);
        setAnalyzing(true);

        try {
          let predictedDisease = "";
          let confidenceScore = 0;
          let probabilities: Record<string, number> = {};

          if (scanType === "eye") {
            // 0. Validate eye image
            const validationResult = await validateEyeImage(dataUrl);
            if (validationResult === "INVALID") {
              setAnalyzing(false);
              setPreview(null);
              alert("Invalid Image: The uploaded photograph does not appear to be an eye. Please upload a valid eye fundus photograph for screening.");
              return;
            } else if (validationResult === "EXTERNAL_EYE") {
              setAnalyzing(false);
              setPreview(null);
              alert("External Eye Photo Detected: RetinaSense-ViT is trained exclusively on internal retinal fundus scans. Please upload a circular fundus scan.");
              return;
            }

            // 1. Run prediction
            const pred = await predictEyeDisease(file);
            predictedDisease = pred.disease;
            confidenceScore = pred.confidence;
            probabilities = pred.allProbabilities;
          } else {
            // 0. Validate skin image
            const validationResult = await validateSkinImage(dataUrl);
            if (validationResult === "INVALID") {
              setAnalyzing(false);
              setPreview(null);
              alert("Invalid Image: The uploaded photograph does not appear to be a skin patch. Please upload a valid skin image showing symptoms.");
              return;
            }

            // 1. Run prediction
            const pred = await predictSkinDisease(file);
            predictedDisease = pred.disease;
            confidenceScore = pred.confidence;
            probabilities = pred.allProbabilities;
          }

          const guidelines = STATIC_GUIDELINES[predictedDisease] || { symptoms: [], precautions: [] };

          const det: Detection = {
            id: crypto.randomUUID(),
            image: dataUrl,
            time: Date.now(),
            disease: predictedDisease,
            confidence: confidenceScore,
            symptoms: guidelines.symptoms,
            precautions: guidelines.precautions,
            allProbabilities: probabilities,
            scanType: scanType,
          };

          setResult(det);

          setHistory((prev) => {
            const next = [det, ...prev].slice(0, 20);
            return next;
          });

          // Cache details locally
          const cachedDetails = storage.get<Record<string, any>>("disease_detection_cached_details", {});
          cachedDetails[det.id] = {
            explanation: undefined,
            allProbabilities: det.allProbabilities,
            scanType: det.scanType,
          };
          storage.set("disease_detection_cached_details", cachedDetails);

          // Save to Supabase
          if (userId) {
            try {
              await supabase.from("disease_detections").insert({
                id: det.id,
                user_id: userId,
                symptoms: det.symptoms,
                predicted_condition: det.disease,
                accuracy_rate: det.confidence,
                recommendations: det.precautions,
                image_data: det.image,
              });
            } catch (err) {
              console.error("Error saving detection:", err);
            }
          }
        } catch (err) {
          console.error("Screening failed:", err);
          alert("Screening failed to process. Please check connection.");
        } finally {
          setAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    },
    [scanType, userId],
  );

  const handleLangChange = (newLang: string) => {
    setLang(newLang);
    setResult((prev) => (prev ? { ...prev, explanation: undefined } : null));
  };

  const clearHistory = async () => {
    setHistory([]);
    storage.remove("disease_detection_cached_details");
    if (userId) {
      try {
        await supabase.from("disease_detections").delete().eq("user_id", userId);
      } catch (err) {
        console.error("Error clearing detections:", err);
      }
    } else {
      storage.remove(KEYS.detections);
    }
  };

  return (
    <PageShell>
      <div className="px-4 sm:px-6 pb-16">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl gradient-medical text-white flex items-center justify-center shadow-[var(--shadow-glow)]">
                  <ScanLine className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold text-medical-dark">
                    AI Disease Screening
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Upload an image for automated diagnostic classification and guidelines.
                  </p>
                </div>
              </div>

              {/* Segmented Scan Type Selector */}
              <div className="flex bg-white/60 p-1.5 rounded-2xl border border-border backdrop-blur-md">
                <button
                  onClick={() => {
                    setScanType("eye");
                    setPreview(null);
                    setResult(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    scanType === "eye"
                      ? "gradient-medical text-white shadow-sm"
                      : "text-muted-foreground hover:text-medical-dark"
                  }`}
                >
                  <Eye className="h-4 w-4" /> Retinal Eye Scan
                </button>
                <button
                  onClick={() => {
                    setScanType("skin");
                    setPreview(null);
                    setResult(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    scanType === "skin"
                      ? "gradient-medical text-white shadow-sm"
                      : "text-muted-foreground hover:text-medical-dark"
                  }`}
                >
                  <Activity className="h-4 w-4" /> Skin Disease Scan
                </button>
              </div>
            </div>
          </Reveal>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* upload */}
            <div className="lg:col-span-3 space-y-5">
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
                className={`relative glass rounded-3xl p-8 transition-all ${
                  dragOver ? "ring-4 ring-medical-light scale-[1.01]" : ""
                }`}
              >
                {/* Backend status banner */}
                {backendDown && (
                  <div className="mb-5 p-4 rounded-2xl bg-medical-tint/70 border border-medical-light/20 flex items-start gap-3 text-medical-dark text-xs">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-medical-light mt-0.5 animate-pulse-glow" />
                    <div>
                      <strong className="font-semibold block mb-0.5 text-medical-dark">Local AI Simulator Active</strong>
                      The local FastAPI server is not running on port 8000. Eye/Skin disease screening is running in local simulation mode in your browser so you can test all features out-of-the-box.
                    </div>
                  </div>
                )}

                {!preview ? (
                  <div className="text-center py-10">
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="inline-flex h-20 w-20 rounded-3xl gradient-soft items-center justify-center mb-5"
                    >
                      <Upload className="h-9 w-9 text-medical-dark" />
                    </motion.div>
                    <h3 className="font-display text-lg font-bold text-medical-dark">
                      {scanType === "eye" ? "Drag & drop eye fundus image" : "Drag & drop skin patch image"}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {scanType === "eye"
                        ? "Upload a circular fundus scan photograph (JPG, PNG up to 10MB)"
                        : "Upload a clear closeup photo of the skin lesion or patch (JPG, PNG up to 10MB)"}
                    </p>
                    <button
                      onClick={() => inputRef.current?.click()}
                      className="ripple mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full gradient-medical text-white font-semibold shadow-[var(--shadow-glow)] hover:-translate-y-0.5 transition"
                    >
                      <ImageIcon className="h-4 w-4" /> Choose image
                    </button>
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                  </div>
                ) : (
                  <div>
                    <div className="relative rounded-2xl overflow-hidden bg-medical-tint aspect-video">
                      <img src={preview} alt="upload" className="w-full h-full object-contain" />
                      {analyzing && (
                        <div className="absolute inset-0 bg-medical-dark/30 backdrop-blur-sm flex items-center justify-center">
                          <motion.div
                            animate={{ y: [0, "100%", 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="absolute inset-x-0 h-1 gradient-medical shadow-[0_0_20px_var(--medical-light)]"
                          />
                          <div className="relative text-white text-center">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              className="inline-flex h-12 w-12 rounded-full border-2 border-white border-t-transparent"
                            />
                            <div className="mt-3 text-sm font-semibold">
                              {scanType === "eye" ? "Screening Retinal Image…" : "Analyzing Dermatological Patch…"}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setPreview(null);
                        setResult(null);
                      }}
                      className="mt-3 text-xs text-medical-dark/70 hover:text-medical-dark"
                    >
                      Upload another image
                    </button>
                  </div>
                )}
              </div>

              {/* result */}
              <AnimatePresence>
                {result && !analyzing && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-3xl p-7 space-y-6"
                  >
                    {/* Header Details */}
                    <div className="flex items-start justify-between gap-3 flex-wrap border-b border-border pb-4">
                      <div>
                        <div className="text-xs font-bold tracking-widest text-medical-light uppercase mb-1.5">
                          Screening result
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-display text-2xl font-bold text-medical-dark">
                            {result.disease}
                          </h3>
                          {GetSeverityBadge(result.disease)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Confidence</div>
                        <div className="font-display text-2xl font-bold text-gradient">
                          {result.confidence}%
                        </div>
                      </div>
                    </div>

                    {/* Confidence Visual Bar */}
                    <div>
                      <div className="mt-2 h-2 rounded-full bg-medical-tint overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${result.confidence}%` }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                          className="h-full gradient-medical"
                        />
                      </div>
                    </div>

                    {/* Probability Distributions (Vit output bars) */}
                    {result.allProbabilities && Object.keys(result.allProbabilities).length > 0 && (
                      <div className="bg-white/40 p-5 rounded-2xl border border-border">
                        <h4 className="flex items-center gap-2 font-semibold text-medical-dark text-sm mb-4">
                          <TrendingUp className="h-4 w-4 text-medical-light" /> Probability Distribution (Top Classes)
                        </h4>
                        <div className="space-y-3.5">
                          {Object.entries(result.allProbabilities)
                            .sort(([, a], [, b]) => b - a)
                            .map(([label, probability]) => {
                              const percentage = Math.round(probability * 100);
                              return (
                                <div key={label} className="space-y-1">
                                  <div className="flex justify-between text-xs font-medium text-medical-dark">
                                    <span>{label}</span>
                                    <span>{percentage}%</span>
                                  </div>
                                  <div className="h-1.5 rounded-full bg-white border border-border overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${percentage}%` }}
                                      transition={{ duration: 1.2 }}
                                      className="h-full bg-medical-light"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Guidelines and Symptoms */}
                    <div className="grid sm:grid-cols-2 gap-5 pt-2">
                      <div>
                        <h4 className="flex items-center gap-2 font-semibold text-medical-dark text-sm mb-3">
                          <AlertCircle className="h-4 w-4 text-medical-light" /> Symptoms
                        </h4>
                        <ul className="space-y-2">
                          {result.symptoms.map((s) => (
                            <li key={s} className="flex gap-2 text-sm text-muted-foreground">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-medical-dark shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="flex items-center gap-2 font-semibold text-medical-dark text-sm mb-3">
                          <ShieldCheck className="h-4 w-4 text-medical-light" /> Recommended precautions
                        </h4>
                        <ul className="space-y-2">
                          {result.precautions.map((s) => (
                            <li key={s} className="flex gap-2 text-sm text-muted-foreground">
                              <Check className="mt-0.5 h-3.5 w-3.5 text-medical-light shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Gemini Explanations */}
                    <div className="border-t border-border pt-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="flex items-center gap-2 font-semibold text-medical-dark text-sm">
                          <Sparkles className="h-4 w-4 text-medical-light animate-pulse-glow" /> Gemini Clinical Report
                        </h4>
                        
                        {/* Language Selector */}
                        <div className="flex gap-1 border border-border rounded-lg p-0.5 bg-white/60 text-[10px]">
                          {langs.map((l) => (
                            <button
                              key={l.code}
                              onClick={() => handleLangChange(l.code)}
                              className={`px-2 py-0.5 rounded-md font-medium transition ${
                                lang === l.code
                                  ? "bg-medical-dark text-white shadow-sm"
                                  : "text-muted-foreground hover:text-medical-dark"
                              }`}
                            >
                              {l.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {explaining ? (
                        <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2.5">
                          <div className="h-5 w-5 border-2 border-medical-light border-t-transparent rounded-full animate-spin" />
                          <span>Generating expert explanation in {langs.find((l) => l.code === lang)?.label}…</span>
                        </div>
                      ) : result.explanation ? (
                        <div className="prose prose-sm max-w-none text-xs text-muted-foreground leading-relaxed whitespace-pre-line bg-white/40 p-5 rounded-2xl border border-border">
                          {result.explanation}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Failed to generate explanation. Choose language to retry.</p>
                      )}
                    </div>

                    {/* General Disclaimer */}
                    <div className="mt-6 p-4 rounded-2xl bg-medical-tint text-xs text-medical-dark/80 leading-relaxed border border-medical-light/10">
                      <strong>Disclaimer:</strong> This is an AI-assisted screening simulation tool, not a certified medical diagnosis. Always consult a qualified physician or specialist (ophthalmologist/dermatologist) before any clinical treatment.
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* history */}
            <div className="lg:col-span-2">
              <div className="glass rounded-3xl p-6 sticky top-28">
                <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                  <h3 className="font-display font-bold text-medical-dark flex items-center gap-2">
                    <Clock className="h-4 w-4 text-medical-light" /> Screening history
                  </h3>
                  {history.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className="text-xs text-medical-dark/60 hover:text-medical-dark flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Clear
                    </button>
                  )}
                </div>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No past screenings yet.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {history.map((h) => (
                      <motion.div
                        key={h.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => setResult(h)}
                        className={`flex gap-3 p-3 rounded-2xl bg-white border cursor-pointer hover:border-medical-light hover:shadow-sm transition ${
                          result?.id === h.id ? "border-medical-light ring-2 ring-medical-light/10" : "border-border"
                        }`}
                      >
                        <img
                          src={h.image}
                          alt=""
                          className="h-14 w-14 rounded-xl object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-sm font-semibold text-medical-dark truncate">
                              {h.disease}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0 uppercase tracking-widest font-bold font-display">
                              {h.scanType === "eye" ? "👁️ Eye" : "🧴 Skin"}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(h.time).toLocaleString()}
                          </div>
                          <div className="mt-1.5 inline-block text-[10px] px-2 py-0.5 rounded-full gradient-medical text-white font-bold">
                            {h.confidence}% conf.
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
