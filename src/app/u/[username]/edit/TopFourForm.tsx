"use client";

import { useActionState } from "react";
import { setTopFourAction } from "@/lib/actions/profile";
import SubmitButton from "@/components/SubmitButton";

type ConcertOption = { id: string; artist: string; venue: string; date: string };

export default function TopFourForm({
  concerts,
  currentSlots,
}: {
  concerts: ConcertOption[];
  currentSlots: (string | null)[]; // length 4, concertId or null
}) {
  const [state, formAction] = useActionState(setTopFourAction, undefined);

  return (
    <form action={formAction} className="card p-6 flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Top four</h2>
        <p className="text-sm text-[var(--muted)]">
          Pick your four favorite shows you&apos;ve reviewed. They&apos;ll be pinned to your profile.
        </p>
      </div>

      {concerts.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          Review a show first, then come back here to pin it.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <label key={i} className="flex flex-col gap-1.5 text-sm">
              <span className="text-[var(--muted)]">Slot {i + 1}</span>
              <select className="input" name={`slot${i + 1}`} defaultValue={currentSlots[i] ?? ""}>
                <option value="">— none —</option>
                {concerts.map((concert) => (
                  <option key={concert.id} value={concert.id}>
                    {concert.artist} — {concert.venue}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}

      {state?.error && <p className="text-sm text-[var(--danger)]">{state.error}</p>}

      <SubmitButton pendingText="Saving…" className="btn btn-accent self-start">
        Save top four
      </SubmitButton>
    </form>
  );
}
