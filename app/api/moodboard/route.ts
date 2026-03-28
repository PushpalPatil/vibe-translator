import { generateMoodboard } from "../../../lib/tools/generateMoodboard";
import type { MoodboardHandoff } from "../../../lib/types";

export async function POST(request: Request): Promise<Response> {
  try {
    const handoff: MoodboardHandoff = await request.json();

    if (!handoff.moodboard_prompts?.length) {
      return Response.json(
        { error: "Missing required field: moodboard_prompts" },
        { status: 400 }
      );
    }

    const { images } = await generateMoodboard({ handoff });

    return Response.json({ images });
  } catch (err) {
    console.error("[moodboard]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
