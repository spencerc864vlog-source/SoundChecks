"use client";

import { useEffect, useRef, useState } from "react";

// A handful of moody, concert-lighting-inspired gradients used as a poster's
// backdrop when there's no real photo to show, so grids of shows still look
// intentional and varied instead of a wall of grey boxes. The gradient is
// picked deterministically from the artist's name, so a given show always
// gets the same one.
const GRADIENTS = [
  "linear-gradient(155deg, #4f8dfd 0%, #7c3aed 100%)",
  "linear-gradient(155deg, #f472b6 0%, #7c3aed 100%)",
  "linear-gradient(155deg, #34d399 0%, #0ea5e9 100%)",
  "linear-gradient(155deg, #fb923c 0%, #e5584f 100%)",
  "linear-gradient(155deg, #a78bfa 0%, #4f8dfd 100%)",
  "linear-gradient(155deg, #22d3ee 0%, #4f8dfd 100%)",
  "linear-gradient(155deg, #fbbf24 0%, #f472b6 100%)",
];

function gradientFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

/**
 * A portrait "poster" tile for a show — a real photo if we have one
 * (the show's uploaded poster, or failing that the artist's Spotify photo —
 * the caller decides which to pass in `imageUrl`), otherwise a generated
 * gradient card with the artist's name, in the same 2:3 shape either way so
 * grids of them line up cleanly. If the image URL turns out to be broken
 * (a bad/stale upload, a dead link), it quietly falls back to the gradient
 * instead of showing a broken-image icon.
 *
 * The failure is watched with a plain DOM `addEventListener("error", ...)`
 * via a ref, rather than the React `onError` prop — the img's native error
 * event doesn't bubble, and in this project's React/Next setup the
 * synthetic `onError` prop was not firing for it, so this listens for the
 * real browser event directly, which is reliable in every environment.
 */
export default function ConcertPoster({
  artist,
  imageUrl,
  className = "",
}: {
  artist: string;
  imageUrl: string | null;
  className?: string;
}) {
  // Tracks which URL most recently failed. Comparing it to the current
  // imageUrl (rather than a plain boolean reset in an effect) means a new
  // URL from the caller automatically counts as "not errored" again, with
  // no extra render pass.
  const [erroredUrl, setErroredUrl] = useState<string | null>(null);
  const errored = imageUrl !== null && erroredUrl === imageUrl;
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = imgRef.current;
    if (!el || !imageUrl) return;
    const handleError = () => setErroredUrl(imageUrl);
    el.addEventListener("error", handleError);
    // Covers the case where the image had already failed by the time this
    // effect ran (e.g. a cached failure resolving before mount).
    if (el.complete && el.naturalWidth === 0) setErroredUrl(imageUrl);
    return () => el.removeEventListener("error", handleError);
  }, [imageUrl]);

  if (imageUrl && !errored) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={imgRef}
        src={imageUrl}
        alt={artist}
        className={`aspect-[2/3] w-full rounded-lg object-cover border border-[var(--border)] ${className}`}
      />
    );
  }

  return (
    <div
      style={{ background: gradientFor(artist) }}
      className={`aspect-[2/3] w-full rounded-lg border border-[var(--border)] flex items-end p-2.5 ${className}`}
    >
      <span className="text-white text-xs font-semibold leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] line-clamp-4">
        {artist}
      </span>
    </div>
  );
}
