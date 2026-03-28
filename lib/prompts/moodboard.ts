import type { PromptConfig } from "./vibe-extraction";

export const MOODBOARD_PROMPT: PromptConfig = {
  name: "moodboard",
  version: "1.0.0",
  template: ``,
  outputSchema: {
    type: "object",
    required: ["images"],
    properties: {
      images: {
        type: "array",
        items: {
          type: "object",
          required: ["prompt", "imageData"],
          properties: {
            prompt: { type: "string" },
            imageData: { type: "string", description: "base64-encoded PNG from Imagen 3" },
          },
        },
      },
    },
  },
};
