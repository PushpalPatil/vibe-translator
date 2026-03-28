# Vibe Translator — New Project Guide (Frontend + Python Backend)

> For the old monolithic Next.js walkthrough, see `OLD_PROJECT_WALKTHROUGH.md`.

---

## What Changed

The backend was stripped out of the Next.js project. All server-side logic (Gemini API calls, Spotify integration, image generation, video processing) is being rebuilt in Python as a separate service.

**What was removed:**
- `app/api/` — all 3 API route handlers
- `lib/gemini.ts`, `lib/spotify.ts`, `lib/imagegen.ts`, `lib/ffmpeg.ts` — all server-side logic
- `@google/generative-ai`, `fluent-ffmpeg` — server-only npm packages

**Backups** of all removed files are at `Desktop/Hackathons/vibeTranslatorBackup/`.

**What remains** is a pure frontend: React pages, components, styles, and two utility files (`lib/types.ts` for type definitions, `lib/fonts.ts` for font matching).

---

## Current Project Structure

```
vibe-translator-test/
├── app/
│   ├── layout.tsx              # Root layout (wraps every page)
│   ├── page.tsx                # Landing page — video upload UI
│   ├── results/
│   │   └── page.tsx            # Results page — 3-panel display + dynamic theming
│   └── globals.css             # Styles, CSS variables, animations
├── components/
│   ├── VideoUploader.tsx       # Drag-drop + file picker
│   ├── VibeProfile.tsx         # Summary, tags, mood, energy bar
│   ├── PalettePanel.tsx        # Color swatches + font preview
│   ├── PlaylistPanel.tsx       # Track list with album art + Spotify links
│   ├── MoodboardPanel.tsx      # 2x2 image grid with skeleton loaders
│   └── LoadingState.tsx        # "Reading the room..." animation
├── lib/
│   ├── types.ts                # TypeScript interfaces (shared data contracts)
│   └── fonts.ts                # Font pairing lookup + Google Fonts URL builder
├── package.json
├── next.config.ts
├── tsconfig.json
└── .env.local                  # (not committed)
```

---

## How the Frontend and Backend Connect

The Next.js frontend makes 3 API calls. Right now these hit `/api/*` paths — the Python backend needs to serve these. There are two ways to wire it up:

### Option A: Next.js Proxy (Recommended — no CORS needed)

Add rewrites to `next.config.ts` so `/api/*` routes forward to the Python server:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://localhost:8000/:path*" },
    ];
  },
};

export default nextConfig;
```

With this, the frontend code doesn't change at all. Requests to `/api/analyze` are transparently proxied to `http://localhost:8000/analyze`.

### Option B: Direct Calls (Requires CORS)

Change the fetch URLs in `app/page.tsx` and `app/results/page.tsx` to point directly at the Python server (e.g., `http://localhost:8000/analyze`). The Python server must return CORS headers (`Access-Control-Allow-Origin`, etc.).

---

## API Contract — What the Frontend Expects

The frontend is already built and makes these 3 calls. The Python backend must match these request/response shapes exactly.

### 1. `POST /api/analyze`

**Called by:** `app/page.tsx` (line 21)

**Request:** `multipart/form-data` with a single field `video` containing the video file.

**Response:**
```json
{
  "profile": { <VibeProfile object — see full schema below> },
  "fontPair": { "display": "Space Grotesk", "body": "Inter" }
}
```

The frontend stores this entire response in `sessionStorage` and navigates to `/results`.

---

### 2. `POST /api/spotify`

**Called by:** `app/results/page.tsx` (line 40)

**Request:**
```json
{
  "suggestions": [
    { "artist": "Radiohead", "track": "Everything In Its Right Place", "why": "..." },
    ...
  ],
  "spotifySeedAttributes": {
    "target_valence": 0.35,
    "target_energy": 0.72,
    "target_tempo_bpm": 128,
    "target_danceability": 0.45
  }
}
```

**Response:**
```json
{
  "tracks": [
    {
      "name": "Everything In Its Right Place",
      "artist": "Radiohead",
      "albumArt": "https://i.scdn.co/image/...",
      "spotifyUrl": "https://open.spotify.com/track/...",
      "uri": "spotify:track:abc123"
    },
    ...
  ]
}
```

The frontend reads `response.tracks` — if the field is missing or the call fails, it shows an empty state.

---

### 3. `POST /api/moodboard`

**Called by:** `app/results/page.tsx` (line 52)

**Request:**
```json
{
  "prompts": [
    "a dreamy pastel landscape with soft fog...",
    "close-up of rain on a window at dusk...",
    "abstract watercolor in deep indigo and coral...",
    "vintage film still of an empty highway..."
  ]
}
```

**Response:**
```json
{
  "images": [
    {
      "prompt": "a dreamy pastel landscape with soft fog...",
      "imageData": "<base64-encoded PNG string>"
    },
    ...
  ]
}
```

The frontend renders images as `<img src="data:image/png;base64,{imageData}" />`. If the call fails, it shows an empty state.

---

## VibeProfile Schema (Full)

This is what the `/api/analyze` endpoint must return inside `response.profile`. The frontend components read every field listed here.

```python
{
    "summary": str,                    # 2-3 sentence vibe description
    "mood": [str],                     # 3-5 mood descriptors
    "energy": float,                   # 0.0 - 1.0
    "era": str,                        # e.g. "90s nostalgia", "chaotic gen-z"
    "dominant_colors": [
        {"hex": str, "name": str}      # up to 5
    ],
    "suggested_palette": [str],        # exactly 6 hex codes, dark to light
    "textures": [str],                 # 2-3 texture descriptions
    "sounds": [str],                   # 2-3 sound descriptions
    "font_vibe": {
        "display": str,               # key from font map (see below)
        "body": str                    # same value as display
    },
    "song_suggestions": [
        {
            "artist": str,
            "track": str,
            "why": str
        }                              # 8-10 real songs
    ],
    "moodboard_prompts": [str],        # exactly 4 image generation prompts
    "tags": [str],                     # 5-8 short vibe tags
    "vad_scores": {
        "valence": float,              # 0-1, emotional positivity
        "arousal": float,              # 0-1, emotional intensity
        "dominance": float             # 0-1, sense of control
    },
    "primary_emotion": str,            # e.g. "frustration", "euphoria"
    "secondary_emotions": [str],       # 2-3 secondary emotions
    "temporal_pattern": str,           # one of: STABLE, BUILDING, DECLINING, OSCILLATING, PEAK_AND_FADE
    "confidence": float,               # 0-1
    "dominant_modality": str,          # one of: visual, auditory, mixed
    "mood_narrative": str,             # 1-2 sentence musical atmosphere description
    "spotify_seed_attributes": {
        "target_valence": float,       # 0-1
        "target_energy": float,        # 0-1
        "target_tempo_bpm": int,       # BPM (60-200)
        "target_danceability": float   # 0-1
    }
}
```

### Font Vibe Options

The `font_vibe.display` and `font_vibe.body` fields must be one of these keys. The frontend maps them to actual Google Fonts:

| Key | Display Font | Body Font |
|-----|-------------|-----------|
| `warm editorial serif` | Lora | Source Sans 3 |
| `brutalist mono` | JetBrains Mono | Syne |
| `editorial display` | Playfair Display | Karla |
| `geometric modern` | Outfit | DM Sans |
| `organic humanist` | Fraunces | Nunito |
| `retro slab` | Zilla Slab | Work Sans |
| `elegant thin` | Cormorant Garamond | Jost |
| `technical clean` | Space Grotesk | Inter |
| `playful rounded` | Baloo 2 | Quicksand |
| `luxe contrast` | Bodoni Moda | Manrope |

If the value doesn't match any key, the frontend defaults to `Space Grotesk` / `Inter`.

---

## Font Pair Matching

The `/api/analyze` response must also include a top-level `fontPair` field:

```json
{
  "profile": { ... },
  "fontPair": { "display": "Lora", "body": "Source Sans 3" }
}
```

This is the **resolved** Google Font name (not the vibe key). Use the table above to map `font_vibe.display` → the actual font names. The frontend uses `fontPair` to load fonts from Google Fonts CDN and apply them to the page.

---

## Error Handling

On errors, the frontend checks `res.ok` and reads `response.error`. Return errors as:

```json
{
  "error": "Human-readable error message"
}
```

with an appropriate HTTP status code (400, 500, etc.).

---

## Environment Variables

The Python backend will need:

```env
GEMINI_API_KEY=           # Google Gemini + Imagen 3 (same key)
SPOTIFY_CLIENT_ID=        # Spotify Client Credentials
SPOTIFY_CLIENT_SECRET=
```

---

## Running the Frontend

```bash
cd vibe-translator-test
npm install
npm run dev              # starts on http://localhost:3000
```

If using the proxy approach (Option A), the Python backend should run on `http://localhost:8000`.

---

## Reference

- **Old backend code** (TypeScript): `Desktop/Hackathons/vibeTranslatorBackup/`
- **Gemini prompt**: saved in the backup at `vibeTranslatorBackup/lib/gemini.ts` (the prompt string starts at the `const prompt = ...` line)
- **Old full project walkthrough**: `OLD_PROJECT_WALKTHROUGH.md` in this repo
