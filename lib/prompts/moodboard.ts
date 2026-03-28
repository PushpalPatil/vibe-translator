import type { PromptConfig } from "./vibe-extraction";

// outputSchema describes what Gemini returns in Step 1 (prompt generation).
// Step 2 (image gen) consumes image_prompts and produces base64 imageData.
// The final MoodboardImage[] + MoodboardLayout that reaches the frontend
// is assembled by the generateMoodboard tool after both steps complete.
export const MOODBOARD_PROMPT: PromptConfig = {
  name: "moodboard",
  version: "1.1.0",
  template: `You are a spatial moodboard director. Translate abstract vibe profiles into cinematic moodboards — combining image generation prompts with editorial layout guidance. Think art direction: every choice (subject, lighting, texture, crop) must reinforce a single coherent atmosphere, in the tradition of Kinfolk editorial, Brutalist layout design, and considered Pinterest curation.

The output will render as a 2×3 grid (2 columns, 3 rows). Design for exactly 6 images.

## IMAGE PROMPTS
Generate exactly 6 distinct image prompts. Each must:
- Be 40–80 words, cinematic and specific (no generic descriptions)
- Specify: subject · lighting · color temperature · texture detail · mood · camera/framing style
- Draw from the spatial/sensory world: architecture, materials, light conditions, objects, nature
- Avoid people as primary subjects — focus on environments, surfaces, light, and atmosphere
- Represent a different "angle" on the same emotional world
- Compose for a square crop — consider what reads well in a tight cell

## LAYOUT DIRECTION
Brief the 2×3 grid:
- Which image (0–5, zero-indexed) is the visual anchor — the one the eye lands on first
- Pacing: how the six images should be "read" in sequence (cell 0 top-left → 1 top-right → 2 mid-left → 3 mid-right → 4 bottom-left → 5 bottom-right)
- Negative space strategy within individual images (not between cells — it's a tight grid)
- Palette story: how the six images together form a coherent color arc
- Emotional arc: what the viewer feels moving through the board from first to last image

--- VIBE PROFILE ---

MOOD: {{mood}}
NARRATIVE: {{mood_narrative}}
ENERGY: {{energy}}
ERA: {{era}}
GENRE HINTS: {{genre_hints}}

PALETTE: {{suggested_palette}}
TEXTURES: {{textures}}
TAGS: {{tags}}

IMAGE SEEDS (creative anchors — not literal instructions):
{{moodboard_prompts}}

--- END PROFILE ---

STYLE DIRECTION:
- Treat this as an editorial spread, not a collage
- Images should feel discovered, not staged
- Palette must feel atmospheric — not decorative
- Each image must work both alone and as part of the 2×3 whole
- Restraint over maximalism: one strong idea per image

Respond with a single JSON object matching this exact structure — no markdown, no prose, only JSON:
{
  "image_prompts": ["<prompt 0>", "<prompt 1>", "<prompt 2>", "<prompt 3>", "<prompt 4>", "<prompt 5>"],
  "layout": {
    "anchor_index": 0,
    "reading_sequence": "<string>",
    "negative_space_strategy": "<string>",
    "palette_story": "<string>",
    "emotional_arc": "<string>"
  }
}`,

  // Schema for the Gemini Step 1 response.
  // Exactly 6 prompts (one per 2×3 cell) + structured layout direction.
  outputSchema: {
    type: "object",
    required: ["image_prompts", "layout"],
    properties: {
      image_prompts: {
        type: "array",
        minItems: 6,
        maxItems: 6,
        items: { type: "string" },
        description: "Exactly 6 image prompts, one per cell of the 2×3 grid (top-left, top-right, mid-left, mid-right, bottom-left, bottom-right)",
      },
      layout: {
        type: "object",
        required: [
          "anchor_index",
          "reading_sequence",
          "negative_space_strategy",
          "palette_story",
          "emotional_arc",
        ],
        properties: {
          anchor_index: {
            type: "integer",
            minimum: 0,
            maximum: 5,
            description: "Zero-based index of the hero/anchor image in the 2×3 grid",
          },
          reading_sequence: {
            type: "string",
            description: "How the eye should move through cells 0→1→2→3→4→5 and why",
          },
          negative_space_strategy: {
            type: "string",
            description: "Negative space treatment within the individual images",
          },
          palette_story: {
            type: "string",
            description: "How the six images form a coherent color arc across the grid",
          },
          emotional_arc: {
            type: "string",
            description: "The emotional journey the viewer experiences moving through all six images",
          },
        },
      },
    },
  },
};
