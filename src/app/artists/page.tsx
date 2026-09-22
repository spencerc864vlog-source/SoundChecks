import { searchArtists } from "@/lib/db/queries";
import ArtistCard from "@/components/ArtistCard";

export default async function ArtistsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const artists = await searchArtists(q);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Artists</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Rate the artist overall, see every show of theirs you&apos;ve logged, and check upcoming tour dates.
        </p>
      </div>

      <form className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by artist…"
          className="input"
        />
        <button type="submit" className="btn btn-ghost shrink-0">
          Search
        </button>
      </form>

      {artists.length === 0 ? (
        <p className="text-[var(--muted)] text-sm">
          {q
            ? `No artists found for "${q}".`
            : "No artists yet — they're created automatically when someone logs a show."}
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      )}
    </div>
  );
}
