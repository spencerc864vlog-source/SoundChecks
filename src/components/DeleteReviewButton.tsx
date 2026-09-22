"use client";

import { deleteReviewAction } from "@/lib/actions/reviews";

/**
 * Inline "Delete" on a review card (as opposed to the delete button on the
 * full edit page) — since this sits right next to other one-click actions
 * like Like, it asks for confirmation first so a stray click can't lose a
 * review permanently.
 */
export default function DeleteReviewButton({
  reviewId,
  redirectPath,
}: {
  reviewId: string;
  redirectPath: string;
}) {
  return (
    <form
      action={deleteReviewAction}
      onSubmit={(e) => {
        if (!confirm("Delete this review? This can't be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="redirectPath" value={redirectPath} />
      <button type="submit" className="text-xs text-[var(--danger)] hover:underline">
        Delete
      </button>
    </form>
  );
}
