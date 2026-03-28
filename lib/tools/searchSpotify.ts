import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { getSpotifyToken, searchTrack } from "../spotify";
import { getFlashAgentModel } from "../gemini";
import { SPOTIFY_SEARCH_PROMPT } from "../prompts/spotify-search";
import type { SpotifyHandoff, SpotifyTrack } from "../types";

// --- Input / Output interfaces (agent-importable) ---

export interface SearchSpotifyInput {
  handoff: SpotifyHandoff;
}

export interface SearchSpotifyOutput {
  tracks: SpotifyTrack[];
  rawResponse: string;
}

// --- Tool declaration for Gemini function calling ---

const searchSpotifyDeclaration: FunctionDeclaration = {
  name: "search_spotify",
  description:
    "Search Spotify for a track. Use a query like 'track:Song Name artist:Artist Name' for specific songs, or broader terms like 'chill indie folk' for discovery. Returns the top match or null if nothing found.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "The search query string",
      },
    },
    required: ["query"],
  },
};

const MAX_ITERATIONS = 20;

// Core tool function: receives a SpotifyHandoff from the video agent and runs
// a Gemini-powered agent loop that searches Spotify to build a curated playlist.
//
// Designed to be importable directly by an orchestrating agent without HTTP.
// The route handler at app/api/spotify/route.ts is a thin wrapper.
export async function searchSpotify(
  input: SearchSpotifyInput
): Promise<SearchSpotifyOutput> {
  const { handoff } = input;

  const model = getFlashAgentModel({
    model: "gemini-3-flash-preview",
    systemInstruction: SPOTIFY_SEARCH_PROMPT.template,
    tools: [{ functionDeclarations: [searchSpotifyDeclaration] }],
  });

  const token = await getSpotifyToken();

  const userMessage = `Here's the vibe profile from the video analysis:

Mood: ${handoff.mood.join(", ")}
Energy: ${handoff.energy}/1.0
Era: ${handoff.era}
Genre hints: ${handoff.genre_hints.join(", ")}
Narrative: ${handoff.mood_narrative}

Suggested songs:
${handoff.song_suggestions.map((s) => `- "${s.track}" by ${s.artist} (${s.why})`).join("\n")}

Find me 6-8 real Spotify tracks that match this vibe. Search the suggestions first, then fill gaps with discovery searches.`;

  const chat = model.startChat();
  let response = await chat.sendMessage(userMessage);
  let iterations = 0;

  // Agent loop: keep going while the model wants to call tools
  while (iterations < MAX_ITERATIONS) {
    const candidate = response.response.candidates?.[0];
    if (!candidate) break;

    const functionCalls = candidate.content.parts.filter(
      (p) => "functionCall" in p
    );

    if (functionCalls.length === 0) break;

    const functionResponses = await Promise.all(
      functionCalls.map(async (part) => {
        const fc = "functionCall" in part ? part.functionCall : null;
        if (!fc) return null;

        const query = (fc.args as { query: string }).query;
        const result = await searchTrack(token, query);

        return {
          functionResponse: {
            name: fc.name,
            response: {
              result: result
                ? {
                    found: true,
                    name: result.name,
                    artist: result.artist,
                    albumArt: result.albumArt,
                    spotifyUrl: result.spotifyUrl,
                    uri: result.uri,
                  }
                : { found: false, query },
            },
          },
        };
      })
    );

    const validResponses = functionResponses.filter(
      (r): r is NonNullable<typeof r> => r !== null
    );

    if (validResponses.length === 0) break;

    response = await chat.sendMessage(validResponses);
    iterations++;
  }

  // Extract the final text response
  const rawResponse =
    response.response.candidates?.[0]?.content.parts
      .filter((p) => "text" in p)
      .map((p) => ("text" in p ? p.text : ""))
      .join("") ?? "";

  if (!rawResponse) {
    throw new Error("Gemini returned no text response after agent loop");
  }

  // Parse JSON from response (handle markdown code blocks)
  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(
      `Gemini returned non-JSON response: ${rawResponse.slice(0, 200)}`
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(
      `Failed to parse Gemini JSON: ${rawResponse.slice(0, 200)}`
    );
  }

  const tracks: SpotifyTrack[] = (
    (parsed as { tracks?: SpotifyTrack[] }).tracks ?? []
  ).slice(0, 8);

  return { tracks, rawResponse };
}
