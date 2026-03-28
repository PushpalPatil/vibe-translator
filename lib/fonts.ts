const FONT_MAP: Record<string, { display: string; body: string }> = {
  "warm editorial serif": { display: "Lora", body: "Source Sans 3" },
  "brutalist mono": { display: "JetBrains Mono", body: "Syne" },
  "editorial display": { display: "Playfair Display", body: "Karla" },
  "geometric modern": { display: "Outfit", body: "DM Sans" },
  "organic humanist": { display: "Fraunces", body: "Nunito" },
  "retro slab": { display: "Zilla Slab", body: "Work Sans" },
  "elegant thin": { display: "Cormorant Garamond", body: "Jost" },
  "technical clean": { display: "Space Grotesk", body: "Inter" },
  "playful rounded": { display: "Baloo 2", body: "Quicksand" },
  "luxe contrast": { display: "Bodoni Moda", body: "Manrope" },
};

const DEFAULT_PAIR = { display: "Space Grotesk", body: "Inter" };

export function matchFontPair(
  displayHint: string,
  bodyHint: string
): { display: string; body: string } {
  const combined = `${displayHint} ${bodyHint}`.toLowerCase();

  // Try exact key match first
  for (const [key, pair] of Object.entries(FONT_MAP)) {
    if (combined.includes(key)) return pair;
  }

  // Fuzzy: match any keyword from the keys
  let bestMatch: { display: string; body: string } | null = null;
  let bestScore = 0;

  for (const [key, pair] of Object.entries(FONT_MAP)) {
    const keywords = key.split(" ");
    const score = keywords.filter((kw) => combined.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = pair;
    }
  }

  return bestMatch && bestScore > 0 ? bestMatch : DEFAULT_PAIR;
}

export function buildGoogleFontsUrl(pair: {
  display: string;
  body: string;
}): string {
  const encode = (name: string) => name.replace(/ /g, "+");
  return `https://fonts.googleapis.com/css2?family=${encode(pair.display)}:wght@400;700&family=${encode(pair.body)}:wght@400;600&display=swap`;
}

export const FONT_VIBE_OPTIONS = Object.keys(FONT_MAP);
