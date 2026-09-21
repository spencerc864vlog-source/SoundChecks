"use client";

import { useActionState, useState } from "react";
import { rateVenueAction, deleteVenueRatingAction } from "@/lib/actions/venues";
import { StarPicker } from "@/components/StarRating";
import SubmitButton from "@/components/SubmitButton";

export default function RateVenueForm({
  venueId,
  hasExistingRating,
  initialRating = 0,
  initialBody = "",
}: {
  venueId: string;
  hasExistingRating: boolean;
  initialRating?: number;
  initialBody?: string;
}) {
  const [state, formAction] = useActionState(rateVenueAction, undefined);
  const [rating, setRating] = useState(initialRating);

  return (
    <div className="card p-5">
      <h3 className="font-semibold mb-3">{hasExistingRating ? "Your rating" : "Rate this venue"}</h3>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="venueId" value={venueId} />

        <div>
          <span className="text-sm text-[var(--muted)] block mb-1">Rating</span>
          <StarPicker value={rating} onChange={setRating} name="rating" />
        </div>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[var(--muted)]">Notes (optional)</span>
          <textarea
            className="input min-h-20 resize-y"
            name="body"
            defaultValue={initialBody}
            placeholder="Sound, sightlines, parking, staff…"
          />
        </label>

        {state?.error && <p className="text-sm text-[var(--danger)]">{state.error}</p>}

        <div className="flex items-center gap-3">
          <SubmitButton pendingText="Saving…">
            {hasExistingRating ? "Update rating" : "Save rating"}
          </SubmitButton>
        </div>
      </form>

      {hasExistingRating && (
        <form action={deleteVenueRatingAction} className="mt-4 pt-4 border-t border-[var(--border)]">
          <input type="hidden" name="venueId" value={venueId} />
          <button type="submit" className="btn btn-danger text-xs !py-1.5">
            Remove your rating
          </button>
        </form>
      )}
    </div>
  );
}
