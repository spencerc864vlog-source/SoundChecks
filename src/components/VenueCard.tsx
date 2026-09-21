import Link from "next/link";
import { StarDisplay } from "./StarRating";

export type VenueCardData = {
  id: string;
  name: string;
  city: string;
  country: string;
  avgRating: number | null;
  ratingCount: number;
};

export default function VenueCard({ venue }: { venue: VenueCardData }) {
  return (
    <Link
      href={`/venues/${venue.id}`}
      className="card p-4 flex flex-col gap-2 hover:border-[var(--accent)] transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-tight">{venue.name}</h3>
        {venue.avgRating !== null && (
          <div className="text-right shrink-0">
            <StarDisplay rating={Math.round(venue.avgRating)} size="sm" />
          </div>
        )}
      </div>
      <p className="text-sm text-[var(--muted)]">
        {venue.city}, {venue.country}
      </p>
      <p className="text-xs text-[var(--muted)] mt-1">
        {venue.ratingCount > 0
          ? `${venue.ratingCount} ${venue.ratingCount === 1 ? "rating" : "ratings"}`
          : "No ratings yet"}
      </p>
    </Link>
  );
}
