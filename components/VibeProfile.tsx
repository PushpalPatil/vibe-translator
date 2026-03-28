"use client";

import type { VibeProfile as VibeProfileType } from "@/lib/types";

interface Props {
  profile: VibeProfileType;
}

export default function VibeProfile({ profile }: Props) {
  return (
    <div className="w-full space-y-4">
      <h1 className="text-3xl font-bold">{profile.era}</h1>
      <p className="text-lg opacity-80 leading-relaxed">{profile.summary}</p>

      {/* Energy bar */}
      <div className="flex items-center gap-3">
        <span className="text-sm opacity-60 uppercase tracking-wide">Energy</span>
        <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${profile.energy * 100}%`,
              backgroundColor: "var(--vibe-accent)",
            }}
          />
        </div>
        <span className="text-sm opacity-60">
          {Math.round(profile.energy * 100)}%
        </span>
      </div>

      {/* Mood pills */}
      <div className="flex flex-wrap gap-2">
        {profile.mood.map((m) => (
          <span
            key={m}
            className="px-3 py-1 rounded-full text-sm border border-current/20"
            style={{ color: "var(--vibe-accent)" }}
          >
            {m}
          </span>
        ))}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 pt-2">
        {profile.tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded text-xs opacity-50 bg-white/5"
          >
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );
}
