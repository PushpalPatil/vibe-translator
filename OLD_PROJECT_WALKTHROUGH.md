# Vibe Translator — Project Walkthrough

A complete technical rundown of the codebase for anyone unfamiliar with Next.js or TypeScript full-stack development.

---

## The Big Picture

This is a **Next.js 16** project using the **App Router**. The single most important thing to understand: **Next.js blurs the line between frontend and backend**. The same codebase, same language (TypeScript), same `npm run dev` command serves both the website your user sees AND the API endpoints the website calls. There is no separate Express server or Python backend.

---

## How Next.js Routing Works (File = Route)

Next.js uses **file-system routing**. The folder structure under `app/` directly maps to URLs:

```
app/
├── page.tsx                →  GET  http://localhost:3000/
├── results/
│   └── page.tsx            →  GET  http://localhost:3000/results
├── api/
│   ├── analyze/
│   │   └── route.ts        →  POST http://localhost:3000/api/analyze
│   ├── spotify/
│   │   └── route.ts        →  POST http://localhost:3000/api/spotify
│   └── moodboard/
│       └── route.ts        →  POST http://localhost:3000/api/moodboard
```

- **`page.tsx`** files = **frontend pages** (React components that render HTML in the browser)
- **`route.ts`** files = **backend API endpoints** (server-side functions that handle HTTP requests, like an Express route handler)

No manual routing config anywhere. Drop a file in the right folder and it just works.

---

## Frontend vs. Backend — How to Tell

| Marker | Meaning | Runs where |
|--------|---------|------------|
| `"use client"` at top of file | React component, runs in the **browser** | Client |
| `route.ts` exporting `POST`/`GET` | API handler, runs on the **server** | Server (Node.js) |
| Files in `lib/` | Utility code, imported by API routes | Server (Node.js) |
| Files in `components/` | React components | Client (browser) |

---

## The Full Architecture

```
┌─────────────────────────────────────────────────────────┐
│  BROWSER (Client)                                       │
│                                                         │
│  app/page.tsx ──────► app/results/page.tsx               │
│  (upload UI)          (3-panel results display)          │
│       │                    │           │                 │
│  components/          components/  components/           │
│  VideoUploader.tsx    PalettePanel  PlaylistPanel        │
│  LoadingState.tsx     VibeProfile   MoodboardPanel       │
└────────┬───────────────────┼───────────┼────────────────┘
         │ FormData          │ JSON      │ JSON
         ▼                   ▼           ▼
┌─────────────────────────────────────────────────────────┐
│  SERVER (Node.js, same process)                         │
│                                                         │
│  /api/analyze/route.ts   /api/spotify/route.ts          │
│       │                       │                         │
│  lib/ffmpeg.ts           lib/spotify.ts                 │
│  lib/gemini.ts           (Spotify API)                  │
│  lib/fonts.ts                                           │
│                          /api/moodboard/route.ts        │
│                               │                         │
│                          lib/imagegen.ts                 │
│                          (Imagen 3 API)                  │
└─────────────────────────────────────────────────────────┘
         │                       │                │
         ▼                       ▼                ▼
   Google Gemini API      Spotify Web API    Imagen 3 API
```

---

## File-by-File Walkthrough

### Config Files (project root)

**`package.json`** — Dependencies and scripts. `npm run dev` starts the dev server, `npm run build` compiles for production. Key deps:
- `next`, `react`, `react-dom` — the framework
- `@google/generative-ai` — Google's SDK for calling Gemini and Imagen
- `fluent-ffmpeg` — Node.js wrapper for ffmpeg (video processing)
- `tailwindcss` — utility-first CSS framework

**`tsconfig.json`** — TypeScript config. The important bit is `"paths": { "@/*": ["./*"] }` which lets you write `import { foo } from "@/lib/bar"` instead of `"../../../lib/bar"`. The `@/` always means "project root".

**`next.config.ts`** — `serverExternalPackages: ["fluent-ffmpeg"]` tells Next.js not to bundle ffmpeg into the browser bundle (it's server-only, it calls a system binary).

---

### `app/layout.tsx` — The Shell

This wraps **every page**. It sets up:
- The `<html>` and `<body>` tags
- Default fonts (Geist Sans/Mono)
- Page title and metadata
- Imports `globals.css`

Every page component renders inside `{children}`.

---

### `app/globals.css` — Styles

Defines CSS custom properties (variables) like `--vibe-bg`, `--vibe-accent`, `--vibe-font-display`. These start with dark defaults, then get **overwritten at runtime** by JavaScript on the results page to match the detected vibe. Also defines keyframe animations for the loading spinner, skeleton shimmers, and upload zone pulse.

---

### `app/page.tsx` — Landing Page (Frontend)

The homepage. Marked `"use client"` so it runs in the browser. Flow:
1. Renders `<VideoUploader>` component
2. User selects a video file
3. `handleUpload()` fires: wraps the file in `FormData`, POSTs to `/api/analyze`
4. On success, stores the full JSON response in `sessionStorage` (browser-only key-value store, survives page navigation but not tab close)
5. `router.push("/results")` navigates to the results page

---

### `app/results/page.tsx` — Results Page (Frontend)

Also `"use client"`. On mount:
1. Reads the vibe data from `sessionStorage` (if missing, redirects back to `/`)
2. Immediately renders the `VibeProfile` summary + `PalettePanel`
3. Fires **two parallel fetch calls** to `/api/spotify` and `/api/moodboard` — these are independent so they run simultaneously
4. As each resolves, updates state and the corresponding panel renders
5. A second `useEffect` applies **dynamic theming** — it overwrites the CSS variables (`--vibe-bg`, `--vibe-accent`, etc.) on `document.documentElement` so the entire page re-colors itself to match the video's vibe. It also injects a Google Fonts `<link>` tag to load the matched font pair.

---

### `components/` — UI Building Blocks

All marked `"use client"`. These are pure presentation components:

- **`VideoUploader.tsx`** — Drag-and-drop zone + file picker. Shows a video preview after selection. Calls `onUpload(file)` when the user clicks "Translate the Vibe".
- **`LoadingState.tsx`** — Full-screen overlay with animated rings and cycling text ("Reading the room...", "Feeling the light...", etc.). Cycles every 2.5s.
- **`VibeProfile.tsx`** — Displays the summary, era, energy bar, mood pills, and hashtag tags.
- **`PalettePanel.tsx`** — 6 color swatches (clickable to copy hex), font pairing preview with specimen text.
- **`PlaylistPanel.tsx`** — Track list with album art, artist/title, Spotify icon link. Shows skeleton shimmers while loading.
- **`MoodboardPanel.tsx`** — 2x2 grid of AI-generated images. Shows skeleton shimmers while loading, then renders base64 images as `data:image/png;base64,...` src.

---

### `app/api/analyze/route.ts` — The Main Backend Endpoint

This is server-side Node.js code. When the frontend POSTs a video:
1. Reads the `FormData`, extracts the video `File` object
2. Writes raw bytes to a temp directory (`/tmp/vibe-<uuid>/input.mp4`)
3. Calls `analyzeVibe()` from `lib/gemini.ts` — this is the Gemini multimodal call
4. Calls `matchFontPair()` from `lib/fonts.ts` — maps Gemini's font description to actual Google Fonts names
5. Returns `{ profile, fontPair }` as JSON
6. In `finally`, cleans up the temp directory

---

### `lib/gemini.ts` — Gemini Multimodal AI Call

The core AI integration:
1. Uploads the video to Google's servers via `GoogleAIFileManager.uploadFile()` — Google needs the file on their end to process video
2. Polls every 2 seconds until Google finishes processing the video (transcoding, frame extraction, audio extraction — all on their side)
3. Calls `gemini-2.5-flash` with two parts: the video file reference + a long structured prompt
4. The prompt asks Gemini to analyze the video (visuals, audio, body language, emotions, temporal arc) and return a structured JSON object with ~20 fields: mood, colors, font style, song suggestions, moodboard prompts, VAD emotional scores, Spotify audio feature targets, etc.
5. `responseMimeType: "application/json"` constrains Gemini to valid JSON output
6. Parses the response and returns a typed `VibeProfile` object

---

### `lib/spotify.ts` — Spotify Integration (Two-Tier Pipeline)

Server-side. Does **not** require user login (Client Credentials flow = app-level access).

**Auth:** POSTs to Spotify's token endpoint with Base64-encoded `client_id:client_secret`. Caches the token in memory.

**Tier 1 (Seed Discovery):** Takes 5 of Gemini's song suggestions, searches each on Spotify in parallel via `Promise.allSettled`. Filters out hallucinated songs that don't exist. The survivors become "seed tracks".

**Tier 2 (Recommendations API):** Takes up to 3 seed track IDs + the `spotify_seed_attributes` from Gemini (target_valence, target_energy, target_danceability, target_tempo). Calls `GET /v1/recommendations` — Spotify's algorithm finds tracks similar to the seeds that also match the emotional profile numerically.

Merges both sets, deduplicates by Spotify URI, returns up to 8 tracks. Falls back to Tier 1 only if the recommendations call fails.

---

### `app/api/spotify/route.ts` — Spotify API Route

Thin server-side wrapper. Receives `{ suggestions, spotifySeedAttributes }` from the frontend, passes both to `buildPlaylist()`, returns the tracks.

---

### `lib/imagegen.ts` — Imagen 3 Image Generation

Calls Google's Imagen 3 model via REST API. For each of the 4 moodboard prompts, sends a POST to the `imagen-3.0-generate-002:predict` endpoint. Runs all 4 in parallel via `Promise.allSettled`. Returns base64-encoded PNG data.

---

### `app/api/moodboard/route.ts` — Moodboard API Route

Receives `{ prompts }` from the frontend, calls `generateMoodboard()`, returns the base64 images.

---

### `lib/ffmpeg.ts` — Video File Utilities

Provides `createTempDir()` (makes `/tmp/vibe-<uuid>/`) and `cleanupTempDir()` (deletes it). Also has `extractFrames()` and `extractAudio()` functions using ffmpeg, though the current flow sends the full video to Gemini instead of pre-extracting.

---

### `lib/fonts.ts` — Font Matching

A hardcoded lookup table mapping vibe descriptions (like "brutalist mono", "elegant thin") to Google Fonts pairs (display + body). Gemini picks a vibe key, `matchFontPair()` does fuzzy matching against the table. `buildGoogleFontsUrl()` constructs the Google Fonts CDN URL to load the chosen fonts.

---

### `lib/types.ts` — Shared TypeScript Interfaces

Defines the data shapes used across both frontend and backend:
- `VibeProfile` — everything Gemini returns (mood, colors, songs, VAD scores, etc.)
- `SpotifySeedAttributes` — the 4 numeric audio feature targets
- `SpotifyTrack` — a verified Spotify track with name, artist, album art, URI
- `MoodboardImage` — prompt + base64 image data
- `VibeResult` — the combined result object

---

## Data Flow (End to End)

```
1. User drops video → browser sends FormData to /api/analyze
2. Server writes to /tmp, uploads to Gemini File API
3. Gemini watches video, returns VibeProfile JSON
4. Server matches fonts, returns { profile, fontPair } to browser
5. Browser stores in sessionStorage, navigates to /results
6. Results page reads sessionStorage, renders profile + palette immediately
7. Simultaneously fires:
   a. POST /api/spotify  → searches songs + calls recommendations API → returns tracks
   b. POST /api/moodboard → generates 4 images via Imagen 3 → returns base64
8. As each resolves, the corresponding panel renders
9. CSS variables get overwritten → entire page re-themes to match the vibe
```

---

## Running It

```bash
npm install          # install dependencies
npm run dev          # starts dev server on http://localhost:3000
npm run build        # compiles for production (also type-checks)
```

Requires a `.env.local` file at the project root with:

```env
GEMINI_API_KEY=your_google_api_key
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```
