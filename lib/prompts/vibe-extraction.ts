import type { VibeProfile } from "../types";
import { FONT_VIBE_OPTIONS } from "../fonts";

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
  version: "2.0.0",
  template: `You are a multimodal vibe analyst. You watch a short video clip and produce a complete structured profile that captures its mood, aesthetic, and cultural energy.

## ANALYSIS METHODOLOGY

Analyze the video using ALL available modalities:

### 1. Facial & Body
- Identify facial action units and map them to affect.
- Note body language: movement speed, posture, gesture expressiveness.
- Flag genuine vs. posed emotion.

### 2. Scene & Visual Context
- Dominant color palette. Warm/saturated = high valence or arousal. Cool/desaturated = low.
- Lighting: bright/high-contrast = energy; dim/soft = calm or melancholic.
- Environment: natural, urban, indoor — each carries different affect.

### 3. Audio (if present)
- Speech rate, pitch range, vocal energy.
- Background sounds or music and their emotional character.
- Silence or ambient texture.

### 4. Temporal Dynamics
- Is the mood STABLE, BUILDING, FADING, or MIXED across the clip?

---

## OUTPUT FORMAT

Return a single JSON object with ALL of the following fields:

{
  "summary": "<2-3 sentence vibe description>",
  "mood": ["<3-5 nuanced mood descriptors>"],
  "energy": <float 0.0-1.0>,
  "era": "<cultural era, e.g. 'chaotic gen-z', '90s nostalgia', 'y2k maximalism'>",
  "genre_hints": ["<3-5 music genre hints, e.g. 'hyperpop', 'art pop', 'indie dance'>"],
  "mood_narrative": "<1-2 sentence plain English description of the mood and its musical implications>",
  "primary_emotion": "<string>",
  "secondary_emotions": ["<1-2 strings>"],
  "temporal_pattern": "<STABLE|BUILDING|FADING|MIXED>",
  "confidence": <float 0.0-1.0>,
  "dominant_modality": "<visual|audio|both>",
  "dominant_colors": [{"hex": "#...", "name": "<color name>"}],
  "suggested_palette": ["<6 hex codes, ordered dark to light>"],
  "textures": ["<2-3 texture descriptions, e.g. 'film grain', 'soft focus'>"],
  "sounds": ["<2-3 sound descriptions, e.g. 'vinyl crackle', 'distant bass'>"],
  "font_vibe": {
    "display": "<one of: ${FONT_VIBE_OPTIONS.join(", ")}>",
    "body": "<same value as display>"
  },
  "tags": ["<5-8 short vibe hashtags>"],
  "song_suggestions": [
    {"artist": "<real artist>", "track": "<real track name>", "why": "<1 sentence>"}
  ],
  "moodboard_prompts": [
    "<4 detailed image generation prompts that visually capture this vibe>"
  ]
}

---

## IMPORTANT CONSTRAINTS

### Mood & Emotion
- Do NOT default to "happy" or "sad" — use nuanced vocabulary (wistful, tense, triumphant, dreamy, frenetic, serene).
- Mixed emotions are valid. If ambiguous, reflect it in secondary_emotions.
- When audio and visual signals conflict, weight audio for arousal and visual for valence.

### Song Suggestions
- Suggest 8-10 REAL songs by REAL artists. These will be verified against Spotify.
- Go beyond obvious choices. Match the specific energy, texture, and era — not just the mood label.
- Include a mix: some well-known tracks for anchoring, some deeper cuts that truly embody the vibe.
- The "why" field should explain the sonic/emotional match, not just restate the mood.

### Palette & Colors
- suggested_palette must be exactly 6 hex codes, ordered darkest to lightest.
- dominant_colors should have 3-5 entries with both hex and a descriptive name.

### Font Vibe
- font_vibe.display and font_vibe.body must be the SAME value.
- Must be one of: ${FONT_VIBE_OPTIONS.join(", ")}

### Moodboard Prompts
- Exactly 4 prompts. Each should be a detailed image generation prompt (2-3 sentences).
- They should visually capture the vibe — abstract, atmospheric, textural. Not literal descriptions of the video.
- Vary the prompts: one close-up/textural, one landscape/environment, one abstract/color-focused, one human/emotional.`,

  // JSON Schema matching VibeProfile. Passed to Gemini's responseSchema for
  // guaranteed structured output, and used by agent frameworks for tool validation.
  outputSchema: {
    type: "object",
    required: [
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
    ],
    properties: {
      summary: { type: "string" },
      mood: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
      energy: { type: "number", minimum: 0, maximum: 1 },
      era: { type: "string" },
      genre_hints: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
      mood_narrative: { type: "string" },
      primary_emotion: { type: "string" },
      secondary_emotions: { type: "array", items: { type: "string" }, maxItems: 3 },
      temporal_pattern: { type: "string", enum: ["STABLE", "BUILDING", "FADING", "MIXED"] },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      dominant_modality: { type: "string", enum: ["visual", "audio", "both"] },
      dominant_colors: {
        type: "array",
        items: {
          type: "object",
          required: ["hex", "name"],
          properties: {
            hex: { type: "string" },
            name: { type: "string" },
          },
        },
        minItems: 3,
        maxItems: 5,
      },
      suggested_palette: { type: "array", items: { type: "string" }, minItems: 6, maxItems: 6 },
      textures: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 3 },
      sounds: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 3 },
      font_vibe: {
        type: "object",
        required: ["display", "body"],
        properties: {
          display: { type: "string", enum: FONT_VIBE_OPTIONS },
          body: { type: "string", enum: FONT_VIBE_OPTIONS },
        },
      },
      tags: { type: "array", items: { type: "string" }, minItems: 5, maxItems: 8 },
      song_suggestions: {
        type: "array",
        items: {
          type: "object",
          required: ["artist", "track", "why"],
          properties: {
            artist: { type: "string" },
            track: { type: "string" },
            why: { type: "string" },
          },
        },
        minItems: 8,
        maxItems: 10,
      },
      moodboard_prompts: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
    },
  } satisfies Record<string, unknown>,
};

// Compile-time check: ensure schema keys align with VibeProfile fields.
type _SchemaKeys = keyof typeof VIBE_EXTRACTION_PROMPT.outputSchema.properties;
type _ProfileKeys = keyof VibeProfile;
type _Check = _SchemaKeys extends _ProfileKeys ? true : never;
const _check: _Check = true;
void _check;
