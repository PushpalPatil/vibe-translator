# Spotify Agent Endpoint — Implementation Plan

## What we're building
An agentic Spotify endpoint (`POST /api/spotify`) powered by Gemini Flash with function calling. Instead of a dumb pipeline that searches and returns, the LLM reasons about the vibe, searches Spotify, evaluates results, and refines queries until it has a solid playlist.

## Files to create/modify

### 1. Create `lib/spotify.ts` — Spotify API helpers
- `getSpotifyToken()` — Client Credentials auth, returns access token
- `searchSpotify(token, query)` — calls `/v1/search?type=track`, returns simplified track objects
- Token caching (in-memory, re-fetch on expiry)

### 2. Replace `app/api/spotify/route.ts` — Agentic endpoint
- Receives the handoff: `{ mood, energy, era, genre_hints, mood_narrative, song_suggestions }`
- Creates Gemini Flash client with one tool: `search_spotify`
- System prompt: "You are a music curator. Given a vibe profile, find 6-8 real Spotify tracks that match. Search the suggested songs first. If they don't exist, use mood/genre/era to find alternatives. Stop when you have 6-8 verified tracks."
- Agentic loop (max 15 iterations to cap costs):
  1. Gemini decides what to search
  2. We execute `search_spotify`, return results
  3. Gemini evaluates — searches more or finishes
  4. On final turn, Gemini returns the curated track list
- Returns `{ tracks: SpotifyTrack[] }`

### 3. Update `lib/types.ts` — Add handoff interface + genre_hints
- Add `genre_hints: string[]` to `VibeProfile`
- Add `SpotifyHandoff` interface (the request body shape)
- Keep `SpotifySeedAttributes` for now (teammate's video agent may still generate it; we just won't use it for Spotify)

### 4. Update `app/results/page.tsx` — Send new handoff fields
- Change the `/api/spotify` fetch body from `{ suggestions, spotifySeedAttributes }` to:
  ```json
  {
    "mood": profile.mood,
    "energy": profile.energy,
    "era": profile.era,
    "genre_hints": profile.genre_hints,
    "mood_narrative": profile.mood_narrative,
    "song_suggestions": profile.song_suggestions
  }
  ```

## Architecture

```
Frontend (results page)
  │
  │  POST /api/spotify  { mood, energy, era, genre_hints, mood_narrative, song_suggestions }
  ▼
route.ts
  │
  │  Creates Gemini Flash chat with tools
  ▼
┌─────────────────────────────────┐
│  Gemini Flash (Spotify Agent)   │
│  System: "You are a music       │
│  curator..."                    │
│                                 │
│  Tool: search_spotify(query)    │
│         ↓           ↑           │
│    Execute search   Return      │
│    via Spotify API  results     │
│                                 │
│  Agent loop (max 15 turns)      │
│  → Search suggested songs       │
│  → Evaluate results             │
│  → Search alternatives if needed│
│  → Return final 6-8 tracks      │
└─────────────────────────────────┘
  │
  │  { tracks: SpotifyTrack[] }
  ▼
Frontend renders PlaylistPanel
```

## Not doing
- No `score_match` or `refine_query` tools — the LLM handles scoring/refinement through reasoning
- No Recommendations API (deprecated)
- No audio preview player (preview_url is null)
- Not touching the video_analyze endpoint (teammate's work)
- Not touching the moodboard endpoint
