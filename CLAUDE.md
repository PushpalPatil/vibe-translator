# Vibe Translator — Claude Code Implementation Guide

## What This Is

A Next.js web app for a hackathon. User uploads a short video clip → app extracts frames + audio → sends to Gemini 2.0 Flash for multimodal "vibe analysis" → returns three creative outputs: a color palette + font pairing, a Spotify playlist, and an AI-generated moodboard. The results page dynamically re-themes itself to match the detected vibe.

## Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Styling:** Tailwind CSS + CSS custom properties for dynamic vibe theming
- **Video Processing:** ffmpeg (installed on server, called via child_process or fluent-ffmpeg)
- **AI Perception:** Google Gemini 2.0 Flash (`@google/generative-ai` SDK)
- **Music:** Spotify Web API (Client Credentials flow, search endpoint only)
- **Image Generation:** Imagen 3 (`imagen-3.0-generate-002`) via Gemini API — same API key as Gemini Flash
- **Fonts:** Google Fonts loaded dynamically via `<link>` tags

## Project Structure

```
vibe-translator/
├── app/
│   ├── layout.tsx              # Root layout, base styles
│   ├── page.tsx                # Landing page — upload UI
│   ├── results/
│   │   └── page.tsx            # Results page — three panels + vibe theming
│   ├── api/
│   │   ├── analyze/
│   │   │   └── route.ts        # POST: upload video → ffmpeg → Gemini → vibe JSON
│   │   ├── spotify/
│   │   │   └── route.ts        # POST: song suggestions[] → Spotify search → verified tracks
│   │   └── moodboard/
│   │       └── route.ts        # POST: prompts[] → image generation → image URLs
│   └── globals.css
├── components/
│   ├── VideoUploader.tsx       # Drag-drop + file picker, video preview
│   ├── VibeProfile.tsx         # Summary, tags, mood display
│   ├── PalettePanel.tsx        # Color swatches + font pairing preview
│   ├── PlaylistPanel.tsx       # Track list with album art + Spotify links
│   ├── MoodboardPanel.tsx      # 2x2 grid of generated images, skeleton loaders
│   └── LoadingState.tsx        # "Reading the room..." animation
├── lib/
│   ├── gemini.ts               # Gemini API client + prompt
│   ├── spotify.ts              # Spotify auth + search helpers
│   ├── ffmpeg.ts               # Frame extraction + audio separation
│   ├── imagegen.ts             # Image generation API wrapper
│   ├── fonts.ts                # Font pairing lookup table + Google Fonts URL builder
│   └── types.ts                # TypeScript interfaces for VibeProfile, Track, etc.
├── public/
│   └── textures/               # CSS texture overlays (grain.png, noise.svg, etc.)
├── .env.local                  # API keys (not committed)
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

## Environment Variables

```env
# Google (Gemini Flash + Imagen 3 — same key for both)
GEMINI_API_KEY=

# Spotify (Client Credentials)
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
```

## Core Implementation Details

### 1. Video Upload + Processing (`/api/analyze/route.ts`)

Accept video via FormData. Use ffmpeg to:
- Extract frames at ~1 fps, keep 5-8 key frames as JPEG buffers
- Separate audio track as a short audio file (WAV or MP3)

```typescript
// Use child_process exec or fluent-ffmpeg
// Frame extraction:
// ffmpeg -i input.mp4 -vf "fps=1" -frames:v 8 -q:v 2 frame_%03d.jpg
// Audio extraction:
// ffmpeg -i input.mp4 -vn -acodec libmp3lame -ar 16000 -ac 1 audio.mp3
```

Then send frames (as base64 images) + audio (as base64) to Gemini in a single multimodal request.

**Important:** Store uploaded video and extracted files in `/tmp/` with unique IDs. Clean up after processing.

### 2. Gemini Multimodal Call (`lib/gemini.ts`)

Use the `@google/generative-ai` SDK. Send multiple image parts + one audio part + text prompt.

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Build content parts:
// - Multiple inline_data parts with mimeType: "image/jpeg" for each frame
// - One inline_data part with mimeType: "audio/mp3" for the audio
// - One text part with the analysis prompt
//
// Set generationConfig.responseMimeType to "application/json" for structured output
```

The prompt should request the full VibeProfile JSON schema (see types.ts). Critical: song_suggestions must include 8-10 real songs with artist + track name.

### 3. Spotify Search (`lib/spotify.ts`)

**Auth — Client Credentials flow (no user login):**

```typescript
async function getSpotifyToken(): Promise<string> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  return data.access_token;
}
```

**Search — verify each Gemini suggestion exists:**

```typescript
async function searchTrack(
  token: string,
  artist: string,
  track: string
): Promise<SpotifyTrack | null> {
  const q = encodeURIComponent(`track:${track} artist:${artist}`);
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  const item = data.tracks?.items?.[0];
  if (!item) return null;
  return {
    name: item.name,
    artist: item.artists[0].name,
    albumArt: item.album.images[0]?.url,
    spotifyUrl: item.external_urls.spotify,
    uri: item.uri,
  };
}
```

Run all 8-10 suggestions in parallel with `Promise.allSettled`, filter to successful results, take first 5-6.

**Note:** Spotify Dev Mode limits search to 10 results per request. We only need 1 per query so this is fine.

### 4. Image Generation (`lib/imagegen.ts`)

Use Imagen 3 via the Gemini API. Same `GEMINI_API_KEY`, different model.

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function generateMoodboardImage(prompt: string): Promise<string> {
  // Use the Imagen 3 model via the Gemini API
  // Model: imagen-3.0-generate-002
  // Returns base64 image data
  // Convert to data URL or upload to tmp storage and return URL
}
```

Alternatively, use the REST endpoint directly:
```
POST https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict
Header: x-goog-api-key: GEMINI_API_KEY
Body: { "instances": [{ "prompt": "..." }], "parameters": { "sampleCount": 1 } }
```

Run all 4 prompts in parallel. This is the slowest step (15-30s total).

**Important:** Imagen 3 returns base64 image bytes, not URLs. Convert to data URIs for display or write to /tmp and serve via a static route.

**Important:** The frontend should render palette + playlist immediately, then stream in moodboard images as they resolve using individual loading states per image.

### 5. Font Pairing (`lib/fonts.ts`)

Hardcoded lookup table mapping vibe descriptions → Google Fonts pairs:

```typescript
const FONT_MAP: Record<string, { display: string; body: string }> = {
  "warm editorial serif":     { display: "Lora",              body: "Source Sans 3" },
  "brutalist mono":           { display: "JetBrains Mono",    body: "Syne" },
  "editorial display":        { display: "Playfair Display",  body: "Karla" },
  "geometric modern":         { display: "Outfit",            body: "DM Sans" },
  "organic humanist":         { display: "Fraunces",          body: "Nunito" },
  "retro slab":               { display: "Zilla Slab",       body: "Work Sans" },
  "elegant thin":             { display: "Cormorant Garamond",body: "Jost" },
  "technical clean":          { display: "Space Grotesk",     body: "Inter" },
  "playful rounded":          { display: "Baloo 2",           body: "Quicksand" },
  "luxe contrast":            { display: "Bodoni Moda",       body: "Manrope" },
};
```

Gemini's `font_vibe.display` and `font_vibe.body` fields are descriptive strings. Do a fuzzy match against the keys or just pass the exact key options in the Gemini prompt.

To load fonts dynamically, inject a `<link>` tag:
```
https://fonts.googleapis.com/css2?family=Lora:wght@400;700&family=Source+Sans+3:wght@400;600&display=swap
```

### 6. Dynamic Vibe Theming

The results page sets CSS custom properties based on the vibe profile:

```typescript
// In the results page component, after receiving vibe data:
useEffect(() => {
  const root = document.documentElement;
  root.style.setProperty("--vibe-bg", lighten(palette[0], 0.85));
  root.style.setProperty("--vibe-surface", lighten(palette[0], 0.92));
  root.style.setProperty("--vibe-accent", palette[2]);
  root.style.setProperty("--vibe-text", palette[5]);
  root.style.setProperty("--vibe-font-display", fontPair.display);
  root.style.setProperty("--vibe-font-body", fontPair.body);
}, [vibeProfile]);
```

Apply via Tailwind or direct CSS:
```css
.results-page {
  background-color: var(--vibe-bg);
  color: var(--vibe-text);
  font-family: var(--vibe-font-body), sans-serif;
}
.results-page h1, .results-page h2 {
  font-family: var(--vibe-font-display), serif;
  color: var(--vibe-accent);
}
```

For texture overlays (grain, noise), use a pseudo-element with a repeating texture PNG at low opacity on the results container.

### 7. TypeScript Interfaces (`lib/types.ts`)

```typescript
interface VibeProfile {
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
}

interface SpotifyTrack {
  name: string;
  artist: string;
  albumArt: string;
  spotifyUrl: string;
  uri: string;
  // NOTE: preview_url is always null for new Dev Mode apps post-Feb 2026
  // Do NOT build an audio player — just link out to Spotify
}

interface MoodboardImage {
  prompt: string;
  imageData: string; // base64 from Imagen 3, render as data:image/png;base64,...
}

interface VibeResult {
  profile: VibeProfile;
  tracks: SpotifyTrack[];
  moodboard: MoodboardImage[];
  fontPair: { display: string; body: string };
}
```

## UI Notes

- **Landing page:** Minimal. Dark background. Centered upload zone. Drag-drop with a subtle dashed border animation. Short copy: "Film your world. Get its vibe." Subtext: "Upload a 5-30 second video clip."
- **Loading state:** Full-screen takeover. Animated text cycling through: "Reading the room...", "Feeling the light...", "Listening closely...", "Translating the vibe..."
- **Results page:** Three-column layout (palette | playlist | moodboard) with vibe profile summary at top. Everything re-themed dynamically. Tags displayed as pills. Each color swatch is clickable (copies hex). Each track shows album art thumbnail + artist/name + Spotify icon link.
- **Moodboard:** 2x2 grid. Skeleton shimmer loaders until each image resolves. Slight rounded corners, subtle shadow.

## What NOT To Do

- No LangChain or agent frameworks — this is a simple pipeline
- No database — everything is ephemeral, computed per request
- No user auth — no login, no accounts
- No SSR for results — client-side rendering with loading states is fine
- No mobile optimization — desktop-first, worry about responsive later
- Don't block the results page waiting for moodboard images — render palette + playlist first
