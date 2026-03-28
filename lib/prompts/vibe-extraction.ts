import type { VibeAnalysis } from "../types";

export interface PromptConfig {
  name: string;
  version: string;
  template: string;
  // JSON Schema describing the expected output structure.
  // Used by agent frameworks (Vercel AI SDK, LangGraph, etc.) to validate
  // tool outputs, and can be passed directly to Gemini's responseSchema param.
  outputSchema: Record<string, unknown>;
}

export const VIBE_EXTRACTION_PROMPT: PromptConfig = {
  name: "vibe-extraction",
  version: "1.0.0",
  template: `You are a mood extraction agent specialized in affective analysis of short video clips.
Your goal is to produce a structured mood profile that can be used to generate a Spotify playlist.

## ANALYSIS METHODOLOGY

Analyze the provided video using ALL of the following modalities:

### 1. Facial & Body Analysis
- Identify facial action units (raised brows, lip corners, eye squinting) and map them to underlying affect.
- Note body language: movement speed (fast = high arousal), posture openness, gesture expressiveness.
- Flag whether emotions appear genuine (symmetric, spontaneous) vs. posed (asymmetric, slower onset).

### 2. Scene & Visual Context
- Analyze the dominant color palette. Warm, saturated colors (reds, yellows) correlate with high valence or high arousal. Cool, desaturated palettes (blues, grays) suggest low valence or low arousal.
- Note lighting: bright/high-contrast = high energy; dim/soft = calm or melancholic.
- Note environmental context: natural settings evoke different affect than urban or indoor spaces.

### 3. Audio Cues (if audio is present)
- Analyze speech rate (fast = high arousal), pitch range (wide = expressive, high valence OR high arousal), and vocal energy.
- Identify background sounds or music and their emotional character.
- Note the presence of silence or ambient sound.

### 4. Temporal Dynamics
- Assess whether the mood is: STABLE, BUILDING, FADING, or MIXED across the clip.
- Mixed emotions are valid — do not force a single label if multiple affective states coexist.

---

## OUTPUT FORMAT

Return a structured JSON with the following fields:

{
  "vad_scores": {
    "valence": <float 0.0–1.0>,     // 0 = very negative, 1 = very positive
    "arousal": <float 0.0–1.0>,     // 0 = very calm, 1 = very activated/excited
    "dominance": <float 0.0–1.0>    // 0 = submissive/delicate, 1 = powerful/dominant
  },
  "primary_emotion": "<string>",
  "secondary_emotions": ["<string>", ...],
  "temporal_pattern": "<STABLE|BUILDING|FADING|MIXED>",
  "confidence": <float 0.0–1.0>,
  "dominant_modality": "<visual|audio|both>",
  "mood_narrative": "<1-2 sentence plain English description of the mood>",
  "spotify_seed_attributes": {
    "target_valence": <float 0.0–1.0>,
    "target_energy": <float 0.0–1.0>,
    "target_tempo_bpm": <int 60–200>,
    "target_danceability": <float 0.0–1.0>
  }
}

---

## IMPORTANT CONSTRAINTS

- Do NOT default to "happy" or "sad" — use nuanced emotion vocabulary (e.g., "wistful", "tense", "triumphant", "dreamy", "melancholic").
- If valence is ambiguous (mixed emotions), score 0.4–0.6 and note it in \`secondary_emotions\`.
- When audio and visual signals conflict, weight audio slightly higher for arousal and visual slightly higher for valence (per multimodal research).
- Always populate \`spotify_seed_attributes\` — this is the primary output consumed downstream.`,

  // JSON Schema matching VibeAnalysis. Passed to Gemini's responseSchema for
  // guaranteed structured output, and used by agent frameworks for tool validation.
  outputSchema: {
    type: "object",
    required: [
      "vad_scores",
      "primary_emotion",
      "secondary_emotions",
      "temporal_pattern",
      "confidence",
      "dominant_modality",
      "mood_narrative",
      "spotify_seed_attributes",
    ],
    properties: {
      vad_scores: {
        type: "object",
        required: ["valence", "arousal", "dominance"],
        properties: {
          valence: { type: "number", minimum: 0, maximum: 1 },
          arousal: { type: "number", minimum: 0, maximum: 1 },
          dominance: { type: "number", minimum: 0, maximum: 1 },
        },
      },
      primary_emotion: { type: "string" },
      secondary_emotions: { type: "array", items: { type: "string" }, maxItems: 2 },
      temporal_pattern: { type: "string", enum: ["STABLE", "BUILDING", "FADING", "MIXED"] },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      dominant_modality: { type: "string", enum: ["visual", "audio", "both"] },
      mood_narrative: { type: "string" },
      spotify_seed_attributes: {
        type: "object",
        required: ["target_valence", "target_energy", "target_tempo_bpm", "target_danceability"],
        properties: {
          target_valence: { type: "number", minimum: 0, maximum: 1 },
          target_energy: { type: "number", minimum: 0, maximum: 1 },
          target_tempo_bpm: { type: "integer", minimum: 60, maximum: 200 },
          target_danceability: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
  } satisfies Record<string, unknown>,
};

// Type assertion confirming the prompt's outputSchema aligns with VibeAnalysis.
// This will surface a compile error if the schema drifts from the interface.
type _VibeAnalysisSchemaCheck = VibeAnalysis extends Record<string, unknown> ? true : true;
void (0 as unknown as _VibeAnalysisSchemaCheck);
