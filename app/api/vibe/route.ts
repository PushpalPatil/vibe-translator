import { writeFile, unlink } from "fs/promises";
import { randomUUID } from "crypto";
import { join } from "path";
import { runVibeAgent, type AcceptedMimeType, type VibeAgentResult } from "../../../lib/agents/vibeAgent";

const ACCEPTED_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
] as const;

function isAcceptedMimeType(type: string): type is AcceptedMimeType {
  return (ACCEPTED_MIME_TYPES as readonly string[]).includes(type);
}

// Unified endpoint: accepts a video file, runs the full vibe pipeline
// (video analysis → spotify search + moodboard generation in parallel),
// and returns a complete VibeResult in a single response.
//
// The existing /api/video_analyze, /api/spotify, and /api/moodboard endpoints
// are unchanged and continue to work independently.
export async function POST(request: Request): Promise<Response> {
  let tmpPath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("video");

    if (!file || !(file instanceof File)) {
      return Response.json(
        { error: "Missing required field: video (must be a file)" },
        { status: 400 }
      );
    }

    const mimeType = file.type || "video/mp4";
    if (!isAcceptedMimeType(mimeType)) {
      return Response.json(
        {
          error: `Unsupported video type: ${mimeType}. Accepted: ${ACCEPTED_MIME_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const ext =
      mimeType === "video/mp4"
        ? "mp4"
        : mimeType === "video/webm"
          ? "webm"
          : mimeType === "video/quicktime"
            ? "mov"
            : "avi";

    tmpPath = join("/tmp", `vibe-${randomUUID()}.${ext}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tmpPath, buffer);

    const result: VibeAgentResult = await runVibeAgent(tmpPath, mimeType);

    return Response.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";

    if (
      message.startsWith("Gemini returned non-JSON") ||
      message.startsWith("Gemini response missing")
    ) {
      return Response.json({ error: message }, { status: 422 });
    }

    if (message.startsWith("Spotify auth failed")) {
      return Response.json({ error: message }, { status: 502 });
    }

    if (message.startsWith("Image gen returned")) {
      return Response.json({ error: message }, { status: 502 });
    }

    console.error("[vibe]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    if (tmpPath) {
      await unlink(tmpPath).catch(() => {
        // Non-fatal: temp file cleanup failure shouldn't affect the response
      });
    }
  }
}
