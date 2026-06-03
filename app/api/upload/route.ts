import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

// Client-upload token handler. The browser calls upload() (from
// @vercel/blob/client) against this route to obtain a short-lived token, then
// uploads the video directly to Vercel Blob — bypassing the 4.5MB serverless
// request-body limit that the multipart-to-/api/vibe flow used to hit.
//
// Requires BLOB_READ_WRITE_TOKEN in the environment (auto-injected on Vercel
// when a Blob store is linked; pull locally via `vercel env pull`).

const ACCEPTED_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
];

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ACCEPTED_MIME_TYPES,
        // Generous ceiling so legitimate clips pass; the real upload still goes
        // straight to Blob storage, not through this function.
        maximumSizeInBytes: 100 * 1024 * 1024, // 100MB
        addRandomSuffix: true,
      }),
      // Fires only when Blob has a public callback URL (i.e. on deployed Vercel,
      // not localhost). We clean the blob up in /api/vibe after processing, so
      // there's nothing to do here.
      onUploadCompleted: async () => {},
    });

    return Response.json(jsonResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload token error";
    return Response.json({ error: message }, { status: 400 });
  }
}
