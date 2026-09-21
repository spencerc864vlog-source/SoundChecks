import "server-only";

/**
 * Thin client for the setlist.fm REST API (https://api.setlist.fm/docs/1.0/index.html).
 *
 * Free for non-commercial use — get a key at https://www.setlist.fm/settings/api
 * (requires a free setlist.fm account) and set SETLISTFM_API_KEY in .env.
 *
 * We use it as the "past shows" database: instead of everyone typing in the
 * artist/venue/date by hand, people search real, already-documented concerts
 * and import the one they went to.
 */

const API_BASE = "https://api.setlist.fm/rest/1.0";

export type SetlistfmShow = {
  setlistfmId: string;
  artist: string;
  tourName: string | null;
  venue: string;
  city: string;
  country: string;
  /** ISO yyyy-MM-dd, ready to store in our `date` column. */
  date: string;
  url: string;
};

export class SetlistfmNotConfiguredError extends Error {
  constructor() {
    super(
      "Show search isn't set up yet — add SETLISTFM_API_KEY to your .env (see .env.example)."
    );
    this.name = "SetlistfmNotConfiguredError";
  }
}

function getApiKey() {
  const key = process.env.SETLISTFM_API_KEY;
  if (!key) throw new SetlistfmNotConfiguredError();
  return key;
}

async function setlistfmFetch(path: string, params: Record<string, string | number | undefined>) {
  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }

  const res = await fetch(url, {
    headers: {
      "x-api-key": getApiKey(),
      Accept: "application/json",
    },
    // Search results change slowly; cache briefly to stay under rate limits
    // if the same artist is searched repeatedly.
    next: { revalidate: 60 * 60 },
  });

  // setlist.fm returns 404 for "no results" — treat that as an empty list
  // rather than an error.
  if (res.status === 404) return null;

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`setlist.fm request failed (${res.status}): ${body.slice(0, 200)}`);
  }

  return res.json();
}

/** dd-MM-yyyy (setlist.fm's format) -> yyyy-MM-dd (ours). */
function toIsoDate(ddMMyyyy: string) {
  const [day, month, year] = ddMMyyyy.split("-");
  return `${year}-${month}-${day}`;
}

type RawSetlist = {
  id: string;
  eventDate: string;
  artist: { name: string };
  venue: {
    name: string;
    city: { name: string; country: { name: string } };
  };
  tour?: { name: string };
  url: string;
};

function normalize(raw: RawSetlist): SetlistfmShow {
  return {
    setlistfmId: raw.id,
    artist: raw.artist.name,
    tourName: raw.tour?.name ?? null,
    venue: raw.venue.name,
    city: raw.venue.city.name,
    country: raw.venue.city.country.name,
    date: toIsoDate(raw.eventDate),
    url: raw.url,
  };
}

export async function searchShowsByArtist(
  artistName: string,
  page = 1
): Promise<{ shows: SetlistfmShow[]; total: number; page: number }> {
  const data = await setlistfmFetch("/search/setlists", { artistName, p: page });
  if (!data?.setlist) return { shows: [], total: 0, page };

  const raw: RawSetlist[] = data.setlist;
  return {
    // A given show can have multiple setlist "versions" (edits); de-dupe by
    // artist+venue+date so people don't see the same show twice.
    shows: dedupeShows(raw.map(normalize)),
    total: Number(data.total ?? raw.length),
    page: Number(data.page ?? page),
  };
}

function dedupeShows(shows: SetlistfmShow[]) {
  const seen = new Set<string>();
  const out: SetlistfmShow[] = [];
  for (const show of shows) {
    const key = `${show.artist}|${show.venue}|${show.date}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(show);
    }
  }
  return out;
}
