import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import {
  getArtistById,
  getArtistStats,
  getRatingsForArtist,
  getArtistRatingByUser,
  getConcertsForArtist,
  getWantToGoIds,
} from "@/lib/db/queries";
import {
  findMatchingArtist,
  getUpcomingShowsForArtist,
  TicketmasterNotConfiguredError,
  type UpcomingShow,
} from "@/lib/ticketmaster";
import { getOrFetchArtistImage } from "@/lib/artistImages";
import { formatRating, formatShortDate, formatRelativeTime, initials } from "@/lib/format";
import { StarDisplay } from "@/components/StarRating";
import RateArtistForm from "@/components/RateArtistForm";
import WantToGoButton from "@/components/WantToGoButton";
import { ArtistAvatar } from "@/components/ArtistCard";

async function loadUpcomingShows(artist: { id: string; name: string; ticketmasterId: string | null }) {
  try {
    let ticketmasterId = artist.ticketmasterId;

    if (!ticketmasterId) {
      const match = await findMatchingArtist(artist.name);
      if (match) {
        ticketmasterId = match.ticketmasterId;
        await db
          .update(schema.artists)
          .set({ ticketmasterId })
          .where(eq(schema.artists.id, artist.id));
      }
    }

    if (!ticketmasterId) {
      return { shows: [] as UpcomingShow[], status: "no-match" as const };
    }

    const shows = await getUpcomingShowsForArtist(ticketmasterId);
    return { shows, status: "ok" as const };
  } catch (error) {
    if (error instanceof TicketmasterNotConfiguredError) {
      return { shows: [] as UpcomingShow[], status: "not-configured" as const };
    }
    return { shows: [] as UpcomingShow[], status: "error" as const };
  }
}

export default async function ArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [artist, currentUser] = await Promise.all([getArtistById(id), getCurrentUser()]);
  if (!artist) notFound();

  const [stats, ratings, concerts, myRating, upcoming, wantToGoIds, imageUrl] = await Promise.all([
    getArtistStats(id),
    getRatingsForArtist(id),
    getConcertsForArtist(id),
    currentUser ? getArtistRatingByUser(currentUser.id, id) : Promise.resolve(undefined),
    loadUpcomingShows(artist),
    currentUser ? getWantToGoIds(currentUser.id) : Promise.resolve(new Set<string>()),
    getOrFetchArtistImage(artist),
  ]);
  const redirectPath = `/artists/${id}`;

  return (
    <div className="flex flex-col gap-8">
      <div className="card p-6 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <ArtistAvatar name={artist.name} url={imageUrl} size={64} />
            <h1 className="text-2xl font-bold">{artist.name}</h1>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2">
            {stats.ratingCount > 0 && stats.avgRating !== null ? (
              <div className="flex items-center gap-2">
                <StarDisplay rating={Math.round(stats.avgRating)} />
                <span className="text-sm text-[var(--muted)]">
                  {formatRating(Math.round(stats.avgRating))} · {stats.ratingCount}{" "}
                  {stats.ratingCount === 1 ? "rating" : "ratings"}
                </span>
              </div>
            ) : (
              <span className="text-sm text-[var(--muted)]">No ratings yet</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Upcoming shows</h2>

          {upcoming.status === "not-configured" && (
            <p className="text-sm text-[var(--muted)]">
              Upcoming shows aren&apos;t set up yet. (Ask whoever set this up to add a free{" "}
              <a
                href="https://developer.ticketmaster.com/"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent)]"
              >
                Ticketmaster API key
              </a>
              .)
            </p>
          )}

          {upcoming.status === "error" && (
            <p className="text-sm text-[var(--muted)]">
              Couldn&apos;t load upcoming shows right now — try again later.
            </p>
          )}

          {upcoming.status === "no-match" && (
            <p className="text-sm text-[var(--muted)]">
              We couldn&apos;t find this artist in Ticketmaster&apos;s listings, so we can&apos;t show
              upcoming shows for them.
            </p>
          )}

          {upcoming.status === "ok" && upcoming.shows.length === 0 && (
            <p className="text-sm text-[var(--muted)]">No upcoming shows listed right now.</p>
          )}

          {upcoming.status === "ok" && upcoming.shows.length > 0 && (
            <ul className="flex flex-col gap-2">
              {upcoming.shows.map((show) => (
                <li key={show.id} className="card p-3 flex items-center gap-3">
                  <a
                    href={show.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 min-w-0 hover:text-[var(--accent)]"
                  >
                    <span className="font-medium text-sm leading-tight block truncate">
                      {show.name}
                    </span>
                    <span className="text-xs text-[var(--muted)] block truncate">
                      {[show.venueName, show.city].filter(Boolean).join(" · ") || "Venue TBA"} ·{" "}
                      {show.date ? formatShortDate(show.date) : "date TBA"}
                    </span>
                  </a>
                  {currentUser && (
                    <WantToGoButton
                      show={show}
                      isWantToGo={wantToGoIds.has(show.id)}
                      redirectPath={redirectPath}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}

          <h2 className="text-lg font-semibold mt-4">Logged on Soundcheck</h2>
          {concerts.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No shows logged for this artist yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {concerts.map((concert) => (
                <li key={concert.id}>
                  <Link
                    href={`/concerts/${concert.id}`}
                    className="card p-3 flex items-center justify-between gap-3 hover:border-[var(--accent)]"
                  >
                    <span className="font-medium text-sm leading-tight truncate">
                      {concert.venue.name} · {concert.venue.city}
                    </span>
                    <span className="text-xs text-[var(--muted)] shrink-0">
                      {formatShortDate(concert.date)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {currentUser ? (
            <RateArtistForm
              artistId={id}
              hasExistingRating={!!myRating}
              initialRating={myRating?.rating}
              initialBody={myRating?.body}
            />
          ) : (
            <p className="text-sm text-[var(--muted)]">
              <Link href="/login" className="text-[var(--accent)]">
                Log in
              </Link>{" "}
              to rate this artist.
            </p>
          )}

          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">
              Ratings {ratings.length > 0 && `(${ratings.length})`}
            </h2>

            {ratings.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No one has rated this artist yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {ratings.map((r) => (
                  <div key={r.id} className="card p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar name={r.user.displayName} url={r.user.avatarUrl} />
                        <Link
                          href={`/u/${r.user.username}`}
                          className="text-sm font-medium hover:text-[var(--accent)]"
                        >
                          {r.user.displayName}
                        </Link>
                      </div>
                      <StarDisplay rating={r.rating} size="sm" />
                    </div>
                    {r.body && <p className="text-sm leading-relaxed">{r.body}</p>}
                    <p className="text-xs text-[var(--muted)]">{formatRelativeTime(r.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="w-7 h-7 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[10px] font-semibold shrink-0">
      {initials(name)}
    </div>
  );
}
