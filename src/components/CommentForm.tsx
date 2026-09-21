"use client";

import { useActionState } from "react";
import SubmitButton from "./SubmitButton";

type ActionState = { error?: string } | undefined;

export default function CommentForm({
  reviewId,
  redirectPath,
  action,
}: {
  reviewId: string;
  redirectPath: string;
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex items-start gap-2 pt-1">
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="redirectPath" value={redirectPath} />
      <input
        type="text"
        name="body"
        placeholder="Add a comment…"
        className="input !py-1.5 text-sm"
      />
      <SubmitButton className="btn btn-ghost !py-1.5 text-xs shrink-0" pendingText="…">
        Reply
      </SubmitButton>
      {state?.error && <p className="text-xs text-[var(--danger)] self-center">{state.error}</p>}
    </form>
  );
}
