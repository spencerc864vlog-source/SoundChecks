import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  getFollowCounts,
  getReviewsByUser,
  getTopFourForUser,
  getUserByUsername,
  getUserRatingStats,
  isFollowing,
} from "@/lib/db/queries";
import { formatShortDate, initials } from "@/lib/format";
import { StarDisplay } from "@/components/StarRating";
import ReviewCard from "@/components/ReviewCard";
import FollowButton from "@/components/FollowButton";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const [profileUser, currentUser] = await Promise.all([
    getUserByUsername(username),
    getCurrentUser(),
  ]);
  if (!profileUser) notFound();

  const isOwnProfile = currentUser?.id === profileUser.id;

  const [topFour, reviews, followCounts, ratingStats, followingThem] = await Promise.all([
    getTopFourForUser(profileUser.id),
    getReviewsByUser(profileUser.id, currentUser?.id),
    getFollowCounts(profileUser.id),
    getUserRatingStats(profileUser.id),
    currentUser && !isOwnProfile ? isFollowing(currentUser.id, profileUser.id) : Promise.resolve(false),
  ]);

  const redirectPath = `/u/${username}`;

  return (
    <div className="flex flex-col gap-8">
      <div className="card p-6 flex flex-col sm:flex-row sm:items-start gap-5">
        {profileUser.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profileUser.avatarUrl}
            alt=""
            className="w-20 h-20 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-xl font-semibold shrink-0">
            {initials(profileUser.displayName)}
          </div>
        )}

        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">{profileUser.displayName}</h1>
              <p className="text-sm text-[var(--muted)]">@{profileUser.username}</p>
            </div>

            {isOwnProfile ? (
              <Link href={`/u/${username}/edit`} className="btn btn-ghost">
                Edit profile
              </Link>
            ) : currentUser ? (
              <FollowButton
                targetUserId={profileUser.id}
                redirectPath={redirectPath}
                isFollowing={followingThem}
              />
            ) : null}
          </div>

          {profileUser.bio && <p className="text-sm mt-3">{profileUser.bio}</p>}

          <div className="flex items-center gap-5 mt-4 text-sm">
            <span>
              <strong>{reviews.length}</strong>{" "}
              <span className="text-[var(--muted)]">{reviews.length === 1 ? "show" : "shows"}</span>
            </span>
            <span>
              <strong>{followCounts.followers}</strong>{" "}
              <span className="text-[var(--muted)]">followers</span>
            </span>
            <span>
              <strong>{followCounts.following}</strong>{" "}
              <span className="text-[var(--muted)]">following</span>
            </span>
            {ratingStats.avgRating !== null && (
              <span className="flex items-center gap-1.5">
                <StarDisplay rating={Math.round(ratingStats.avgRating)} size="sm" />
                <span className="text-[var(--muted)]">avg</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Top four</h2>
          {isOwnProfile && (
            <Link href={`/u/${username}/edit`} className="text-sm text-[var(--accent)]">
              Edit
            </Link>
          )}
        </div>

        {topFour.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            {isOwnProfile ? "Pick your four favorite shows." : `${profileUser.displayName} hasn't picked a top four yet.`}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {topFour.map((entry) => (
              <Link
                key={entry.id}
                href={`/concerts/${entry.concert.id}`}
                className="card p-3 flex flex-col gap-1 hover:border-[var(--accent)]"
              >
                <span className="text-xs text-[var(--accent)] font-semibold">
                  #{entry.position}
                </span>
                <span className="font-medium text-sm leading-tight">{entry.concert.artist}</span>
                <span className="text-xs text-[var(--muted)]">
                  {entry.concert.venue.name} · {formatShortDate(entry.concert.date)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Reviews {reviews.length > 0 && `(${reviews.length})`}</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No shows logged yet.</p>
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
