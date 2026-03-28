import { analyzeVideo } from "../tools/analyzeVideo";
import { searchSpotify } from "../tools/searchSpotify";
import { matchFontPair } from "../fonts";
import type { VibeProfile, SpotifyHandoff } from "../types";
import type { SpotifyTrack } from "../types";

export type AcceptedMimeType =
  | "video/mp4"
  | "video/webm"
  | "video/quicktime"
  | "video/x-msvideo";

// Subset of VibeResult without moodboard — moodboard images are large base64
// blobs that exceed sessionStorage quota. The results page fetches them
// separately via /api/moodboard after the page loads.
export interface VibeAgentResult {
  profile: VibeProfile;
  tracks: SpotifyTrack[];
  fontPair: { display: string; body: string };
}

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

// Deterministic orchestrator for the vibe analysis pipeline.
//
// Execution order:
//   1. analyzeVideo  — single Gemini structured call → VibeProfile
//   2. searchSpotify — LLM agent loop (Gemini function calling)
//   3. Assemble result
//
// Moodboard generation is intentionally excluded: the 6 base64 PNG images it
// produces are too large to store in sessionStorage (~10-20MB). The results
// page fetches /api/moodboard separately so it renders progressively.
//
// This function contains no LLM calls itself. All AI reasoning lives in the
// specialist tool functions it calls. Import directly from server-side code
// (route handlers, scripts) — no HTTP involved.
export async function runVibeAgent(
  videoPath: string,
  mimeType: AcceptedMimeType = "video/mp4"
): Promise<VibeAgentResult> {
  const { profile } = await analyzeVideo({ videoPath, mimeType });
  const { tracks } = await searchSpotify({ handoff: extractSpotifyHandoff(profile) });
  const fontPair = matchFontPair(profile.font_vibe.display, profile.font_vibe.body);

  return { profile, tracks, fontPair };
}
