import "server-only";

/**
 * Thin client for the Ticketmaster Discovery API
 * (https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/).
 *
 * Free for non-commercial use — get a key at
 * https://developer.ticketmaster.com/ (instant signup) and set
 * TICKETMASTER_API_KEY in .env.
 *
 * We use it for one thing: showing upcoming shows on a venue's page. Venues
 * in our own database are matched to a Ticketmaster venue by name/city the
 * first time someone opens that venue's page, then cached on venues.ticketmasterId
 * so we don't re-search on every visit.
 */

const API_BASE = "https://app.ticketmaster.com/discovery/v2";

export class TicketmasterNotConfiguredError extends Error {
  constructor() {
    super(
      "Upcoming shows aren't set up yet — add TICKETMASTER_API_KEY to your .env (see .env.example)."
    );
    this.name = "TicketmasterNotConfiguredError";
  }
}

function getApiKey() {
  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) throw new TicketmasterNotConfiguredError();
  return key;
}

async function ticketmasterFetch(
  path: string,
  params: Record<string, string | number | undefined>
) {
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set("apikey", getApiKey());
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    // Venue/event listings change slowly enough that a short cache keeps us
    // comfortably under the free tier's rate limit.
    next: { revalidate: 60 * 60 },
  });

  if (res.status === 404) return null;

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Ticketmaster request failed (${res.status}): ${body.slice(0, 200)}`);
  }

  return res.json();
}

export type TicketmasterVenueMatch = {
  ticketmasterId: string;
  name: string;
  city: string;
};

type RawVenue = {
  id: string;
  name: string;
  city?: { name: string };
};

/**
 * Best-effort match for one of our venues against Ticketmaster's venue
 * database, so we know which venueId to ask for upcoming events. Returns
 * null rather than guessing if nothing looks like a confident match.
 */
export async function findMatchingVenue(
  name: string,
  city: string
): Promise<TicketmasterVenueMatch | null> {
  const data = await ticketmasterFetch("/venues.json", { keyword: name, size: 5 });
  const venues: RawVenue[] = data?._embedded?.venues ?? [];

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const targetName = normalize(name);
  const targetCity = normalize(city);

  const match = venues.find((v) => {
    const vName = normalize(v.name);
    const vCity = normalize(v.city?.name ?? "");
    const nameMatches = vName.includes(targetName) || targetName.includes(vName);
    const cityMatches = !vCity || !targetCity || vCity === targetCity;
    return nameMatches && cityMatches;
  });

  if (!match) return null;
  return { ticketmasterId: match.id, name: match.name, city: match.city?.name ?? city };
}

export type UpcomingShow = {
  id: string;
  name: string;
  date: string | null;
  url: string;
};

type RawEvent = {
  id: string;
  name: string;
  url: string;
  dates?: { start?: { localDate?: string } };
};

export async function getUpcomingShowsForVenue(ticketmasterVenueId: string): Promise<UpcomingShow[]> {
  const data = await ticketmasterFetch("/events.json", {
    venueId: ticketmasterVenueId,
    sort: "date,asc",
    size: 12,
  });

  const events: RawEvent[] = data?._embedded?.events ?? [];
  return events.map((e) => ({
    id: e.id,
    name: e.name,
    date: e.dates?.start?.localDate ?? null,
    url: e.url,
  }));
}
