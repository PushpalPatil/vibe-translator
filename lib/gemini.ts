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

// Returns a Gemini Flash model configured for agentic tool use (function calling).
// Unlike getFlashModel, this does NOT set responseMimeType to JSON, because
// function calling requires text mode so the model can return tool call parts.
export function getFlashAgentModel(
  config: Parameters<GoogleGenerativeAI["getGenerativeModel"]>[0]
): GenerativeModel {
  return genAI.getGenerativeModel({
    ...config,
    model: config.model ?? "gemini-3-flash-preview",
  });
}

// Image generation via Gemini Flash Image Preview.
// Uses generateContent with responseModalities: ["IMAGE"] — not the deprecated predict endpoint.
export function getImageGenModel(): GenerativeModel {
  return genAI.getGenerativeModel({ model: "gemini-3.1-flash-image-preview" });
}
