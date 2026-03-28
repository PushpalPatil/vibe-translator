import { writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import { join } from "path";
import { analyzeVideo } from "../tools/analyzeVideo";
import { searchSpotify } from "../tools/searchSpotify";
import { generateMoodboard } from "../tools/generateMoodboard";
import { matchFontPair } from "../fonts";
import type {
  VibeProfile,
  VibeResult,
  SpotifyHandoff,
  MoodboardHandoff,
  MoodboardImage,
  SpotifyTrack,
} from "../types";

export type AcceptedMimeType =
  | "video/mp4"
  | "video/webm"
  | "video/quicktime"
  | "video/x-msvideo";

// Full pipeline result — moodboard.imageData contains /api/image/{id} URLs,
// not base64, so the whole object fits safely in sessionStorage.
export type VibeAgentResult = VibeResult;

function extractSpotifyHandoff(profile: VibeProfile): SpotifyHandoff {
  return {
    mood: profile.mood,
    energy: profile.energy,
    era: profile.era,
    genre_hints: profile.genre_hints,
    mood_narrative: profile.mood_narrative,
    song_suggestions: profile.song_suggestions,
  };
}

function extractMoodboardHandoff(
  profile: VibeProfile,
  tracks: SpotifyTrack[]
): MoodboardHandoff {
  return {
    moodboard_prompts: profile.moodboard_prompts,
    suggested_palette: profile.suggested_palette,
    mood: profile.mood,
    textures: profile.textures,
    tags: profile.tags,
    energy: profile.energy,
    era: profile.era,
    genre_hints: profile.genre_hints,
    mood_narrative: profile.mood_narrative,
    tracks,
  };
}

// Writes a base64 PNG buffer to /tmp and returns the /api/image/{id} URL.
async function persistImage(sessionId: string, index: number, base64: string): Promise<string> {
  const id = `${sessionId}-${index}`;
  const filePath = join("/tmp", `vibe-image-${id}.png`);
  await writeFile(filePath, Buffer.from(base64, "base64"));
  return `/api/image/${id}`;
}

// Deterministic orchestrator for the vibe analysis pipeline.
//
// Execution order:
//   1. analyzeVideo  — single Gemini structured call → VibeProfile
//   2. searchSpotify + generateMoodboard — parallel fanout
//   3. Write moodboard images to /tmp, swap base64 → /api/image/{id} URLs
//   4. Assemble VibeResult
//
// moodboard.imageData contains URL strings (not base64) so the full result
// fits in sessionStorage (~10KB vs ~15MB for raw base64 images).
//
// This function contains no LLM calls itself. All AI reasoning lives in the
// specialist tool functions it calls. Import directly from server-side code
// (route handlers, scripts) — no HTTP involved.
export async function runVibeAgent(
  videoPath: string,
  mimeType: AcceptedMimeType = "video/mp4"
): Promise<VibeAgentResult> {
  const { profile } = await analyzeVideo({ videoPath, mimeType });

  // Spotify and moodboard run in parallel — independent of each other.
  // Tracks are passed to the moodboard handoff once both resolve.
  const [{ tracks }, { images: rawImages, layout }] = await Promise.all([
    searchSpotify({ handoff: extractSpotifyHandoff(profile) }),
    generateMoodboard({ handoff: extractMoodboardHandoff(profile, []) }),
  ]);

  // Persist images to /tmp and build URL-based MoodboardImage array.
  // Empty imageData (failed Imagen calls) are kept as empty strings — the
  // frontend MoodboardPanel shows a skeleton for those cells.
  const sessionId = randomUUID();
  const moodboard: MoodboardImage[] = await Promise.all(
    rawImages.map(async (img, i): Promise<MoodboardImage> => {
      if (!img.imageData) return { prompt: img.prompt, imageData: "" };
      const url = await persistImage(sessionId, i, img.imageData);
      return { prompt: img.prompt, imageData: url };
    })
  );

  const fontPair = matchFontPair(profile.font_vibe.display, profile.font_vibe.body);

  return { profile, tracks, moodboard, fontPair };
}
