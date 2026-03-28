"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Reading the room...",
  "Feeling the light...",
  "Listening closely...",
  "Translating the vibe...",
  "Mixing the palette...",
  "Curating the soundtrack...",
];

export default function LoadingState() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-8">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-ping" />
        <div className="absolute inset-2 rounded-full border-2 border-purple-400/50 animate-pulse" />
        <div className="absolute inset-4 rounded-full bg-purple-500/20 animate-pulse" />
      </div>

      <p
        key={index}
        className="text-white/70 text-lg font-light"
        style={{
          animation: "fadeInOut 2.5s ease-in-out",
        }}
      >
        {MESSAGES[index]}
      </p>
    </div>
  );
}
