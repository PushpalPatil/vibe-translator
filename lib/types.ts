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
  vad_scores: {
    valence: number;    // 0-1, emotional positivity
    arousal: number;    // 0-1, emotional intensity
    dominance: number;  // 0-1, sense of control
  };
  primary_emotion: string;
  secondary_emotions: string[];
  temporal_pattern: "STABLE" | "BUILDING" | "DECLINING" | "OSCILLATING" | "PEAK_AND_FADE";
  confidence: number;
  dominant_modality: "visual" | "auditory" | "mixed";
  mood_narrative: string;
  spotify_seed_attributes: SpotifySeedAttributes;
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
