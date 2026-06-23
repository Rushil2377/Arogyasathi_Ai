import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, ImageIcon, ScanLine, AlertCircle, Check, Trash2, Clock, ShieldCheck } from "lucide-react";
import PageShell from "@/components/PageShell";
import Reveal from "@/components/Reveal";
import { storage, KEYS } from "@/lib/storage";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/disease-detection")({
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
};

const mockResults = [
  { disease: "Eczema (Atopic Dermatitis)", confidence: 92, symptoms: ["Itchy, dry skin", "Red or brown patches", "Small bumps that leak fluid", "Thickened skin"], precautions: ["Moisturize twice daily", "Avoid hot showers", "Use fragrance-free soap", "See a dermatologist if it spreads"] },
  { disease: "Conjunctivitis (Pink Eye)", confidence: 89, symptoms: ["Redness in the white of the eye", "Watery discharge", "Itchy or burning eyes", "Crusty eyelids"], precautions: ["Wash hands frequently", "Avoid touching/rubbing eyes", "Don't share towels", "Consult a doctor in 24h"] },
  { disease: "Acne Vulgaris", confidence: 95, symptoms: ["Whiteheads, blackheads", "Pimples", "Pustules on face, chest, back", "Mild scarring"], precautions: ["Gentle cleansing twice daily", "Avoid picking lesions", "Use non-comedogenic products", "Dermatology consult if severe"] },
  { disease: "Tinea (Ringworm)", confidence: 87, symptoms: ["Ring-shaped rash", "Itchy, scaly skin", "Red, raised border", "Hair loss in affected area"], precautions: ["Keep skin dry and clean", "Antifungal cream 2 weeks", "Wash clothes in hot water", "Avoid sharing personal items"] },
];

function Detection() {
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<Detection | null>(null);
  const [history, setHistory] = useState<Detection[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initHistory = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const uid = session.user.id;
        setUserId(uid);

        const { data: dbDets } = await supabase
          .from("disease_detections")
          .select("*")
          .order("created_at", { ascending: false });

        if (dbDets) {
          setHistory(
            dbDets.map((d: any) => ({
              id: d.id,
              image: d.image_data,
              disease: d.predicted_condition,
              confidence: Number(d.accuracy_rate),
              symptoms: d.symptoms,
              precautions: d.recommendations,
              time: new Date(d.created_at).getTime(),
            }))
          );
        }
      } else {
        setHistory(storage.get<Detection[]>(KEYS.detections, []));
      }
    };
    initHistory();
  }, []);

  useEffect(() => {
    if (!userId) {
      storage.set(KEYS.detections, history);
    }
  }, [history, userId]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      setResult(null);
      setAnalyzing(true);
      setTimeout(async () => {
        const pick = mockResults[Math.floor(Math.random() * mockResults.length)];
        const det: Detection = { id: crypto.randomUUID(), image: dataUrl, time: Date.now(), ...pick };
        setResult(det);
        
        setHistory((prev) => {
          const next = [det, ...prev].slice(0, 20);
          return next;
        });

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
        
        setAnalyzing(false);
      }, 1800);
    };
    reader.readAsDataURL(file);
  }, [userId]);

  const clearHistory = async () => {
    setHistory([]);
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
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl gradient-medical text-white flex items-center justify-center shadow-[var(--shadow-glow)]">
                <ScanLine className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-medical-dark">Disease Detection</h1>
                <p className="text-sm text-muted-foreground">Upload an image of skin, eye, or visible symptom for an AI-powered prediction.</p>
              </div>
            </div>
          </Reveal>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* upload */}
            <div className="lg:col-span-3 space-y-5">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                className={`relative glass rounded-3xl p-8 transition-all ${dragOver ? "ring-4 ring-medical-light scale-[1.01]" : ""}`}
              >
                {!preview ? (
                  <div className="text-center py-10">
                    <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }} className="inline-flex h-20 w-20 rounded-3xl gradient-soft items-center justify-center mb-5">
                      <Upload className="h-9 w-9 text-medical-dark" />
                    </motion.div>
                    <h3 className="font-display text-lg font-bold text-medical-dark">Drag & drop an image</h3>
                    <p className="mt-1 text-sm text-muted-foreground">JPG, PNG, JPEG up to 10MB</p>
                    <button onClick={() => inputRef.current?.click()} className="ripple mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full gradient-medical text-white font-semibold shadow-[var(--shadow-glow)] hover:-translate-y-0.5 transition">
                      <ImageIcon className="h-4 w-4" /> Choose image
                    </button>
                    <input ref={inputRef} type="file" accept="image/jpeg,image/jpg,image/png" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                  </div>
                ) : (
                  <div>
                    <div className="relative rounded-2xl overflow-hidden bg-medical-tint aspect-video">
                      <img src={preview} alt="upload" className="w-full h-full object-contain" />
                      {analyzing && (
                        <div className="absolute inset-0 bg-medical-dark/30 backdrop-blur-sm flex items-center justify-center">
                          <motion.div animate={{ y: [0, "100%", 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute inset-x-0 h-1 gradient-medical shadow-[0_0_20px_var(--medical-light)]" />
                          <div className="relative text-white text-center">
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="inline-flex h-12 w-12 rounded-full border-2 border-white border-t-transparent" />
                            <div className="mt-3 text-sm font-semibold">Analyzing image…</div>
                          </div>
                        </div>
                      )}
                    </div>
                    <button onClick={() => { setPreview(null); setResult(null); }} className="mt-3 text-xs text-medical-dark/70 hover:text-medical-dark">Upload another image</button>
                  </div>
                )}
              </div>

              {/* result */}
              <AnimatePresence>
                {result && !analyzing && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-7">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="text-xs font-bold tracking-widest text-medical-light uppercase">Predicted disease</div>
                        <h3 className="mt-1 font-display text-2xl font-bold text-medical-dark">{result.disease}</h3>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Confidence</div>
                        <div className="font-display text-2xl font-bold text-gradient">{result.confidence}%</div>
                      </div>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-medical-tint overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${result.confidence}%` }} transition={{ duration: 1.2, ease: "easeOut" }} className="h-full gradient-medical" />
                    </div>

                    <div className="mt-6 grid sm:grid-cols-2 gap-5">
                      <div>
                        <h4 className="flex items-center gap-2 font-semibold text-medical-dark text-sm mb-3"><AlertCircle className="h-4 w-4 text-medical-light" /> Symptoms</h4>
                        <ul className="space-y-2">
                          {result.symptoms.map((s) => <li key={s} className="flex gap-2 text-sm text-muted-foreground"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-medical-dark shrink-0" />{s}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h4 className="flex items-center gap-2 font-semibold text-medical-dark text-sm mb-3"><ShieldCheck className="h-4 w-4 text-medical-light" /> Recommended precautions</h4>
                        <ul className="space-y-2">
                          {result.precautions.map((s) => <li key={s} className="flex gap-2 text-sm text-muted-foreground"><Check className="mt-0.5 h-3.5 w-3.5 text-medical-light shrink-0" />{s}</li>)}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-6 p-4 rounded-2xl bg-medical-tint text-xs text-medical-dark/80 leading-relaxed">
                      <strong>Disclaimer:</strong> This is an AI-assisted prediction, not a medical diagnosis. Always consult a qualified doctor before any treatment.
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* history */}
            <div className="lg:col-span-2">
              <div className="glass rounded-3xl p-6 sticky top-28">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-bold text-medical-dark flex items-center gap-2"><Clock className="h-4 w-4 text-medical-light" /> Detection history</h3>
                  {history.length > 0 && <button onClick={clearHistory} className="text-xs text-medical-dark/60 hover:text-medical-dark flex items-center gap-1"><Trash2 className="h-3 w-3" />Clear</button>}
                </div>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No past detections yet.</p>
                ) : (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {history.map((h) => (
                      <motion.div key={h.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3 p-3 rounded-2xl bg-white border border-border hover:border-medical-light transition">
                        <img src={h.image} alt="" className="h-14 w-14 rounded-xl object-cover shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-medical-dark truncate">{h.disease}</div>
                          <div className="text-xs text-muted-foreground">{new Date(h.time).toLocaleString()}</div>
                          <div className="mt-1.5 inline-block text-[10px] px-2 py-0.5 rounded-full gradient-medical text-white font-bold">{h.confidence}% conf.</div>
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
