import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { findArtistImage } from "./spotify";

/**
 * Returns this artist's Spotify photo, looking it up and caching it on the
 * row the first time it's needed (spotifyId doubles as "we already tried"
 * so we don't re-search an artist Spotify has no match/photo for). Shared
 * between the artist page and the homepage's poster art, which both want
 * the same photo for the same artist.
 */
export async function getOrFetchArtistImage(artist: {
  id: string;
  name: string;
  spotifyId: string | null;
  imageUrl: string | null;
}): Promise<string | null> {
  if (artist.spotifyId) return artist.imageUrl;

  try {
    const match = await findArtistImage(artist.name);
    if (!match) return null;
    await db
      .update(schema.artists)
      .set({ spotifyId: match.spotifyId, imageUrl: match.imageUrl })
      .where(eq(schema.artists.id, artist.id));
    return match.imageUrl;
  } catch {
    return null;
  }
}
