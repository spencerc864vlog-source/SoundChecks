"use client";

import { useActionState, useState } from "react";
import { deleteAccountAction } from "@/lib/actions/account";
import SubmitButton from "@/components/SubmitButton";

export default function DeleteAccountForm() {
  const [state, formAction] = useActionState(deleteAccountAction, undefined);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="card p-6 flex flex-col gap-2 border-[var(--danger)]/30">
        <h2 className="text-lg font-semibold text-[var(--danger)]">Delete account</h2>
        <p className="text-sm text-[var(--muted)]">
          Permanently deletes your account, reviews, lists, and everything else tied to your
          profile. This can&apos;t be undone.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn btn-danger self-start mt-1"
        >
          Delete my account
        </button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !confirm(
            "This permanently deletes your account and everything on it. This can't be undone. Continue?"
          )
        ) {
          e.preventDefault();
        }
      }}
      className="card p-6 flex flex-col gap-4 border-[var(--danger)]/30"
    >
      <h2 className="text-lg font-semibold text-[var(--danger)]">Delete account</h2>
      <p className="text-sm text-[var(--muted)]">
        Permanently deletes your account, reviews, lists, ratings, and follows. Shows you logged
        stay on Soundcheck for anyone else who reviewed them — they&apos;ll just no longer be
        credited to you. Enter your password to confirm.
      </p>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-[var(--muted)]">Password</span>
        <input className="input" type="password" name="password" required autoFocus />
      </label>

      {state?.error && <p className="text-sm text-[var(--danger)]">{state.error}</p>}

      <div className="flex items-center gap-3">
        <SubmitButton pendingText="Deleting…" className="btn btn-danger">
          Permanently delete my account
        </SubmitButton>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
