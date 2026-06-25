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
  Globe,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import Reveal from "@/components/Reveal";
import { storage, KEYS } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { predictEyeDisease, checkBackendHealth } from "@/lib/retinasense";
import { explainDisease, validateEyeImage } from "@/lib/gemini";


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
  explanation?: string;
  allProbabilities?: Record<string, number>;
  time: number;
};

const langs = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "gu", label: "ગુજરાતી" },
];

const STATIC_GUIDELINES: Record<string, { symptoms: string[]; precautions: string[] }> = {
  "Normal": {
    symptoms: [
      "Clear central and peripheral vision",
      "No visual distortions",
      "Normal color perception"
    ],
    precautions: [
      "Schedule annual eye exams",
      "Wear UV-blocking sunglasses",
      "Eat a diet rich in leafy greens and omega-3s",
      "Follow the 20-20-20 rule for screen time"
    ]
  },
  "Diabetic Retinopathy": {
    symptoms: [
      "Blurry or fluctuating vision",
      "Floaters (spots or dark strings)",
      "Dark or empty areas in vision",
      "Difficulty with color perception"
    ],
    precautions: [
      "Maintain strict blood sugar control",
      "Monitor and manage blood pressure and cholesterol",
      "Get a comprehensive dilated eye exam at least once a year",
      "Avoid smoking and exercise regularly"
    ]
  },
  "Glaucoma": {
    symptoms: [
      "Gradual loss of peripheral vision (tunnel vision)",
      "Severe eye pain (in acute cases)",
      "Blurred vision or seeing halos around lights",
      "Nausea or vomiting accompanying eye pain"
    ],
    precautions: [
      "Get regular eye pressure checks",
      "Use prescribed pressure-lowering eye drops consistently",
      "Wear protective eyewear during sports or home improvement",
      "Inform relatives (glaucoma has a strong genetic link)"
    ]
  },
  "Cataract": {
    symptoms: [
      "Cloudy, blurry, or dim vision",
      "Increasing difficulty with vision at night",
      "Sensitivity to light and glare",
      "Fading or yellowing of colors"
    ],
    precautions: [
      "Protect eyes from UV light with sunglasses",
      "Quit smoking and limit alcohol consumption",
      "Ensure corrective lens prescription is up-to-date",
      "Discuss surgical options with an ophthalmologist when daily activities are affected"
    ]
  },
  "AMD": {
    symptoms: [
      "Gradual or sudden loss of central vision",
      "Visual distortions (e.g., straight lines appearing wavy)",
      "Difficulty recognizing faces",
      "A dark or blurry spot in the center of vision"
    ],
    precautions: [
      "Take eye health supplements (e.g., AREDS2 formulation if advised)",
      "Protect eyes from blue light and UV radiation",
      "Eat a diet rich in lutein and zeaxanthin (spinach, kale)",
      "Monitor vision daily using an Amsler grid"
    ]
  }
};

function Detection() {
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
          // Check local cache for explanations and probabilities to restore rich UI details
          const cachedDetails = storage.get<Record<string, { explanation?: string; allProbabilities?: Record<string, number> }>>("retinasense_cached_details", {});

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
          const res = await explainDisease(result.disease, result.confidence, lang);
          const updatedResult = { ...result, explanation: res.text };
          setResult(updatedResult);

          // Update in history list
          setHistory((prev) =>
            prev.map((item) => (item.id === result.id ? updatedResult : item))
          );

          // Cache extra details locally since Supabase schema might be strict
          const cachedDetails = storage.get<Record<string, any>>("retinasense_cached_details", {});
          cachedDetails[result.id] = {
            explanation: res.text,
            allProbabilities: result.allProbabilities,
          };
          storage.set("retinasense_cached_details", cachedDetails);
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

      // Create local preview URL
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        setPreview(dataUrl);
        setResult(null);
        setAnalyzing(true);

        try {
          // 0. Validate image using Gemini multimodal vision first
          const validationResult = await validateEyeImage(dataUrl);
          if (validationResult === "INVALID") {
            setAnalyzing(false);
            setPreview(null);
            alert("Invalid Image: The uploaded photograph does not appear to be an eye. Please upload a valid eye fundus photograph for screening.");
            return;
          } else if (validationResult === "EXTERNAL_EYE") {
            setAnalyzing(false);
            setPreview(null);
            alert("External Eye Photo Detected: RetinaSense-ViT is trained exclusively on internal retinal fundus scans (the circular orange/red scans showing blood vessels and the optic disc). External eye photos showing your iris, pupil, and eyelashes cannot be screened accurately. Please upload a valid retinal fundus scan.");
            return;
          }

          // 1. Run real RetinaSense-ViT classification via FastAPI
          const pred = await predictEyeDisease(file);
          
          // Get static guidelines matching the predicted class
          const guidelines = STATIC_GUIDELINES[pred.disease] || { symptoms: [], precautions: [] };

          const det: Detection = {
            id: crypto.randomUUID(),
            image: dataUrl,
            time: Date.now(),
            disease: pred.disease,
            confidence: pred.confidence,
            symptoms: guidelines.symptoms,
            precautions: guidelines.precautions,
            allProbabilities: pred.allProbabilities,
          };

          setResult(det);

          // Update sidebar list
          setHistory((prev) => {
            const next = [det, ...prev].slice(0, 20);
            return next;
          });

          // 2. Save to Supabase DB if logged in
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
              console.error("Error saving detection to Supabase:", err);
            }
          }
        } catch (err) {
          console.error("RetinaSense screening failed:", err);
          const errMsg = (err as Error).message ?? "";
          const isFetchError = errMsg.includes("Failed to fetch") || errMsg.includes("fetch") || err instanceof TypeError;
          if (isFetchError) {
            setBackendDown(true);
          } else {
            alert(`RetinaSense server returned an error: ${errMsg}`);
          }
        } finally {
          setAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    },
    [userId],
  );

  const handleLangChange = (newLang: string) => {
    setLang(newLang);
    // Clear current explanation to trigger re-generation in the new language
    setResult((prev) => (prev ? { ...prev, explanation: undefined } : null));
  };

  const clearHistory = async () => {
    setHistory([]);
    storage.remove("retinasense_cached_details");
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
          {/* Header */}
          <Reveal className="mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl gradient-medical text-white flex items-center justify-center shadow-[var(--shadow-glow)] animate-pulse">
                  <ScanLine className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold text-medical-dark">
                    Retinal Disease Screening
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Upload an eye fundus image for an AI-powered RetinaSense-ViT diagnosis prediction.
                  </p>
                </div>
              </div>

              {/* Language Switcher */}
              <div className="glass rounded-full p-1 flex items-center gap-0.5">
                <Globe className="h-3.5 w-3.5 ml-2 text-medical-light" />
                {langs.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => handleLangChange(l.code)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
                      lang === l.code
                        ? "gradient-medical text-white shadow-[var(--shadow-glow)]"
                        : "text-medical-dark hover:bg-medical-tint"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </Reveal>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* upload & result */}
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
                {/* Backend offline warning banner */}
                {backendDown && (
                  <div className="mb-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-amber-800 text-xs">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <strong className="font-semibold block mb-0.5">RetinaSense Server Offline</strong>
                      The FastAPI screening backend (port 8000) is not responding. Please make sure the backend server is running in your terminal.
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
                      Drag & drop retinal image
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm mx-auto">
                      Upload color fundus photograph (JPG, PNG, JPEG up to 10MB) for automated disease classification.
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
                            <div className="mt-3 text-sm font-semibold">Running RetinaSense-ViT screening…</div>
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setPreview(null);
                        setResult(null);
                      }}
                      className="mt-3 text-xs text-medical-dark/70 hover:text-medical-dark font-medium"
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
                    {/* Top Result Banner */}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="text-xs font-bold tracking-widest text-medical-light uppercase">
                          Classification Screening Result
                        </div>
                        <h3 className="mt-1 font-display text-2xl font-bold text-medical-dark">
                          {result.disease}
                        </h3>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Confidence</div>
                        <div className="font-display text-2xl font-bold text-gradient">
                          {result.confidence}%
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 rounded-full bg-medical-tint overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${result.confidence}%` }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="h-full gradient-medical"
                      />
                    </div>

                    {/* All probabilities chart */}
                    {result.allProbabilities && (
                      <div className="space-y-3 pt-2">
                        <h4 className="font-semibold text-medical-dark text-sm">
                          Model Probability Breakdown
                        </h4>
                        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                          {Object.entries(result.allProbabilities).map(([cls, prob]) => (
                            <div key={cls} className="space-y-1">
                              <div className="flex justify-between text-xs font-medium">
                                <span className="text-muted-foreground">{cls}</span>
                                <span className="text-medical-dark">{(prob * 100).toFixed(1)}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-medical-tint overflow-hidden">
                                <div
                                  className="h-full gradient-medical"
                                  style={{ width: `${prob * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Symptoms & Precautions cards */}
                    <div className="grid sm:grid-cols-2 gap-5 border-t border-border pt-6">
                      <div>
                        <h4 className="flex items-center gap-2 font-semibold text-medical-dark text-sm mb-3">
                          <AlertCircle className="h-4 w-4 text-medical-light" /> Visual Symptoms
                        </h4>
                        <ul className="space-y-2">
                          {result.symptoms.map((s) => (
                            <li key={s} className="flex gap-2 text-sm text-muted-foreground leading-normal">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-medical-dark shrink-0" />
                              {s}
                            </li>
                          ))}
                          {result.symptoms.length === 0 && (
                            <li className="text-sm text-muted-foreground italic">None listed.</li>
                          )}
                        </ul>
                      </div>
                      <div>
                        <h4 className="flex items-center gap-2 font-semibold text-medical-dark text-sm mb-3">
                          <ShieldCheck className="h-4 w-4 text-medical-light" /> Recommended Action
                        </h4>
                        <ul className="space-y-2">
                          {result.precautions.map((s) => (
                            <li key={s} className="flex gap-2 text-sm text-muted-foreground leading-normal">
                              <Check className="mt-0.5 h-4 w-4 text-medical-light shrink-0" />
                              {s}
                            </li>
                          ))}
                          {result.precautions.length === 0 && (
                            <li className="text-sm text-muted-foreground italic">None listed.</li>
                          )}
                        </ul>
                      </div>
                    </div>

                    {/* Gemini Explanation Report */}
                    <div className="border-t border-border pt-6 space-y-3">
                      <h4 className="flex items-center gap-2 font-semibold text-medical-dark text-sm">
                        <Sparkles className="h-4 w-4 text-medical-light animate-pulse" /> Detailed AI Explanation
                      </h4>
                      {explaining ? (
                        <div className="space-y-3 py-3">
                          <div className="h-4 bg-medical-tint rounded animate-pulse w-3/4" />
                          <div className="h-4 bg-medical-tint rounded animate-pulse w-5/6" />
                          <div className="h-4 bg-medical-tint rounded animate-pulse w-2/3" />
                        </div>
                      ) : result.explanation ? (
                        <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed bg-medical-tint/20 p-5 rounded-2xl border border-medical-tint/40">
                          {result.explanation}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground italic">
                          Generating explanation...
                        </div>
                      )}
                    </div>

                    {/* Clinical Disclaimer */}
                    <div className="p-4 rounded-2xl bg-medical-tint/50 text-xs text-medical-dark/80 leading-relaxed border border-medical-tint/30">
                      <strong>Disclaimer:</strong> This is a machine-learning screening aid, not a medical diagnosis. Always consult a qualified ophthalmologist or eyecare professional for a definitive evaluation and treatment planning.
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* history */}
            <div className="lg:col-span-2">
              <div className="glass rounded-3xl p-6 sticky top-28 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-medical-dark flex items-center gap-2">
                    <Clock className="h-4 w-4 text-medical-light" /> Screening history
                  </h3>
                  {history.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className="text-xs text-medical-dark/60 hover:text-medical-dark flex items-center gap-1 transition"
                    >
                      <Trash2 className="h-3 w-3" />
                      Clear all
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
                        onClick={() => {
                          setPreview(h.image);
                          setResult(h);
                        }}
                        className={`flex gap-3 p-3 rounded-2xl bg-white border cursor-pointer transition ${
                          result?.id === h.id
                            ? "border-medical-light ring-2 ring-medical-light/20 shadow-sm"
                            : "border-border hover:border-medical-light hover:shadow-xs"
                        }`}
                      >
                        <img
                          src={h.image}
                          alt=""
                          className="h-14 w-14 rounded-xl object-cover shrink-0 bg-muted"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-medical-dark truncate">
                            {h.disease}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(h.time).toLocaleString()}
                          </div>
                          <div className="mt-1.5 flex gap-1.5 flex-wrap">
                            <span className="inline-block text-[10px] px-2 py-0.5 rounded-full gradient-medical text-white font-bold">
                              {h.confidence}% conf.
                            </span>
                            {h.explanation && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-700 font-semibold">
                                <Sparkles className="h-2.5 w-2.5" /> AI report
                              </span>
                            )}
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
