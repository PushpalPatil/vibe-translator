import type { SpotifyTrack } from "./types";

let cachedToken: string | null = null;
let tokenExpiry = 0;

export async function getSpotifyToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`Spotify auth failed: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  // Expire 60s early to avoid edge cases
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken!;
}

export async function searchTrack(
  token: string,
  query: string
): Promise<SpotifyTrack | null> {
  const q = encodeURIComponent(query);
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) return null;

  const data = await res.json();
  const item = data.tracks?.items?.[0];
  if (!item) return null;

  return {
    name: item.name,
    artist: item.artists[0].name,
    albumArt: item.album.images[0]?.url ?? "",
    spotifyUrl: item.external_urls.spotify,
    uri: item.uri,
  };
}
