import { searchSpotify } from "../../../lib/tools/searchSpotify";
import type { SpotifyHandoff } from "../../../lib/types";

export async function POST(request: Request): Promise<Response> {
  try {
    const handoff: SpotifyHandoff = await request.json();

    // Validate required fields
    if (!handoff.mood?.length || !handoff.song_suggestions?.length) {
      return Response.json(
        { error: "Missing required fields: mood, song_suggestions" },
        { status: 400 }
      );
    }

    const { tracks } = await searchSpotify({ handoff });

    return Response.json({ tracks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";

    if (
      message.startsWith("Gemini returned") ||
      message.startsWith("Failed to parse")
    ) {
      return Response.json({ error: message }, { status: 422 });
    }

    if (message.startsWith("Spotify auth failed")) {
      return Response.json({ error: message }, { status: 502 });
    }

    console.error("[spotify]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
