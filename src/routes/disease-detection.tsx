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
} from "lucide-react";
import PageShell from "@/components/PageShell";
import Reveal from "@/components/Reveal";
import { storage, KEYS } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { predictSkinDisease, checkBackendHealth } from "@/lib/skinDetection";
import { explainSkinDisease, validateSkinImage, refineSkinPrediction } from "@/lib/gemini";

export const Route = createFileRoute("/disease-detection")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "Skin Screening • ArogyaSathi AI" }] }),
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
  scanType: "skin";
};

const langs = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "gu", label: "ગુજરાતી" },
];

const STATIC_GUIDELINES: Record<string, { symptoms: string[]; precautions: string[] }> = {
  "Normal": {
    symptoms: ["Healthy skin structure with even tone", "No visible inflammation, lesions, or scaling", "Normal skin hydration and barrier function"],
    precautions: ["Maintain a daily gentle skincare routine", "Apply broad-spectrum sunscreen daily (SPF 30+)", "Stay hydrated and eat a balanced diet", "Perform monthly self-exams to check for new spots or changes"]
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
  },
  "Inconclusive Result": {
    symptoms: ["The screening could not confidently identify a specific skin condition.", "This can happen due to poor lighting, blurriness, or low contrast in the photo.", "The lesion structure does not match standard patterns in our dataset."],
    precautions: ["Re-take the photograph in well-lit, direct light and ensure it is fully in focus.", "Do not zoom in too closely or stand too far; ensure the lesion is centered.", "IMPORTANT: Since the screening is inconclusive, consult a dermatologist if symptoms persist or worsen."]
  }
};

function GetSeverityBadge(disease: string) {
  const highRisk = ["Melanoma", "Basal Cell Carcinoma"];
  const moderateRisk = ["Eczema", "Psoriasis", "Fungal Infections", "Dermatitis"];

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
  } else if (disease === "Inconclusive Result") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-600 border border-slate-500/20">
        <AlertCircle className="h-3.5 w-3.5" /> Inconclusive
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

function FormatExplanation({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-4 text-base sm:text-lg text-medical-dark/95 leading-relaxed text-left">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Header 3 (### Heading)
        if (trimmed.startsWith('###')) {
          return (
            <h4 key={idx} className="font-display font-bold text-lg sm:text-xl text-medical-dark mt-6 mb-2 border-b border-medical-light/10 pb-1 flex items-center gap-2">
              {trimmed.replace(/^###\s*/, '')}
            </h4>
          );
        }

        // Header 2 (## Heading)
        if (trimmed.startsWith('##')) {
          return (
            <h3 key={idx} className="font-display font-bold text-xl sm:text-2xl text-medical-dark mt-8 mb-3 flex items-center gap-2">
              {trimmed.replace(/^##\s*/, '')}
            </h3>
          );
        }

        // Header 1 (# Heading)
        if (trimmed.startsWith('#')) {
          return (
            <h2 key={idx} className="font-display font-bold text-2xl sm:text-3xl text-medical-dark mt-10 mb-4">
              {trimmed.replace(/^#\s*/, '')}
            </h2>
          );
        }

        // Bold list item or bullet (* **Bold**: text)
        if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
          const content = trimmed.replace(/^[\*\-]\s*/, '');
          // Check for bold prefix: **Text**: or **Text**
          const boldMatch = content.match(/^\*\*(.*?)\*\*:(.*)$/);
          if (boldMatch) {
            return (
              <div key={idx} className="flex gap-2.5 pl-4 py-0.5 items-start">
                <span className="h-1.5 w-1.5 rounded-full bg-medical-light shrink-0 mt-2" />
                <span className="text-base sm:text-lg">
                  <strong className="text-medical-dark font-bold">{boldMatch[1]}:</strong>
                  {boldMatch[2]}
                </span>
              </div>
            );
          }
          return (
            <div key={idx} className="flex gap-2.5 pl-4 py-0.5 items-start">
              <span className="h-1.5 w-1.5 rounded-full bg-medical-light shrink-0 mt-2" />
              <span className="text-base sm:text-lg">{content.replace(/\*\*/g, '')}</span>
            </div>
          );
        }

        // Numbered list item (e.g. 1. text)
        const numMatch = trimmed.match(/^(\d+)\.\s*(.*)$/);
        if (numMatch) {
          const content = numMatch[2];
          const boldMatch = content.match(/^\*\*(.*?)\*\*:(.*)$/);
          return (
            <div key={idx} className="flex gap-2.5 pl-4 py-0.5 items-start">
              <span className="font-bold text-medical-light shrink-0 w-5 text-right">{numMatch[1]}.</span>
              <span className="text-base sm:text-lg">
                {boldMatch ? (
                  <>
                    <strong className="text-medical-dark font-bold">{boldMatch[1]}:</strong>
                    {boldMatch[2]}
                  </>
                ) : (
                  content.replace(/\*\*/g, '')
                )}
              </span>
            </div>
          );
        }

        // Empty line
        if (!trimmed) {
          return <div key={idx} className="h-2" />;
        }

        // Normal paragraph
        // Clean up double asterisks in normal text
        const cleanedText = trimmed.replace(/\*\*(.*?)\*\*/g, '$1');
        return (
          <p key={idx} className="text-base sm:text-lg text-muted-foreground">
            {cleanedText}
          </p>
        );
      })}
    </div>
  );
}

function Detection() {
  const scanType = "skin";
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [result, setResult] = useState<Detection | null>(null);
  const [history, setHistory] = useState<Detection[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [lang, setLang] = useState("en");
  const [backendDown, setBackendDown] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
          const cachedDetails = storage.get<Record<string, { explanation?: string; allProbabilities?: Record<string, number>; scanType?: "skin" }>>("disease_detection_cached_details", {});

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
                scanType: "skin",
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
          const res = result.disease === "Inconclusive Result"
            ? {
              text: lang === "hi"
                ? "यह स्क्रीनिंग किसी विशेष त्वचा रोग की पहचान नहीं कर पाती है।\n\n### संभावित कारण\n1. खराब रोशनी या कैमरे का धुंधलापन।\n2. त्वचा के पैच पर कम कंट्रास्ट होना।\n\n### अगले कदम\n* कृपया एक अच्छी रोशनी वाली जगह पर त्वचा की स्पष्ट और केंद्रित तस्वीर फिर से लें।\n* यदि लक्षण बने रहते हैं या बिगड़ते हैं, तो कृपया व्यक्तिगत रूप से त्वचा विशेषज्ञ (डर्मेटोलॉजिस्ट) से संपर्क करें।"
                : lang === "gu"
                  ? "આ સ્ક્રિનિંગ કોઈ ચોક્કસ ત્વચા રોગની ઓળખ કરી શક્યું નથી.\n\n### સંભવિત કારણો\n1. નબળી રોશની અથવા કેમેરાની અસ્પષ્ટતા.\n2. ત્વચા પર ઓછું વિરોધાભાસ હોવું.\n\n### આગલા પગલાં\n* કૃપા કરીને સારી રોશનીવાળી જગ્યાએ ત્વચાની સ્પષ્ટ અને કેન્દ્રિત છબી ફરીથી લો.\n* જો લક્ષણો ચાલુ રહે અથવા વધુ બગડે, તો કૃપા કરીને વ્યક્તિગત રીતે ત્વચા નિષ્ણાત (ડર્મેટોલોજિસ્ટ) ની મુલાકાત લો."
                  : "The AI screening was unable to identify a specific skin condition with high confidence.\n\n### Potential Causes\n1. **Poor Lighting or Focus**: The photograph may be slightly blurry, out of focus, or taken in low light.\n2. **Low Contrast**: The lesion might not stand out clearly from the surrounding skin.\n3. **Atypical Presentation**: The symptom pattern may not match the diagnostic features in our dataset.\n\n### Recommended Actions\n* **Re-take the photograph** in bright, indirect natural light and ensure it is fully in focus.\n* **Avoid background clutter** or shadows.\n* **Consult a doctor**: If the skin patch continues to itch, hurt, or evolve, schedule an appointment with a certified dermatologist."
            }
            : await explainSkinDisease(result.disease, result.confidence, lang);
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
      setErrorMsg(null);

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

          // 0. Validate skin image
          const validationResult = await validateSkinImage(dataUrl);
          if (validationResult === "INVALID") {
            setAnalyzing(false);
            setPreview(null);
            setErrorMsg("The uploaded photograph does not appear to be a skin patch or lesion. Please upload a clear close-up photo of the affected skin area showing symptoms.");
            return;
          }

          // 1. Run prediction
          const pred = await predictSkinDisease(file);
          predictedDisease = pred.disease;
          confidenceScore = pred.confidence;
          probabilities = pred.allProbabilities;

          // Refine prediction using Gemini Vision if available
          try {
            const refined = await refineSkinPrediction(dataUrl, predictedDisease, probabilities);
            if (refined && refined !== predictedDisease) {
              console.log(`[ArogyaSathi] Refinement adjusted prediction from "${predictedDisease}" to "${refined}"`);
              predictedDisease = refined;

              if (probabilities[refined]) {
                confidenceScore = Math.round(probabilities[refined] * 100);
              } else {
                confidenceScore = 75; // strong default fallback
              }
            }
          } catch (refineErr) {
            console.warn("Prediction refinement failed:", refineErr);
          }

          // Apply Confidence Calibration & Rejection Rules from the approved plan:
          // 1. Reject predictions below 60% as Inconclusive
          if (confidenceScore < 60) {
            predictedDisease = "Inconclusive Result";
          }
          // 2. Cap confidence at 98% (never show 100%)
          confidenceScore = Math.min(confidenceScore, 98);

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
            scanType: "skin",
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
    [userId],
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
                    AI Skin Disease Screening
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Upload an image for automated dermatological classification and guidelines.
                  </p>
                </div>
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
                className={`relative glass rounded-3xl p-8 transition-all ${dragOver ? "ring-4 ring-medical-light scale-[1.01]" : ""
                  }`}
              >
                {/* Error Banner */}
                {errorMsg && (
                  <div className="mb-5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start justify-between gap-3 text-rose-700 text-xs sm:text-sm animate-pulse-glow animate-duration-1000">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
                      <div>
                        <strong className="font-semibold block mb-0.5 text-rose-800">Invalid Photo Uploaded</strong>
                        {errorMsg}
                      </div>
                    </div>
                    <button
                      onClick={() => setErrorMsg(null)}
                      className="text-rose-600 hover:text-rose-800 text-xs font-bold leading-none p-1 rounded-md hover:bg-rose-500/5 transition"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Backend status banner */}
                {backendDown && (
                  <div className="mb-5 p-4 rounded-2xl bg-medical-tint/70 border border-medical-light/20 flex items-start gap-3 text-medical-dark text-xs">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-medical-light mt-0.5 animate-pulse-glow" />
                    <div>
                      <strong className="font-semibold block mb-0.5 text-medical-dark">Local AI Simulator Active</strong>
                      The local FastAPI server is not running on port 8000. Skin disease screening is running in local simulation mode in your browser so you can test all features out-of-the-box.
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
                      Drag & drop skin patch image
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Upload a clear closeup photo of the skin lesion or patch (JPG, PNG up to 10MB)
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
                              Analyzing Dermatological Patch…
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
                        <p className={`mt-2.5 text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-xl border inline-flex items-center gap-1.5 ${result.disease === "Normal"
                          ? "text-emerald-600 bg-emerald-500/5 border-emerald-500/10"
                          : result.disease === "Inconclusive Result"
                            ? "text-slate-600 bg-slate-500/5 border-slate-500/10"
                            : "text-rose-600 bg-rose-500/5 border-rose-500/10"
                          }`}>
                          {result.disease === "Normal"
                            ? "✓ Based on the analysis, your skin has a high probability of being healthy."
                            : result.disease === "Inconclusive Result"
                              ? "⚠️ The screening is inconclusive. Please re-take the photo or consult a doctor."
                              : "⚠️ This condition has a high chance of being present based on the image analysis."}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">AI Assessment</div>
                        <div className="font-display text-lg font-bold text-gradient">
                          {result.disease === "Inconclusive Result" ? "Inconclusive" : "High Probability"}
                        </div>
                      </div>
                    </div>

                    {/* Dermatologist Warning Referral Card */}
                    {["Melanoma", "Basal Cell Carcinoma"].includes(result.disease) && (
                      <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs sm:text-sm space-y-2">
                        <strong className="font-bold flex items-center gap-1.5 text-rose-800 text-sm sm:text-base">
                          <AlertTriangle className="h-4 w-4 shrink-0" /> URGENT: Dermatologist Referral Recommended
                        </strong>
                        <p className="leading-relaxed">
                          This screening has flagged indicators matching high-risk lesions (like Melanoma or Basal Cell Carcinoma). We strongly recommend scheduling an in-person clinical evaluation with a certified dermatologist immediately for a formal biopsy and examination.
                        </p>
                      </div>
                    )}

                    {/* Likelihood Distributions (Vit output bars) */}
                    {result.allProbabilities && Object.keys(result.allProbabilities).length > 0 && (
                      <div className="bg-white/40 p-5 rounded-2xl border border-border shadow-sm">
                        <h4 className="flex items-center gap-2 font-semibold text-medical-dark text-sm mb-4">
                          <TrendingUp className="h-4 w-4 text-medical-light" /> Likelihood Distribution (Top Conditions)
                        </h4>
                        <div className="space-y-3.5">
                          {Object.entries(result.allProbabilities)
                            .sort(([, a], [, b]) => b - a)
                            .map(([label, probability]) => {
                              let chanceText = "Low Chance";
                              let chanceColor = "text-muted-foreground font-medium";
                              let barWidth = "15%";
                              let barColor = "bg-slate-300";

                              if (probability >= 0.6) {
                                chanceText = "High Chance of Presence";
                                chanceColor = "text-rose-600 font-bold";
                                barWidth = "90%";
                                barColor = "bg-rose-500";
                              } else if (probability >= 0.25) {
                                chanceText = "Moderate Chance";
                                chanceColor = "text-amber-600 font-semibold";
                                barWidth = "55%";
                                barColor = "bg-amber-500";
                              }

                              return (
                                <div key={label} className="space-y-1">
                                  <div className="flex justify-between text-xs text-medical-dark">
                                    <span className="font-semibold">{label}</span>
                                    <span className={chanceColor}>{chanceText}</span>
                                  </div>
                                  <div className="h-2 rounded-full bg-white border border-border overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: barWidth }}
                                      transition={{ duration: 1.2 }}
                                      className={`h-full ${barColor}`}
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
                          AI Clinical Report
                        </h4>

                        {/* Language Selector */}
                        <div className="flex gap-1 border border-border rounded-lg p-0.5 bg-white/60 text-[10px]">
                          {langs.map((l) => (
                            <button
                              key={l.code}
                              onClick={() => handleLangChange(l.code)}
                              className={`px-2 py-0.5 rounded-md font-medium transition ${lang === l.code
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
                        <div className="bg-white/60 p-6 sm:p-8 rounded-2xl border border-border shadow-sm">
                          <FormatExplanation text={result.explanation} />
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Failed to generate explanation. Choose language to retry.</p>
                      )}
                    </div>

                    {/* General Disclaimer */}
                    <div className="mt-6 p-4 rounded-2xl bg-medical-tint text-xs text-medical-dark/80 leading-relaxed border border-medical-light/10">
                      <strong>Disclaimer:</strong> This is an AI-assisted screening simulation tool, not a certified medical diagnosis. Always consult a qualified physician or specialist (dermatologist) before any clinical treatment.
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
                        className={`flex gap-3 p-3 rounded-2xl bg-white border cursor-pointer hover:border-medical-light hover:shadow-sm transition ${result?.id === h.id ? "border-medical-light ring-2 ring-medical-light/10" : "border-border"
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
                              🧴 Skin
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(h.time).toLocaleString()}
                          </div>
                          <div className={`mt-1.5 inline-block text-[10px] px-2 py-0.5 rounded-full font-bold text-white ${h.confidence >= 60 ? "bg-rose-500" : h.confidence >= 25 ? "bg-amber-500" : "bg-slate-400"
                            }`}>
                            {h.confidence >= 60 ? "High Chance" : h.confidence >= 25 ? "Mod. Chance" : "Low Chance"}
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
