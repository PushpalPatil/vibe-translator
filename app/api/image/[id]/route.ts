import { readFile } from "fs/promises";
import { join } from "path";

// Serves moodboard images written to /tmp by the vibeAgent orchestrator.
// Images are keyed by a {sessionId}-{index} ID generated at generation time.
// Files are named /tmp/vibe-image-{id}.png on disk.
//
// Cleanup is handled by the OS — /tmp is periodically cleared on most systems.
// For production, replace /tmp writes with object storage (S3, GCS, etc.).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  // Reject IDs with path traversal characters — only allow alphanumeric + hyphens
  if (!/^[a-zA-Z0-9-]+$/.test(id)) {
    return new Response("Invalid image ID", { status: 400 });
  }

  const filePath = join("/tmp", `vibe-image-${id}.png`);

  try {
    const buffer = await readFile(filePath);
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        // Cache for 1 hour — images are immutable for their session lifetime
        "Cache-Control": "public, max-age=3600, immutable",
      },
    });
  } catch {
    return new Response("Image not found", { status: 404 });
  }
}
