"use client";

import { useState } from "react";

interface Props {
  palette: string[];
  fontPair: { display: string; body: string };
}

export default function PalettePanel({ palette, fontPair }: Props) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyHex = (hex: string, i: number) => {
    navigator.clipboard.writeText(hex);
    setCopiedIndex(i);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div className="surface rounded-2xl p-6 space-y-6">
      <h2 className="text-xl font-bold">Color Palette</h2>

      {/* Swatches */}
      <div className="grid grid-cols-6 gap-2">
        {palette.map((hex, i) => (
          <button
            key={hex}
            onClick={() => copyHex(hex, i)}
            className="group relative aspect-square rounded-xl transition-transform hover:scale-105"
            style={{ backgroundColor: hex }}
            title={hex}
          >
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-xl text-white">
              {copiedIndex === i ? "Copied!" : hex}
            </span>
          </button>
        ))}
      </div>

      {/* Font preview */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm opacity-50 uppercase tracking-wide">
          Font Pairing
        </h3>
        <p
          className="text-2xl"
          style={{ fontFamily: `"${fontPair.display}", serif` }}
        >
          {fontPair.display}
        </p>
        <p
          className="text-base opacity-70"
          style={{ fontFamily: `"${fontPair.body}", sans-serif` }}
        >
          {fontPair.body} — The quick brown fox jumps over the lazy dog.
        </p>
      </div>
    </div>
  );
}
