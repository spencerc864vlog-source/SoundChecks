import Link from "next/link";
import { StarDisplay } from "./StarRating";
import { formatShortDate } from "@/lib/format";

export type ConcertCardData = {
  id: string;
  artist: string;
  tourName: string | null;
  venue: { id: string; name: string; city: string; country: string };
  date: string;
  posterUrl: string | null;
  avgRating: number | null;
  reviewCount: number;
};

export default function ConcertCard({ concert }: { concert: ConcertCardData }) {
  return (
    <Link
      href={`/concerts/${concert.id}`}
      className="card p-4 flex flex-col gap-2 hover:border-[var(--accent)] transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold leading-tight">{concert.artist}</h3>
          {concert.tourName && (
            <p className="text-sm text-[var(--muted)]">{concert.tourName}</p>
          )}
        </div>
        {concert.avgRating !== null && (
          <div className="text-right shrink-0">
            <StarDisplay rating={Math.round(concert.avgRating)} size="sm" />
          </div>
        )}
      </div>
      <p className="text-sm text-[var(--muted)]">
        {concert.venue.name} · {concert.venue.city}, {concert.venue.country}
      </p>
      <div className="flex items-center justify-between text-xs text-[var(--muted)] mt-1">
        <span>{formatShortDate(concert.date)}</span>
        <span>
          {concert.reviewCount} {concert.reviewCount === 1 ? "review" : "reviews"}
        </span>
      </div>
    </Link>
  );
}
