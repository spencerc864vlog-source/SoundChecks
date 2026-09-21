"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/lib/actions/auth";
import SubmitButton from "@/components/SubmitButton";

export default function LoginPage() {
  const [state, formAction] = useActionState(loginAction, undefined);

  return (
    <div className="max-w-sm mx-auto card p-6">
      <h1 className="text-xl font-bold mb-1">Welcome back</h1>
      <p className="text-sm text-[var(--muted)] mb-6">Log in to rate your next show.</p>

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[var(--muted)]">Username or email</span>
          <input className="input" name="identifier" autoComplete="username" required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[var(--muted)]">Password</span>
          <input
            className="input"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>

        {state?.error && <p className="text-sm text-[var(--danger)]">{state.error}</p>}

        <SubmitButton pendingText="Logging in…">Log in</SubmitButton>
      </form>

      <p className="text-sm text-[var(--muted)] mt-6">
        New here?{" "}
        <Link href="/signup" className="text-[var(--accent)] font-medium">
          Create an account
        </Link>
      </p>
    </div>
  );
}
