"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { VibeProfile as VibeProfileType, SpotifyTrack, MoodboardImage } from "@/lib/types";
import { buildGoogleFontsUrl } from "@/lib/fonts";
import VibeProfileComponent from "@/components/VibeProfile";
import PalettePanel from "@/components/PalettePanel";
import PlaylistPanel from "@/components/PlaylistPanel";
import MoodboardPanel from "@/components/MoodboardPanel";

function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.round(((num >> 16) & 0xff) + (255 - ((num >> 16) & 0xff)) * amount));
  const g = Math.min(255, Math.round(((num >> 8) & 0xff) + (255 - ((num >> 8) & 0xff)) * amount));
  const b = Math.min(255, Math.round((num & 0xff) + (255 - (num & 0xff)) * amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export default function ResultsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<VibeProfileType | null>(null);
  const [fontPair, setFontPair] = useState<{ display: string; body: string } | null>(null);
  const [tracks, setTracks] = useState<SpotifyTrack[] | null>(null);
  const [moodboard, setMoodboard] = useState<MoodboardImage[] | null>(null);

  // Load data from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("vibeResult");
    if (!stored) {
      router.push("/");
      return;
    }

    const data = JSON.parse(stored);
    setProfile(data.profile);
    setFontPair(data.fontPair);

    // Fire parallel requests for Spotify + Moodboard
    fetch("/api/spotify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        suggestions: data.profile.song_suggestions,
        spotifySeedAttributes: data.profile.spotify_seed_attributes,
      }),
    })
      .then((r) => r.json())
      .then((d) => setTracks(d.tracks ?? []))
      .catch(() => setTracks([]));

    fetch("/api/moodboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompts: data.profile.moodboard_prompts }),
    })
      .then((r) => r.json())
      .then((d) => setMoodboard(d.images ?? []))
      .catch(() => setMoodboard([]));
  }, [router]);

  // Apply dynamic theming
  useEffect(() => {
    if (!profile || !fontPair) return;

    const palette = profile.suggested_palette;
    const root = document.documentElement;
    root.style.setProperty("--vibe-bg", lighten(palette[0], 0.85));
    root.style.setProperty("--vibe-surface", lighten(palette[0], 0.92));
    root.style.setProperty("--vibe-accent", palette[2]);
    root.style.setProperty("--vibe-text", palette[0]);
    root.style.setProperty("--vibe-font-display", `"${fontPair.display}"`);
    root.style.setProperty("--vibe-font-body", `"${fontPair.body}"`);

    // Load Google Fonts
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = buildGoogleFontsUrl(fontPair);
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
      root.style.removeProperty("--vibe-bg");
      root.style.removeProperty("--vibe-surface");
      root.style.removeProperty("--vibe-accent");
      root.style.removeProperty("--vibe-text");
      root.style.removeProperty("--vibe-font-display");
      root.style.removeProperty("--vibe-font-body");
    };
  }, [profile, fontPair]);

  if (!profile || !fontPair) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/50">Loading...</p>
      </div>
    );
  }

  return (
    <div className="results-page texture-overlay relative min-h-screen py-12 px-6">
      <div className="relative z-10 max-w-6xl mx-auto space-y-8">
        {/* Vibe Summary */}
        <VibeProfileComponent profile={profile} />

        {/* Three-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PalettePanel palette={profile.suggested_palette} fontPair={fontPair} />
          <PlaylistPanel tracks={tracks} />
          <MoodboardPanel images={moodboard} />
        </div>

        {/* Back button */}
        <div className="text-center pt-4">
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 rounded-full border border-current/20 text-sm opacity-50 hover:opacity-80 transition-opacity"
          >
            Translate another vibe
          </button>
        </div>
      </div>
    </div>
  );
}
