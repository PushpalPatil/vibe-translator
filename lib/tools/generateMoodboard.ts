import type { ResponseSchema } from "@google/generative-ai";
import { getFlashModel, getImageGenModel } from "../gemini";
import { MOODBOARD_PROMPT } from "../prompts/moodboard";
import type { MoodboardHandoff, MoodboardImage, MoodboardLayout } from "../types";

export interface GenerateMoodboardInput {
  handoff: MoodboardHandoff;
}

export interface GenerateMoodboardOutput {
  images: MoodboardImage[];
  layout: MoodboardLayout | null;
  rawResponse: string;
}

interface GeminiMoodboardResponse {
  image_prompts: string[];
  layout: MoodboardLayout;
}

// Fills {{placeholder}} tokens in the prompt template with handoff values.
function interpolateTemplate(template: string, handoff: MoodboardHandoff): string {
  return template
    .replace("{{mood}}", handoff.mood.join(", "))
    .replace("{{mood_narrative}}", handoff.mood_narrative)
    .replace("{{energy}}", String(handoff.energy))
    .replace("{{era}}", handoff.era)
    .replace("{{genre_hints}}", handoff.genre_hints.join(", "))
    .replace("{{suggested_palette}}", handoff.suggested_palette.join(", "))
    .replace("{{textures}}", handoff.textures.join(", "))
    .replace("{{tags}}", handoff.tags.join(", "))
    .replace(
      "{{moodboard_prompts}}",
      handoff.moodboard_prompts.map((p, i) => `${i + 1}. ${p}`).join("\n")
    );
}

// Generates one image via gemini-3.1-flash-image-preview and returns raw base64 PNG bytes.
async function callImageGen(prompt: string): Promise<string> {
  const model = getImageGenModel();

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["IMAGE"],
    } as never,
  });

  const parts = result.response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => "inlineData" in p && p.inlineData);
  if (!imagePart || !("inlineData" in imagePart) || !imagePart.inlineData) {
    throw new Error("Image gen returned no image data");
  }
  return imagePart.inlineData.data;
}

// Core tool function: receives a MoodboardHandoff and runs a two-step pipeline:
//   Step 1 — Gemini Flash generates 4 Imagen prompts + editorial layout direction.
//   Step 2 — Imagen 3 renders all 4 prompts in parallel.
//
// Designed to be importable directly by an orchestrating agent without HTTP.
// The route handler at app/api/moodboard/route.ts is a thin wrapper.
export async function generateMoodboard(
  input: GenerateMoodboardInput
): Promise<GenerateMoodboardOutput> {
  const { handoff } = input;

  // --- Step 1: Gemini Flash → image prompts + layout direction ---
  const model = getFlashModel();
  const filledPrompt = interpolateTemplate(MOODBOARD_PROMPT.template, handoff);

  const geminiResult = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: filledPrompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: MOODBOARD_PROMPT.outputSchema as unknown as ResponseSchema,
    },
  });

  const rawResponse = geminiResult.response.text();

  let parsed: GeminiMoodboardResponse;
  try {
    parsed = JSON.parse(rawResponse);
  } catch {
    throw new Error(
      `Gemini returned non-JSON response: ${rawResponse.slice(0, 200)}`
    );
  }

  const { image_prompts, layout } = parsed;
  console.log("[moodboard] Gemini Step 1 parsed:", { image_prompts_count: image_prompts?.length, layout_keys: layout ? Object.keys(layout) : null });

  if (!Array.isArray(image_prompts) || image_prompts.length === 0) {
    throw new Error(
      `Gemini returned no image_prompts. Raw: ${rawResponse.slice(0, 200)}`
    );
  }

  // --- Step 2: Imagen 3 → base64 images (parallel, non-fatal per-image) ---
  const imageResults = await Promise.allSettled(
    image_prompts.map((prompt) => callImageGen(prompt))
  );

  const images: MoodboardImage[] = imageResults.map((result, i) => {
    if (result.status === "rejected") {
      console.error(`[moodboard] Imagen 3 failed for prompt ${i}:`, result.reason);
    }
    return {
      prompt: image_prompts[i],
      // Failed images get empty string — frontend shows skeleton for those cells
      imageData: result.status === "fulfilled" ? result.value : "",
    };
  });

  return { images, layout: layout ?? null, rawResponse };
}
