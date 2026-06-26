/**
 * ArogyaSathi Gemini service
 * Wraps the Gemini API so the assistant always presents itself as "ArogyaSathi",
 * never as "Gemini" or "Google".
 * Automatically falls back to alternative models if the primary model is busy (503) or rate-limited (429).
 */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

// Only use models verified to have a quota > 0 on this API key:
const MODELS = [
  "gemini-2.5-flash",       // Primary choice: high quality & speed
  "gemini-3.1-flash-lite",  // Fallback 1: next gen lite model, very fast
  "gemini-2.5-flash-lite",  // Fallback 2: stable lite backup
];

const LANG_INSTRUCTIONS: Record<string, string> = {
  en: "Always reply in English.",
  hi: "हमेशा हिंदी में जवाब दो।",
  gu: "હંમેશા ગુજરાતીમાં જવાબ આપો.",
};

/**
 * Build the system instruction that keeps the assistant branded as ArogyaSathi.
 */
function systemPrompt(lang: string): string {
  const langInstruction = LANG_INSTRUCTIONS[lang] ?? LANG_INSTRUCTIONS.en;
  return `You are ArogyaSathi, a warm and knowledgeable AI health assistant for Indian users, built into the ArogyaSathi AI platform.
Your role is to provide helpful, accurate, and compassionate health-related guidance in simple language.

IMPORTANT RULES:
- NEVER mention that you are powered by Gemini, Google, or any other AI company. If asked, say you are ArogyaSathi AI.
- Always recommend consulting a qualified doctor for serious or urgent conditions.
- Provide detailed, practical, accurate answers — do NOT give vague or generic responses.
- Be empathetic and culturally sensitive to Indian health concerns (mention Indian foods, lifestyle, etc. where relevant).
- When giving medical advice, add a brief disclaimer at the end in the appropriate language reminding the user to consult a doctor for serious issues.
- Format responses clearly using bullet points or numbered lists when listing symptoms, foods, or steps.

Language instruction: ${langInstruction}`;
}

export interface GeminiResponse {
  text: string;
  error?: string;
}

/** Sleep for ms milliseconds */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Call the Gemini REST API once with a specific model and return the raw fetch Response.
 */
async function callGeminiAPI(
  model: string,
  userMessage: string,
  lang: string,
  history: Array<{ role: "user" | "model"; text: string }>,
): Promise<Response> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
  const recentHistory = history.slice(-8); // last 8 messages for context
  const contents = [
    ...recentHistory.map((h) => ({
      role: h.role,
      parts: [{ text: h.text }],
    })),
    {
      role: "user",
      parts: [{ text: userMessage }],
    },
  ];

  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemPrompt(lang) }],
      },
      contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 800,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
      ],
    }),
  });
}

/**
 * Send a message to ArogyaSathi AI and get a health-assistant response.
 * Automatically tries fallback models if the primary model is busy (503) or rate-limited (429).
 *
 * @param userMessage - The user's message
 * @param lang - Language code: "en", "hi", or "gu"
 * @param history - Previous messages for multi-turn context
 */
export async function askArogyaSathi(
  userMessage: string,
  lang: string,
  history: Array<{ role: "user" | "model"; text: string }> = [],
): Promise<GeminiResponse> {
  if (!API_KEY) {
    console.error("[ArogyaSathi] VITE_GEMINI_API_KEY is not set");
    return {
      text: "Configuration error: API key not set.",
      error: "API key missing",
    };
  }

  let lastError = "";

  // Try each verified model in sequence
  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];
    console.log(`[ArogyaSathi] Trying model: ${model}...`);
    
    // We try each model up to 2 times if it hits a 503 or 429 error
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await callGeminiAPI(model, userMessage, lang, history);

        // If successful, extract and return text
        if (res.ok) {
          const data = await res.json();
          const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

          if (text) {
            console.log(`[ArogyaSathi] Success with model: ${model} (attempt ${attempt})`);
            return { text };
          }
          
          // Empty response check
          const finishReason = data?.candidates?.[0]?.finishReason ?? "";
          console.warn(`[ArogyaSathi] Empty text from ${model}. finishReason: ${finishReason}`);
          break; // Go to next model
        }

        const errBody = await res.json().catch(() => ({}));
        const apiMsg = errBody?.error?.message ?? `HTTP ${res.status}`;
        console.warn(`[ArogyaSathi] Model ${model} (attempt ${attempt}) returned error ${res.status}: ${apiMsg}`);
        lastError = apiMsg;

        if (res.status === 429 || res.status === 503 || res.status === 504) {
          // If this was the first attempt, wait 1.5 seconds and retry this same model
          if (attempt === 1) {
            const waitTime = res.status === 429 ? 2000 : 1500;
            console.log(`[ArogyaSathi] Waiting ${waitTime}ms to retry ${model}...`);
            await sleep(waitTime);
            continue; // Next attempt for current model
          }
        } else {
          // For other errors (e.g. 400), don't retry or try other models
          return {
            text: `Error ${res.status}: ${apiMsg}`,
            error: apiMsg,
          };
        }

      } catch (err) {
        console.error(`[ArogyaSathi] Network/Fetch error with model ${model} (attempt ${attempt}):`, err);
        lastError = (err as Error).message;
        if (attempt === 1) {
          await sleep(1500);
          continue;
        }
      }
    }
  }

  // If all models failed
  console.error("[ArogyaSathi] All models failed to respond.");
  
  const fallbacks: Record<string, string> = {
    en: "The health assistant is experiencing high demand. Please try again in a few moments.",
    hi: "हेल्थ असिस्टेंट पर अभी बहुत अधिक लोड है। कृपया कुछ पलों बाद पुनः प्रयास करें।",
    gu: "હેલ્થ આસિસ્ટન્ટ પર અત્યારે વધુ લોડ છે. કૃપા કરી થોડીવાર પછી ફરી પ્રયાસ કરો.",
  };

  return {
    text: fallbacks[lang] ?? fallbacks.en,
    error: lastError || "All models exhausted",
  };
}


/**
 * Explain a detected skin disease using Gemini.
 */
export async function explainSkinDisease(
  disease: string,
  confidence: number,
  lang: string,
): Promise<GeminiResponse> {
  const userPrompt = `The SkinVision-ViT skin disease screening model has predicted: "${disease}" (detected with high chances of presence).
As an AI medical assistant, please provide a detailed explanation of this screening result.

Answer the following questions in simple language:
1. What is this disease/condition? (Explain in easy-to-understand terms)
2. What are the common symptoms?
3. What are the primary causes?
4. How can it be prevented?
5. What are the standard treatments?
6. What are the emergency warning signs that require immediate medical attention?

Please organize the response with clear headings or bullet points. Include a disclaimer at the end that this is a screening/educational tool and the user should consult a dermatologist for a definitive diagnosis.`;

  return askArogyaSathi(userPrompt, lang, []);
}

/**
 * Validate if the uploaded image is actually a skin photograph.
 */
/**
 * Local pixel heuristic to check if the image has skin-like colors.
 * Used as a fast offline pre-filter to detect skin tones.
 */
function hasSkinPixels(base64DataUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(true); // safe fallback
          return;
        }

        // Downscale image to 50x50 to analyze quickly
        canvas.width = 50;
        canvas.height = 50;
        ctx.drawImage(img, 0, 0, 50, 50);

        const imgData = ctx.getImageData(0, 0, 50, 50);
        const data = imgData.data;
        let skinPixels = 0;
        const totalPixels = 50 * 50;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Heuristic for human skin tones (RGB space):
          // 1. R > 60, G > 30, B > 20
          // 2. R > G and R > B
          // 3. |R - G| > 10
          // 4. Max(R,G,B) - Min(R,G,B) > 10
          const isSkin = 
            r > 60 && g > 30 && b > 20 &&
            r > g && r > b &&
            Math.abs(r - g) > 10 &&
            (Math.max(r, g, b) - Math.min(r, g, b)) > 10;

          if (isSkin) {
            skinPixels++;
          }
        }

        const skinRatio = skinPixels / totalPixels;
        console.log(`[ArogyaSathi] Local skin pixel validation ratio: ${(skinRatio * 100).toFixed(1)}%`);
        
        // If at least 10% of the pixels match skin tones, consider it has skin
        resolve(skinRatio >= 0.10);
      } catch (e) {
        resolve(true); // safe fallback
      }
    };
    img.onerror = () => resolve(true);
    img.src = base64DataUrl;
  });
}

export async function askArogyaSathiVision(
  prompt: string,
  mimeType: string,
  base64Data: string,
): Promise<string> {
  if (!API_KEY) {
    throw new Error("API key missing");
  }

  let lastError = "";

  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];
    console.log(`[ArogyaSathi Vision] Trying model: ${model}...`);

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64Data,
                    },
                  },
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 50,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
          if (text) {
            console.log(`[ArogyaSathi Vision] Success with model: ${model} (attempt ${attempt})`);
            return text;
          }
        }

        const errBody = await response.json().catch(() => ({}));
        const apiMsg = errBody?.error?.message ?? `HTTP ${response.status}`;
        console.warn(`[ArogyaSathi Vision] Model ${model} (attempt ${attempt}) returned error ${response.status}: ${apiMsg}`);
        lastError = apiMsg;

        if (response.status === 429 || response.status === 503 || response.status === 504) {
          if (attempt === 1) {
            const waitTime = response.status === 429 ? 2000 : 1500;
            await sleep(waitTime);
            continue;
          }
        } else {
          throw new Error(apiMsg);
        }
      } catch (err) {
        console.error(`[ArogyaSathi Vision] Error with model ${model} (attempt ${attempt}):`, err);
        lastError = (err as Error).message;
        if (attempt === 1) {
          await sleep(1500);
          continue;
        }
      }
    }
  }

  throw new Error(lastError || "All vision models failed");
}

export async function validateSkinImage(base64DataUrl: string): Promise<"SKIN" | "INVALID"> {
  // 1. Run local skin pixel pre-filter
  const hasSkin = await hasSkinPixels(base64DataUrl);
  if (!hasSkin) {
    console.log("[ArogyaSathi] Local check: Image does not contain skin tones.");
    return "INVALID";
  }

  if (!API_KEY) {
    console.warn("[ArogyaSathi] VITE_GEMINI_API_KEY is not set. Falling back to local pixel check.");
    return "SKIN";
  }

  const match = base64DataUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
  if (!match) {
    console.warn("[ArogyaSathi] Invalid base64 data URL format");
    return "INVALID";
  }

  const mimeType = match[1];
  const base64Data = match[2];

  const prompt = `You are a medical screening validation system.
Analyze the uploaded image. Classify it as:
1. "SKIN": The image is a clear, close-up photograph of a human skin patch, skin lesion, rash, mole, acne, or skin texture. It MUST show skin surface clearly.
2. "INVALID": The image is anything else, including:
   - Animals, cars, buildings, landscapes, furniture, food, or general objects.
   - Non-skin body parts (like just eyes, teeth, hair, or clothes) where skin texture is not the primary focus.
   - Document scans, text, charts, diagrams, or diagrams of skin.
   - Unclear, extremely blurry, or dark images where skin details are invisible.

Respond with ONLY the word "SKIN" or "INVALID". Do not write anything else.`;

  try {
    const text = await askArogyaSathiVision(prompt, mimeType, base64Data);
    console.log("[ArogyaSathi] Skin image validation result:", text);
    if (text.toUpperCase().includes("SKIN")) return "SKIN";
    return "INVALID";
  } catch (err) {
    console.error("[ArogyaSathi] Error validating skin image:", err);
    // If Gemini fails, rely on our local skin pixel check which passed
    return "SKIN";
  }
}

/**
 * Refine the skin disease prediction using Gemini Vision.
 * Compares the image visually against the top ViT candidate predictions to improve accuracy.
 */
export async function refineSkinPrediction(
  base64DataUrl: string,
  topPrediction: string,
  probabilities: Record<string, number>,
): Promise<string> {
  if (!API_KEY) {
    return topPrediction;
  }

  const match = base64DataUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
  if (!match) {
    return topPrediction;
  }

  const mimeType = match[1];
  const base64Data = match[2];
  const candidatesList = Object.keys(probabilities).join(", ");

  const prompt = `You are an expert dermatological AI assistant.
A Vision Transformer model has scanned this skin image and predicted the following top candidates (with their confidence scores):
${JSON.stringify(probabilities)}

Your task is to analyze the image visually (checking lesion structure, color, boundaries, symmetry, and scaling) and refine the prediction.
Choose the MOST accurate condition from the candidate list: [${candidatesList}, Normal, Inconclusive Result].

Respond with ONLY the name of the chosen category (exactly as written in the list). Do not include any explanation, markdown, or other text.`;

  try {
    const text = await askArogyaSathiVision(prompt, mimeType, base64Data);
    console.log("[ArogyaSathi] Gemini prediction refinement:", text);
    
    // Match the response against the valid candidates
    const validLabels = [...Object.keys(probabilities), "Normal", "Inconclusive Result"];
    for (const label of validLabels) {
      if (text.toUpperCase() === label.toUpperCase() || text.toUpperCase().includes(label.toUpperCase())) {
        return label;
      }
    }
    return topPrediction;
  } catch (err) {
    console.error("[ArogyaSathi] Error refining skin prediction:", err);
    return topPrediction;
  }
}
