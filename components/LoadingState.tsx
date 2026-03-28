"use client";

import { useEffect, useState } from "react";

const MESSAGES: { text: string; font: string; weight?: number; style?: string }[] = [
  { text: "Reading the room...",        font: "'Playfair Display', serif", weight: 700 },
  { text: "Feeling the light...",       font: "'Courier New', monospace", weight: 400 },
  { text: "Listening closely...",       font: "'Brush Script MT', 'Segoe Script', cursive", style: "italic" },
  { text: "Translating the vibe...",    font: "'Impact', 'Arial Black', sans-serif", weight: 900 },
  { text: "Mixing the palette...",      font: "'Papyrus', 'Herculanum', fantasy" },
  { text: "Curating the soundtrack...", font: "'Inter', sans-serif", weight: 300 },
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
    <div className="editorial-page min-h-screen w-full flex flex-col items-center justify-center gap-10 text-center">
      {/* Thin animated line */}
      <div className="w-20 h-px bg-[#111] overflow-hidden relative">
        <div
          className="absolute inset-0 bg-[#111]"
          style={{
            animation: "loading-slide 2s ease-in-out infinite",
          }}
        />
      </div>

      <p
        key={index}
        className="text-[#111] text-3xl font-light tracking-wide"
        style={{
          fontFamily: MESSAGES[index].font,
          fontWeight: MESSAGES[index].weight ?? 400,
          fontStyle: MESSAGES[index].style ?? "normal",
          animation: "fadeInOut 2.5s ease-in-out",
        }}
      >
        {MESSAGES[index].text}
      </p>

      {/* Subtle subtext */}
      <p className="editorial-subhead text-[0.65rem] text-[#aaa]">
        This may take a moment
      </p>
    </div>
  );
}
