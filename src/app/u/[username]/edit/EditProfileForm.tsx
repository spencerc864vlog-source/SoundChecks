"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/lib/actions/profile";
import SubmitButton from "@/components/SubmitButton";

export default function EditProfileForm({
  displayName,
  bio,
  avatarUrl,
}: {
  displayName: string;
  bio: string;
  avatarUrl: string | null;
}) {
  const [state, formAction] = useActionState(updateProfileAction, undefined);

  return (
    <form action={formAction} className="card p-6 flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Profile</h2>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-[var(--muted)]">Display name</span>
        <input className="input" name="displayName" defaultValue={displayName} required />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-[var(--muted)]">Bio</span>
        <textarea className="input min-h-20 resize-y" name="bio" defaultValue={bio} maxLength={280} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-[var(--muted)]">Avatar image URL (optional)</span>
        <input className="input" name="avatarUrl" defaultValue={avatarUrl ?? ""} placeholder="https://…" />
      </label>

      {state?.error && <p className="text-sm text-[var(--danger)]">{state.error}</p>}

      <SubmitButton pendingText="Saving…" className="btn btn-accent self-start">
        Save profile
      </SubmitButton>
    </form>
  );
}
