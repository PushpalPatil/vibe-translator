"use client";

import type { MoodboardImage } from "@/lib/types";

interface Props {
  images: MoodboardImage[] | null; // null = still loading
}

export default function MoodboardPanel({ images }: Props) {
  return (
    <div className="surface rounded-2xl p-6 space-y-4">
      <h2 className="text-xl font-bold">Moodboard</h2>

      <div className="grid grid-cols-2 gap-3">
        {images === null
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="skeleton aspect-square rounded-xl"
              />
            ))
          : images.map((img, i) => (
              <div
                key={i}
                className="relative aspect-square rounded-xl overflow-hidden shadow-lg"
              >
                <img
                  src={`data:image/png;base64,${img.imageData}`}
                  alt={img.prompt}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
      </div>
    </div>
  );
}
