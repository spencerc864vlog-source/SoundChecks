import "server-only";

/**
 * Thin client for the Spotify Web API (https://developer.spotify.com/documentation/web-api),
 * used for exactly one thing: pulling an artist's profile picture (the same
 * image you'd see on their Spotify artist page) so we can show it on their
 * Soundcheck artist page and artist cards.
 *
 * Free — create an app at https://developer.spotify.com/dashboard (instant,
 * no approval wait) to get a Client ID and Client Secret, then set
 * SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env.
 *
 * Spotify's Client Credentials flow (no user login involved — this is just
 * server-to-server access to public catalog data) gives us a short-lived
 * access token, which we cache in memory and refresh once it's about to
 * expire. Artists in our own database are matched to a Spotify artist by
 * name the first time someone opens that artist's page, then the image URL
 * and Spotify ID are cached on artists.imageUrl / artists.spotifyId so we
 * don't re-search on every visit — the same pattern used for Ticketmaster
 * matching in ticketmaster.ts.
 */

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";

export class SpotifyNotConfiguredError extends Error {
  constructor() {
    super(
      "Artist photos aren't set up yet — add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to your .env (see .env.example)."
    );
    this.name = "SpotifyNotConfiguredError";
  }
}

function getCredentials() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new SpotifyNotConfiguredError();
  return { clientId, clientSecret };
}

declare global {
  var __concertboxdSpotifyToken:
    | { accessToken: string; expiresAt: number }
    | undefined;
}

async function getAccessToken(): Promise<string> {
  const cached = global.__concertboxdSpotifyToken;
  // Refresh a little before it actually expires so we don't get caught out
  // mid-request.
  if (cached && cached.expiresAt - 30_000 > Date.now()) {
    return cached.accessToken;
  }

  const { clientId, clientSecret } = getCredentials();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Spotify auth failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const token = {
    accessToken: data.access_token as string,
    expiresAt: Date.now() + (data.expires_in as number) * 1000,
  };
  global.__concertboxdSpotifyToken = token;
  return token.accessToken;
}

export type SpotifyArtistMatch = {
  spotifyId: string;
  name: string;
  imageUrl: string | null;
};

type RawSpotifyArtist = {
  id: string;
  name: string;
  images?: { url: string; width: number; height: number }[];
};

/**
 * Best-effort match for one of our artists against Spotify's artist catalog,
 * so we know which artist to pull a profile picture from. Returns null
 * rather than guessing if nothing looks like a confident match.
 */
export async function findArtistImage(name: string): Promise<SpotifyArtistMatch | null> {
  const token = await getAccessToken();

  const url = new URL(`${API_BASE}/search`);
  url.searchParams.set("q", name);
  url.searchParams.set("type", "artist");
  url.searchParams.set("limit", "5");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    // Artist photos essentially never change; caching the search result
    // itself (on top of the DB-level cache) just saves a round trip if we
    // ever re-search the same name.
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Spotify search failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const artists: RawSpotifyArtist[] = data?.artists?.items ?? [];

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const target = normalize(name);

  const match =
    artists.find((a) => normalize(a.name) === target) ??
    artists.find((a) => {
      const n = normalize(a.name);
      return n.includes(target) || target.includes(n);
    });

  if (!match) return null;

  // Spotify returns images sorted largest-first; take the biggest one we've
  // got, or null if this artist has no photo on Spotify at all.
  const imageUrl = match.images?.[0]?.url ?? null;

  return { spotifyId: match.id, name: match.name, imageUrl };
}
