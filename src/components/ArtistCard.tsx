import Link from "next/link";
import { StarDisplay } from "./StarRating";
import { initials } from "@/lib/format";

export type ArtistCardData = {
  id: string;
  name: string;
  imageUrl: string | null;
  avgRating: number | null;
  ratingCount: number;
};

export default function ArtistCard({ artist }: { artist: ArtistCardData }) {
  return (
    <Link
      href={`/artists/${artist.id}`}
      className="card p-4 flex flex-col gap-2 hover:border-[var(--accent)] transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <ArtistAvatar name={artist.name} url={artist.imageUrl} size={40} />
          <h3 className="font-semibold leading-tight truncate">{artist.name}</h3>
        </div>
        {artist.avgRating !== null && (
          <div className="text-right shrink-0">
            <StarDisplay rating={Math.round(artist.avgRating)} size="sm" />
          </div>
        )}
      </div>
      <p className="text-xs text-[var(--muted)] mt-1">
        {artist.ratingCount > 0
          ? `${artist.ratingCount} ${artist.ratingCount === 1 ? "rating" : "ratings"}`
          : "No ratings yet"}
      </p>
    </Link>
  );
}

/** An artist's Spotify photo, or an initials tile when there's no match yet. */
export function ArtistAvatar({
  name,
  url,
  size = 40,
}: {
  name: string;
  url: string | null;
  size?: number;
}) {
  const style = { width: size, height: size };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt=""
        style={style}
        className="rounded-full object-cover shrink-0 border border-[var(--border)]"
      />
    );
  }
  return (
    <div
      style={style}
      className="rounded-full bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center font-semibold shrink-0"
    >
      <span style={{ fontSize: Math.max(10, size * 0.36) }}>{initials(name)}</span>
    </div>
  );
}
