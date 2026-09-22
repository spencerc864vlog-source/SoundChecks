"use client";

import { useActionState } from "react";
import { createListAction } from "@/lib/actions/lists";
import SubmitButton from "@/components/SubmitButton";

export default function ListForm({ concertId }: { concertId?: string }) {
  const [state, formAction] = useActionState(createListAction, undefined);

  return (
    <form action={formAction} className="card p-5 flex flex-col gap-4 max-w-lg">
      {concertId && <input type="hidden" name="concertId" value={concertId} />}

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-[var(--muted)]">Title</span>
        <input
          className="input"
          name="title"
          placeholder="Best festivals of 2026"
          maxLength={120}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-[var(--muted)]">Description (optional)</span>
        <textarea
          className="input min-h-20 resize-y"
          name="description"
          placeholder="What ties these shows together?"
          maxLength={2000}
        />
      </label>

      {concertId && (
        <p className="text-xs text-[var(--muted)]">
          The show you came from will be added as the first entry.
        </p>
      )}

      {state?.error && <p className="text-sm text-[var(--danger)]">{state.error}</p>}

      <div>
        <SubmitButton pendingText="Creating…">Create list</SubmitButton>
      </div>
    </form>
  );
}
