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
