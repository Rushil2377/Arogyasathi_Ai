/**
 * Service to interact with the RetinaSense-ViT FastAPI Backend
 */

const API_URL = import.meta.env.VITE_RETINASENSE_API_URL || "http://localhost:8000";

export interface PredictionResult {
  disease: string;
  confidence: number;
  allProbabilities: Record<string, number>;
  inferenceTime: number;
}

/**
 * Sends an eye image to the RetinaSense-ViT backend for screening.
 * 
 * @param file - The image file to analyze
 */
export async function predictEyeDisease(file: File): Promise<PredictionResult> {
  const formData = new FormData();
  formData.append("image", file);


  const url = `${API_URL}/predict`;
  console.log(`[RetinaSense] Sending prediction request to ${url}...`);

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const errorMsg = errorBody?.detail ?? `HTTP error! status: ${response.status}`;
    console.error(`[RetinaSense] Prediction failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const data = await response.json();
  console.log("[RetinaSense] Prediction success:", data);

  // The backend returns:
  // {
  //   "status": "success",
  //   "prediction": "Normal",
  //   "confidence": 0.94,
  //   "probabilities": { ... },
  //   "inference_time_ms": 234.5
  // }
  
  // Normalize the disease names if needed (e.g. mapping "Diabetes/DR" to "Diabetic Retinopathy")
  let diseaseName = data.prediction;
  if (diseaseName === "Diabetes/DR") {
    diseaseName = "Diabetic Retinopathy";
  }

  // Format probabilities keys similarly
  const formattedProbs: Record<string, number> = {};
  if (data.probabilities) {
    for (const [key, val] of Object.entries(data.probabilities)) {
      const normalizedKey = key === "Diabetes/DR" ? "Diabetic Retinopathy" : key;
      formattedProbs[normalizedKey] = Number(val);
    }
  }

  return {
    disease: diseaseName,
    confidence: Math.round(data.confidence * 100), // convert 0-1 to 0-100 percentage
    allProbabilities: formattedProbs,
    inferenceTime: Math.round(data.inference_time_ms ?? 0),
  };
}

/**
 * Check if the backend is running and healthy
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health`, { method: "GET" });
    if (response.ok) {
      const data = await response.json();
      return data.status === "healthy";
    }
    return false;
  } catch (err) {
    console.warn("[RetinaSense] Health check failed:", err);
    return false;
  }
}
