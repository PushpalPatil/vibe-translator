import type { MoodboardHandoff, MoodboardImage } from "../types";

export interface GenerateMoodboardInput {
  handoff: MoodboardHandoff;
}

export interface GenerateMoodboardOutput {
  images: MoodboardImage[];
}

export async function generateMoodboard(
  _input: GenerateMoodboardInput
): Promise<GenerateMoodboardOutput> {
  // STUB — Imagen 3 generation not yet implemented.
  return { images: [] };
}
