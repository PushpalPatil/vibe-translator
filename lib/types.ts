// VibeProfile is the single structured output of the video_analyze endpoint.
// One Gemini call produces all fields: mood analysis, creative outputs, and
// the data needed by downstream agents (Spotify, Moodboard).
export interface VibeProfile {
  // --- Mood analysis ---
  summary: string;
  mood: string[];                  // 3-5 mood descriptors
  energy: number;                  // 0.0 - 1.0
  era: string;                     // e.g. "chaotic gen-z", "90s nostalgia"
  genre_hints: string[];           // e.g. ["hyperpop", "art pop", "indie dance"]
  mood_narrative: string;          // 1-2 sentence plain English description
  primary_emotion: string;
  secondary_emotions: string[];
  temporal_pattern: "STABLE" | "BUILDING" | "FADING" | "MIXED";
  confidence: number;              // 0-1
  dominant_modality: "visual" | "audio" | "both";

  // --- Creative outputs (frontend display) ---
  dominant_colors: { hex: string; name: string }[];
  suggested_palette: string[];     // 6 hex codes, dark to light
  textures: string[];
  sounds: string[];
  font_vibe: {
    display: string;               // key from FONT_MAP (e.g. "brutalist mono")
    body: string;                  // same value as display
  };
  tags: string[];                  // 5-8 short vibe tags

  // --- Downstream agent inputs ---
  song_suggestions: {
    artist: string;
    track: string;
    why: string;
  }[];                             // 8-10 real songs for Spotify agent
  moodboard_prompts: string[];     // 4 image generation prompts for Moodboard agent
}

// Structured handoff from video agent → spotify agent.
// Compile-time subset of VibeProfile — if VibeProfile changes, this breaks loudly.
export type SpotifyHandoff = Pick<
  VibeProfile,
  "mood" | "energy" | "era" | "genre_hints" | "mood_narrative" | "song_suggestions"
>;

export interface SpotifyTrack {
  name: string;
  artist: string;
  albumArt: string;
  spotifyUrl: string;
  uri: string;
}

export interface MoodboardImage {
  prompt: string;
  imageData: string; // base64 from Imagen 3
}

// Editorial layout direction produced by the Gemini Step 1 call.
// Consumed by the frontend to guide grid presentation (anchor prominence,
// reading order, etc.) once MoodboardPanel supports dynamic layouts.
export interface MoodboardLayout {
  anchor_index: number;          // 0–3, zero-indexed cell that is the visual hero
  reading_sequence: string;      // how the eye moves through cells 0→1→2→3
  negative_space_strategy: string;
  palette_story: string;         // color arc across the four images
  emotional_arc: string;         // emotional journey moving through the board
}

// Structured handoff from video agent + spotify agent → moodboard agent.
export type MoodboardHandoff = Pick<
  VibeProfile,
  | "moodboard_prompts"
  | "suggested_palette"
  | "mood"
  | "textures"
  | "tags"
  | "energy"
  | "era"
  | "genre_hints"
  | "mood_narrative"
> & {
  tracks: SpotifyTrack[];
};

export interface VibeResult {
  profile: VibeProfile;
  tracks: SpotifyTrack[];
  moodboard: MoodboardImage[];
  fontPair: { display: string; body: string };
}
