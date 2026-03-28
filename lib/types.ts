// VibeAnalysis is the structured output of the video_analyze endpoint.
// It contains the mood/VAD analysis extracted from a video clip.
export interface VibeAnalysis {
  vad_scores: {
    valence: number;    // 0.0-1.0, emotional positivity
    arousal: number;    // 0.0-1.0, emotional intensity/activation
    dominance: number;  // 0.0-1.0, sense of power/control
  };
  primary_emotion: string;
  secondary_emotions: string[];
  temporal_pattern: "STABLE" | "BUILDING" | "FADING" | "MIXED";
  confidence: number;
  dominant_modality: "visual" | "audio" | "both";
  mood_narrative: string;
  spotify_seed_attributes: SpotifySeedAttributes;
}

// VibeProfile is the full assembled result combining VibeAnalysis with
// creative outputs (palette, fonts, song suggestions, moodboard prompts).
export interface VibeProfile {
  summary: string;
  mood: string[];
  energy: number; // 0.0 - 1.0
  era: string;
  dominant_colors: { hex: string; name: string }[];
  suggested_palette: string[]; // 6 hex codes
  textures: string[];
  sounds: string[];
  font_vibe: {
    display: string;
    body: string;
  };
  song_suggestions: {
    artist: string;
    track: string;
    why: string;
  }[];
  moodboard_prompts: string[];
  tags: string[];
  analysis: VibeAnalysis;
}

export interface SpotifySeedAttributes {
  target_valence: number;      // 0-1
  target_energy: number;       // 0-1
  target_tempo_bpm: number;    // BPM
  target_danceability: number; // 0-1
}

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

export interface VibeResult {
  profile: VibeProfile;
  tracks: SpotifyTrack[];
  moodboard: MoodboardImage[];
  fontPair: { display: string; body: string };
}
