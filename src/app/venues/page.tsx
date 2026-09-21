import { searchVenues } from "@/lib/db/queries";
import VenueCard from "@/components/VenueCard";

export default async function VenuesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const venues = await searchVenues(q);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Venues</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Rate the room, not just the show — and see what&apos;s coming up.
        </p>
      </div>

      <form className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by venue or city…"
          className="input"
        />
        <button type="submit" className="btn btn-ghost shrink-0">
          Search
        </button>
      </form>

      {venues.length === 0 ? (
        <p className="text-[var(--muted)] text-sm">
          {q
            ? `No venues found for "${q}".`
            : "No venues yet — they're created automatically when someone logs a show."}
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {venues.map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      )}
    </div>
  );
}
