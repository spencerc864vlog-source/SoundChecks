import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  getConcertById,
  getConcertStats,
  getReviewsForConcert,
  getFriendsWhoReviewedConcert,
  getListPickerOptions,
} from "@/lib/db/queries";
import { formatConcertDate, formatRating, initials } from "@/lib/format";
import { StarDisplay } from "@/components/StarRating";
import ReviewCard from "@/components/ReviewCard";
import { addToListAction } from "@/lib/actions/lists";

export default async function ConcertPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [concert, currentUser] = await Promise.all([getConcertById(id), getCurrentUser()]);
  if (!concert) notFound();

  const [stats, reviews, friends, myLists] = await Promise.all([
    getConcertStats(id),
    getReviewsForConcert(id, currentUser?.id),
    currentUser ? getFriendsWhoReviewedConcert(id, currentUser.id) : Promise.resolve([]),
    currentUser ? getListPickerOptions(currentUser.id) : Promise.resolve([]),
  ]);

  const myReview = currentUser ? reviews.find((r) => r.userId === currentUser.id) : undefined;
  const redirectPath = `/concerts/${id}`;

  return (
    <div className="flex flex-col gap-8">
      <div className="card p-6 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {concert.artistProfile ? (
                <Link href={`/artists/${concert.artistProfile.id}`} className="hover:text-[var(--accent)]">
                  {concert.artist}
                </Link>
              ) : (
                concert.artist
              )}
            </h1>
            {concert.tourName && <p className="text-[var(--muted)]">{concert.tourName}</p>}
            <p className="text-sm text-[var(--muted)] mt-2">
              <Link href={`/venues/${concert.venue.id}`} className="hover:text-[var(--accent)]">
                {concert.venue.name}
              </Link>{" "}
              · {concert.venue.city}, {concert.venue.country}
            </p>
            <p className="text-sm text-[var(--muted)]">{formatConcertDate(concert.date)}</p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2">
            {stats.reviewCount > 0 && stats.avgRating !== null ? (
              <div className="flex items-center gap-2">
                <StarDisplay rating={Math.round(stats.avgRating)} />
                <span className="text-sm text-[var(--muted)]">
                  {formatRating(Math.round(stats.avgRating))} · {stats.reviewCount}{" "}
                  {stats.reviewCount === 1 ? "rating" : "ratings"}
                </span>
              </div>
            ) : (
              <span className="text-sm text-[var(--muted)]">No ratings yet</span>
            )}

            <Link href={`/concerts/${id}/review`} className="btn btn-accent">
              {myReview ? "Edit your review" : "Rate this show"}
            </Link>
          </div>
        </div>
      </div>

      {friends.length > 0 && (
        <div className="card p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-[var(--muted)]">
            {friends.length === 1 ? "A friend was there" : `${friends.length} friends were there`}
          </h2>
          <div className="flex flex-wrap gap-3">
            {friends.map((f) => (
              <Link
                key={f.user.id}
                href={`/u/${f.user.username}`}
                className="flex items-center gap-2 hover:text-[var(--accent)]"
              >
                {f.user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.user.avatarUrl}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[10px] font-semibold">
                    {initials(f.user.displayName)}
                  </div>
                )}
                <span className="text-sm">{f.user.displayName}</span>
                <StarDisplay rating={f.rating} size="sm" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {currentUser && (
        <div className="card p-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium shrink-0">Add to a list</span>
          {myLists.length > 0 && (
            <form action={addToListAction} className="flex items-center gap-2">
              <input type="hidden" name="concertId" value={id} />
              <input type="hidden" name="redirectPath" value={redirectPath} />
              <select name="listId" className="input !py-1.5 text-sm" required>
                {myLists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn btn-ghost text-xs !py-1.5">
                Add
              </button>
            </form>
          )}
          <Link
            href={`/u/${currentUser.username}/lists/new?concertId=${id}`}
            className="text-sm text-[var(--accent)]"
          >
            + New list
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">
          Reviews {reviews.length > 0 && `(${reviews.length})`}
        </h2>

        {reviews.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No one has reviewed this show yet.{" "}
            {currentUser && (
              <Link href={`/concerts/${id}/review`} className="text-[var(--accent)]">
                Be the first
              </Link>
            )}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                currentUserId={currentUser?.id}
                redirectPath={redirectPath}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
