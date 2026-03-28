import { readFile } from "fs/promises";
import { getFlashModel } from "../gemini";
import { VIBE_EXTRACTION_PROMPT } from "../prompts/vibe-extraction";
import type { VibeProfile } from "../types";

export interface AnalyzeVideoInput {
  videoPath: string;
  mimeType?: "video/mp4" | "video/webm" | "video/quicktime" | "video/x-msvideo";
}

export interface AnalyzeVideoOutput {
  profile: VibeProfile;
  // Raw response text preserved for debugging / logging
  rawResponse: string;
}

// Core tool function: reads a video file from disk and returns a structured
// VibeProfile by sending it to Gemini Flash as inline base64 data.
//
// Designed to be importable directly by an orchestrating agent without HTTP.
// The route handler at app/api/video_analyze/route.ts is a thin wrapper.
export async function analyzeVideo(input: AnalyzeVideoInput): Promise<AnalyzeVideoOutput> {
  const { videoPath, mimeType = "video/mp4" } = input;

  const videoBytes = await readFile(videoPath);
  const videoBase64 = videoBytes.toString("base64");

  const model = getFlashModel();

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: videoBase64,
            },
          },
          {
            text: VIBE_EXTRACTION_PROMPT.template,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const rawResponse = result.response.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawResponse);
  } catch {
    throw new Error(`Gemini returned non-JSON response: ${rawResponse.slice(0, 200)}`);
  }

  const profile = parsed as VibeProfile;

  // Lightweight runtime validation of required top-level fields
  const required: (keyof VibeProfile)[] = [
    "summary",
    "mood",
    "energy",
    "era",
    "genre_hints",
    "mood_narrative",
    "primary_emotion",
    "secondary_emotions",
    "temporal_pattern",
    "confidence",
    "dominant_modality",
    "dominant_colors",
    "suggested_palette",
    "textures",
    "sounds",
    "font_vibe",
    "tags",
    "song_suggestions",
    "moodboard_prompts",
  ];

  for (const field of required) {
    if (profile[field] === undefined) {
      throw new Error(`Gemini response missing required field: ${field}`);
    }
  }

  return { profile, rawResponse };
}
