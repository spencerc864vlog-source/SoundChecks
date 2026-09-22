import Link from "next/link";
import { StarDisplay } from "./StarRating";
import { formatRelativeTime, formatShortDate, initials } from "@/lib/format";
import { toggleLikeAction, addCommentAction } from "@/lib/actions/social";
import CommentForm from "./CommentForm";
import DeleteReviewButton from "./DeleteReviewButton";

export type ReviewCardData = {
  id: string;
  userId: string;
  rating: number;
  body: string;
  createdAt: Date | string;
  user: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  concert?: {
    id: string;
    artist: string;
    venue: { name: string; city: string };
    date: string;
  };
  media: { id: string; url: string; type: string }[];
  likeCount: number;
  likedByMe: boolean;
  comments: {
    id: string;
    body: string;
    createdAt: Date | string;
    user: { username: string; displayName: string };
  }[];
};

export default function ReviewCard({
  review,
  currentUserId,
  redirectPath,
}: {
  review: ReviewCardData;
  currentUserId?: string;
  redirectPath: string;
}) {
  const isOwner = !!currentUserId && review.userId === currentUserId;

  return (
    <article className="card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={review.user.displayName} url={review.user.avatarUrl} />
          <div>
            <Link href={`/u/${review.user.username}`} className="font-medium hover:text-[var(--accent)]">
              {review.user.displayName}
            </Link>
            {review.concert && (
              <p className="text-sm text-[var(--muted)]">
                logged{" "}
                <Link href={`/concerts/${review.concert.id}`} className="hover:text-[var(--foreground)]">
                  {review.concert.artist}
                </Link>{" "}
                · {review.concert.venue.name}, {review.concert.venue.city} ·{" "}
                {formatShortDate(review.concert.date)}
              </p>
            )}
            <p className="text-xs text-[var(--muted)]">{formatRelativeTime(review.createdAt)}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StarDisplay rating={review.rating} size="sm" />
          {isOwner && review.concert && (
            <div className="flex items-center gap-2.5">
              <Link
                href={`/concerts/${review.concert.id}/review`}
                className="text-xs text-[var(--muted)] hover:text-[var(--accent)]"
              >
                Edit
              </Link>
              <DeleteReviewButton reviewId={review.id} redirectPath={redirectPath} />
            </div>
          )}
        </div>
      </div>

      {review.body && <p className="text-sm leading-relaxed whitespace-pre-wrap">{review.body}</p>}

      {review.media.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {review.media.map((item) => (
            <div key={item.id} className="aspect-square rounded-md overflow-hidden bg-black/30">
              {item.type === "photo" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <video src={item.url} className="w-full h-full object-cover" controls />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 pt-1 border-t border-[var(--border)] mt-1">
        {currentUserId ? (
          <form action={toggleLikeAction}>
            <input type="hidden" name="reviewId" value={review.id} />
            <input type="hidden" name="redirectPath" value={redirectPath} />
            <button
              type="submit"
              className={`text-sm flex items-center gap-1 pt-2 ${
                review.likedByMe ? "text-[var(--accent)]" : "text-[var(--muted)]"
              } hover:text-[var(--accent)]`}
            >
              {review.likedByMe ? "★ Liked" : "☆ Like"} {review.likeCount > 0 && `· ${review.likeCount}`}
            </button>
          </form>
        ) : (
          <span className="text-sm text-[var(--muted)] pt-2">
            {review.likeCount > 0 ? `${review.likeCount} likes` : ""}
          </span>
        )}
        <span className="text-sm text-[var(--muted)] pt-2">
          {review.comments.length > 0 &&
            `${review.comments.length} ${review.comments.length === 1 ? "comment" : "comments"}`}
        </span>
      </div>

      {review.comments.length > 0 && (
        <ul className="flex flex-col gap-2">
          {review.comments.map((comment) => (
            <li key={comment.id} className="text-sm">
              <Link href={`/u/${comment.user.username}`} className="font-medium hover:text-[var(--accent)]">
                {comment.user.displayName}
              </Link>
              <span className="text-[var(--muted)]">: </span>
              <span className="text-[var(--foreground)]">{comment.body}</span>
            </li>
          ))}
        </ul>
      )}

      {currentUserId && (
        <CommentForm reviewId={review.id} redirectPath={redirectPath} action={addCommentAction} />
      )}
    </article>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="w-9 h-9 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-xs font-semibold shrink-0">
      {initials(name)}
    </div>
  );
}
