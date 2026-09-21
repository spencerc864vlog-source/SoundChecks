import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getConcertById, getConcertStats, getReviewsForConcert } from "@/lib/db/queries";
import { formatConcertDate, formatRating } from "@/lib/format";
import { StarDisplay } from "@/components/StarRating";
import ReviewCard from "@/components/ReviewCard";

export default async function ConcertPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [concert, currentUser] = await Promise.all([getConcertById(id), getCurrentUser()]);
  if (!concert) notFound();

  const [stats, reviews] = await Promise.all([
    getConcertStats(id),
    getReviewsForConcert(id, currentUser?.id),
  ]);

  const myReview = currentUser ? reviews.find((r) => r.userId === currentUser.id) : undefined;
  const redirectPath = `/concerts/${id}`;

  return (
    <div className="flex flex-col gap-8">
      <div className="card p-6 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{concert.artist}</h1>
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
