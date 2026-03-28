import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GenerativeModel } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Returns a Gemini Flash model configured for structured JSON output.
// Call this per-request rather than caching the model instance, since
// generationConfig may need to vary (e.g. responseSchema per tool).
export function getFlashModel(overrides?: Parameters<GoogleGenerativeAI["getGenerativeModel"]>[1]): GenerativeModel {
  return genAI.getGenerativeModel(
    {
      model: "gemini-3-flash-preview",
      generationConfig: {
        responseMimeType: "application/json",
      },
    },
    overrides
  );
}

// Imagen 3 uses the same API key but a different model endpoint.
export function getImagenModel(): GenerativeModel {
  return genAI.getGenerativeModel({ model: "imagen-3.0-generate-002" });
}
