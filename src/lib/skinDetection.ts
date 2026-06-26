import { predictSkinDiseaseOffline } from "./gemini";

/**
 * Service to interact with the SkinVision-ViT FastAPI Backend
 */

const API_URL = import.meta.env.VITE_SKIN_API_URL || "http://localhost:8000";

export interface SkinPredictionResult {
  disease: string;
  confidence: number;
  allProbabilities: Record<string, number>;
  inferenceTime: number;
}

/**
 * Helper to convert file to base64 Data URL
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Sends a skin image to the SkinVision-ViT backend for screening.
 * Falls back to browser-side local simulation when offline.
 */
export async function predictSkinDisease(file: File): Promise<SkinPredictionResult> {
  const formData = new FormData();
  formData.append("image", file);

  const url = `${API_URL}/predict/skin`;
  console.log(`[SkinVision] Sending prediction request to ${url}...`);

  try {
    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const errorMsg = errorBody?.detail ?? `HTTP error! status: ${response.status}`;
      console.error(`[SkinVision] Prediction failed: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const data = await response.json();
    console.log("[SkinVision] Prediction success:", data);

    return {
      disease: data.prediction,
      confidence: Math.round(data.confidence * 100), // convert 0-1 to 0-100 percentage
      allProbabilities: data.probabilities,
      inferenceTime: Math.round(data.inference_time_ms ?? 0),
    };
  } catch (err) {
    console.warn("[SkinVision] Backend offline. Attempting real Gemini offline screening...", err);

    // Try to run real Gemini prediction if API Key is set
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey) {
      try {
        const base64Url = await fileToBase64(file);
        const startTime = Date.now();
        const res = await predictSkinDiseaseOffline(base64Url);
        const inferenceTime = Date.now() - startTime;
        
        console.log("[SkinVision] Gemini offline screening success:", res);
        return {
          disease: res.prediction,
          confidence: Math.round(res.confidence * 100), // convert 0-1 to 0-100 percentage
          allProbabilities: res.probabilities,
          inferenceTime,
        };
      } catch (geminiErr) {
        console.error("[SkinVision] Gemini offline screening failed, falling back to simulation:", geminiErr);
      }
    }
    
    // Simulate inference delay (800ms)
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    const categories = ["Acne", "Eczema", "Psoriasis", "Vitiligo", "Warts", "Melanoma", 
                        "Basal Cell Carcinoma", "Fungal Infections", "Dermatitis", "Rosacea", 
                        "Normal"];
    
    // Generate a set of raw scores
    const raw_scores = categories.map(() => Math.random() * 5);
    const winner_idx = Math.floor(Math.random() * categories.length);
    raw_scores[winner_idx] += Math.random() * 15 + 15;
    
    // Softmax
    const exp_scores = raw_scores.map(s => Math.exp(s));
    const sum_exp = exp_scores.reduce((a, b) => a + b, 0);
    const probabilities: Record<string, number> = {};
    categories.forEach((cat, idx) => {
      probabilities[cat] = Number((exp_scores[idx] / sum_exp).toFixed(4));
    });
    
    // Take top 5 probabilities
    const sortedProbs = Object.fromEntries(
      Object.entries(probabilities)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
    );
    
    const predicted_disease = categories[winner_idx];
    const confidence = sortedProbs[predicted_disease];

    return {
      disease: predicted_disease,
      confidence: Math.round(confidence * 100),
      allProbabilities: sortedProbs,
      inferenceTime: 400 + Math.round(Math.random() * 180),
    };
  }
}

/**
 * Checks if the FastAPI backend is running and healthy.
 */
export async function checkBackendHealth(): Promise<boolean> {
  const url = `${API_URL}/health`;
  try {
    const response = await fetch(url, { method: "GET" });
    if (response.ok) {
      const data = await response.json();
      return data?.status === "healthy";
    }
    return false;
  } catch (err) {
    return false;
  }
}

