"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
      const formData = new FormData();
      formData.append("video", file);

      const res = await fetch("/api/video_analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }

      const data = await res.json();

      // Store in sessionStorage for the results page
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
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-black px-6">
      <main className="flex flex-col items-center gap-8 max-w-lg w-full">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Film your world.
            <br />
            <span className="text-purple-400">Get its vibe.</span>
          </h1>
          <p className="text-white/40 text-sm">
            Upload a 5-30 second video clip.
          </p>
        </div>

        <VideoUploader onUpload={handleUpload} isLoading={isLoading} />

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}
      </main>
    </div>
  );
}
