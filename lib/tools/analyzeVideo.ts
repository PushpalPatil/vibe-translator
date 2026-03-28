import { readFile } from "fs/promises";
import { getFlashModel } from "../gemini";
import { VIBE_EXTRACTION_PROMPT } from "../prompts/vibe-extraction";
import type { VibeAnalysis } from "../types";

export interface AnalyzeVideoInput {
  videoPath: string;
  mimeType?: "video/mp4" | "video/webm" | "video/quicktime" | "video/x-msvideo";
}

export interface AnalyzeVideoOutput {
  analysis: VibeAnalysis;
  // Raw response text preserved for debugging / logging
  rawResponse: string;
}

// Core tool function: reads a video file from disk and returns a structured
// VibeAnalysis by sending it to Gemini 2.0 Flash as inline base64 data.
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

  const analysis = parsed as VibeAnalysis;

  // Lightweight runtime validation of required top-level fields
  const required: (keyof VibeAnalysis)[] = [
    "vad_scores",
    "primary_emotion",
    "secondary_emotions",
    "temporal_pattern",
    "confidence",
    "dominant_modality",
    "mood_narrative",
    "spotify_seed_attributes",
  ];

  for (const field of required) {
    if (analysis[field] === undefined) {
      throw new Error(`Gemini response missing required field: ${field}`);
    }
  }

  return { analysis, rawResponse };
}
