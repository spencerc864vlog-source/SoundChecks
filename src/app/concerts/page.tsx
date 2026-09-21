import Link from "next/link";
import { searchConcerts } from "@/lib/db/queries";
import ConcertCard from "@/components/ConcertCard";

export default async function ConcertsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const concerts = await searchConcerts(q);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Concerts</h1>
        <Link href="/concerts/new" className="btn btn-accent">
          + Log a show
        </Link>
      </div>

      <form className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by artist, venue, or city…"
          className="input"
        />
        <button type="submit" className="btn btn-ghost shrink-0">
          Search
        </button>
      </form>

      {concerts.length === 0 ? (
        <p className="text-[var(--muted)] text-sm">
          {q ? `No concerts found for "${q}".` : "No concerts logged yet."}{" "}
          <Link href="/concerts/new" className="text-[var(--accent)]">
            Add the first one
          </Link>
          .
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {concerts.map((concert) => (
            <ConcertCard key={concert.id} concert={concert} />
          ))}
        </div>
      )}
    </div>
  );
}
