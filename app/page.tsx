"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import VideoUploader from "@/components/VideoUploader";
import LoadingState from "@/components/LoadingState";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      // Upload the video directly to Vercel Blob (bypasses the 4.5MB serverless
      // body limit), then hand /api/vibe just the resulting URL.
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        contentType: file.type,
      });

      const res = await fetch("/api/vibe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: blob.url, mimeType: file.type }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }

      const data = await res.json();

      sessionStorage.setItem("vibeResult", JSON.stringify(data));
      router.push("/results");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setIsLoading(false);
    }
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="editorial-page flex flex-col items-center justify-center min-h-screen px-8 py-16">
      <main className="flex flex-col items-center gap-15 max-w-md w-full">
        {/* Overline label */}
        <p className="editorial-subhead">Vibe Translator</p>

        {/* Headline */}
        <div className="text-center space-y-3">
          <h1 className="editorial-headline text-6xl">
            Film your world.
          </h1>
          <h1 className="editorial-headline text-6xl">
            Get its <span className="editorial-italic">vibe.</span>
          </h1>
        </div>

        {/* Divider */}
        <div className="editorial-rule" />

        {/* Description */}
        <p className="editorial-body text-center text-base leading-relaxed max-w-xs text-xl">
          Upload a short clip and we&apos;ll translate the feeling into
          color, sound, and mood.
        </p>

        <VideoUploader onUpload={handleUpload} isLoading={isLoading} />

        {error && (
          <p className="text-red-600 text-sm text-center editorial-body">
            {error}
          </p>
        )}
      </main>
    </div>
  );
}
