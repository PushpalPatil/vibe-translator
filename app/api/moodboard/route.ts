import { generateMoodboard } from "../../../lib/tools/generateMoodboard";
import type { MoodboardHandoff } from "../../../lib/types";

export async function POST(request: Request): Promise<Response> {
  try {
    const handoff: MoodboardHandoff = await request.json();

    // Frontend sends { prompts } (short key); full MoodboardHandoff uses moodboard_prompts.
    // Normalise so the tool always receives the canonical field name.
    if (!handoff.moodboard_prompts?.length) {
      const body = handoff as unknown as Record<string, unknown>;
      if (Array.isArray(body.prompts) && body.prompts.length) {
        handoff.moodboard_prompts = body.prompts as string[];
      } else {
        return Response.json(
          { error: "Missing required field: moodboard_prompts" },
          { status: 400 }
        );
      }
    }

    const { images, layout } = await generateMoodboard({ handoff });

    return Response.json({ images, layout });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";

    if (
      message.startsWith("Gemini returned") ||
      message.startsWith("Failed to parse")
    ) {
      return Response.json({ error: message }, { status: 422 });
    }

    if (message.startsWith("Image gen returned")) {
      return Response.json({ error: message }, { status: 502 });
    }

    console.error("[moodboard]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
