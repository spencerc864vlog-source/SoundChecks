"use client";

import { useEffect, useRef, useState } from "react";
import { importConcertAction } from "@/lib/actions/concerts";
import { formatConcertDate } from "@/lib/format";

type Show = {
  setlistfmId: string;
  artist: string;
  tourName: string | null;
  venue: string;
  city: string;
  country: string;
  date: string;
  url: string;
};

type SearchResponse =
  | { shows: Show[]; total: number; page: number }
  | { error: string; notConfigured?: boolean };

export default function ShowSearch() {
  const [query, setQuery] = useState("");
  const [shows, setShows] = useState<Show[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setShows(null);
      setError(null);
      setLoading(false);
    } else {
      setLoading(true);
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      try {
        const res = await fetch(`/api/setlistfm/search?artist=${encodeURIComponent(trimmed)}`);
        const data: SearchResponse = await res.json();
        if (requestId !== requestIdRef.current) return; // a newer search superseded this one

        if ("error" in data) {
          setError(data.error);
          setNotConfigured(!!data.notConfigured);
          setShows(null);
        } else {
          setShows(data.shows);
          setError(data.shows.length === 0 ? `No shows found for "${trimmed}".` : null);
          setNotConfigured(false);
        }
      } catch {
        if (requestId !== requestIdRef.current) return;
        setError("Search failed. Try again.");
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-[var(--muted)]">Search for an artist</span>
        <input
          className="input"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Fleet Foxes, boygenius, Tame Impala…"
          autoFocus
        />
      </label>

      {loading && <p className="text-sm text-[var(--muted)]">Searching…</p>}

      {error && (
        <div className="text-sm text-[var(--muted)]">
          {error}
          {notConfigured && (
            <>
              {" "}
              (Ask whoever set this up to add a free{" "}
              <a
                href="https://www.setlist.fm/settings/api"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent)]"
              >
                setlist.fm API key
              </a>
              .)
            </>
          )}
        </div>
      )}

      {shows && shows.length > 0 && (
        <ul className="flex flex-col gap-2">
          {shows.map((show) => (
            <li key={show.setlistfmId}>
              <form action={importConcertAction} className="card p-3 flex items-center justify-between gap-3">
                <input type="hidden" name="setlistfmId" value={show.setlistfmId} />
                <input type="hidden" name="artist" value={show.artist} />
                <input type="hidden" name="tourName" value={show.tourName ?? ""} />
                <input type="hidden" name="venue" value={show.venue} />
                <input type="hidden" name="city" value={show.city} />
                <input type="hidden" name="country" value={show.country} />
                <input type="hidden" name="date" value={show.date} />

                <div className="min-w-0">
                  <p className="font-medium leading-tight truncate">{show.artist}</p>
                  {show.tourName && (
                    <p className="text-xs text-[var(--muted)] truncate">{show.tourName}</p>
                  )}
                  <p className="text-xs text-[var(--muted)] truncate">
                    {show.venue} · {show.city}, {show.country} · {formatConcertDate(show.date)}
                  </p>
                </div>

                <button type="submit" className="btn btn-accent shrink-0 !py-1.5 text-xs">
                  Log this show
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
