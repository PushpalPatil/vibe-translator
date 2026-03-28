import { writeFile, unlink } from "fs/promises";
import { randomUUID } from "crypto";
import { join } from "path";
import { analyzeVideo } from "../../../lib/tools/analyzeVideo";

const ACCEPTED_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"] as const;
type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number];

function isAcceptedMimeType(type: string): type is AcceptedMimeType {
  return (ACCEPTED_MIME_TYPES as readonly string[]).includes(type);
}

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
        { error: `Unsupported video type: ${mimeType}. Accepted: ${ACCEPTED_MIME_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const ext = mimeType === "video/mp4" ? "mp4"
      : mimeType === "video/webm" ? "webm"
      : mimeType === "video/quicktime" ? "mov"
      : "avi";

    tmpPath = join("/tmp", `vibe-${randomUUID()}.${ext}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tmpPath, buffer);

    const { analysis } = await analyzeVideo({ videoPath: tmpPath, mimeType });

    return Response.json({ analysis }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";

    // Parse errors from Gemini output get a 422
    if (message.startsWith("Gemini returned non-JSON") || message.startsWith("Gemini response missing")) {
      return Response.json({ error: message }, { status: 422 });
    }

    console.error("[video_analyze]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    if (tmpPath) {
      await unlink(tmpPath).catch(() => {
        // Non-fatal: temp file cleanup failure shouldn't affect the response
      });
    }
  }
}
