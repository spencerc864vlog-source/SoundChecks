"use client";

import { useActionState } from "react";
import { createConcertAction } from "@/lib/actions/concerts";
import SubmitButton from "@/components/SubmitButton";

export default function NewConcertForm() {
  const [state, formAction] = useActionState(createConcertAction, undefined);

  return (
    <div className="card p-6">
      <p className="text-sm text-[var(--muted)] mb-4">
        Not in the search results above? Add it by hand — useful for smaller/local shows
        setlist.fm doesn&apos;t have.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <Field label="Artist / band" name="artist" placeholder="Fleet Foxes" />
        <Field label="Tour name (optional)" name="tourName" placeholder="Shore Tour" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Venue" name="venue" placeholder="Radio City Music Hall" />
          <Field label="Date" name="date" type="date" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="City" name="city" placeholder="New York" />
          <Field label="Country" name="country" placeholder="USA" />
        </div>
        <Field
          label="Poster / photo URL (optional)"
          name="posterUrl"
          placeholder="https://…"
        />

        {state?.error && <p className="text-sm text-[var(--danger)]">{state.error}</p>}

        <SubmitButton pendingText="Saving…">Continue to review</SubmitButton>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <input className="input" name={name} type={type} placeholder={placeholder} required={!label.includes("optional")} />
    </label>
  );
}
