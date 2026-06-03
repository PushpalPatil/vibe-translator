import { writeFile, unlink } from "fs/promises";
import { randomUUID } from "crypto";
import { join } from "path";
import { del } from "@vercel/blob";
import { runVibeAgent, type AcceptedMimeType, type VibeAgentResult } from "../../../lib/agents/vibeAgent";

// The full pipeline (Gemini analysis + Spotify + 4x Imagen) can take 30-60s.
// Vercel's default function timeout is 10s; raise it to the Hobby-plan ceiling.
export const maxDuration = 60;

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
  let blobUrl: string | null = null;

  try {
    const { url, mimeType: rawMimeType } = (await request.json()) as {
      url?: string;
      mimeType?: string;
    };

    if (!url) {
      return Response.json(
        { error: "Missing required field: url (Blob upload URL)" },
        { status: 400 }
      );
    }
    blobUrl = url;

    const mimeType = rawMimeType || "video/mp4";
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

    const videoRes = await fetch(url);
    if (!videoRes.ok) {
      return Response.json(
        { error: "Failed to fetch uploaded video from storage" },
        { status: 502 }
      );
    }
    const buffer = Buffer.from(await videoRes.arrayBuffer());
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
    if (blobUrl) {
      // Remove the uploaded video from Blob storage once processed, so we don't
      // accumulate orphaned files. Non-fatal if it fails.
      await del(blobUrl).catch(() => {});
    }
  }
}
