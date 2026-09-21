"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupAction } from "@/lib/actions/auth";
import SubmitButton from "@/components/SubmitButton";

export default function SignupPage() {
  const [state, formAction] = useActionState(signupAction, undefined);

  return (
    <div className="max-w-sm mx-auto card p-6">
      <h1 className="text-xl font-bold mb-1">Create your account</h1>
      <p className="text-sm text-[var(--muted)] mb-6">
        Start logging the shows you&apos;ve been to.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <Field label="Display name" name="displayName" placeholder="Alex Rivera" autoComplete="name" />
        <Field label="Username" name="username" placeholder="alexr" autoComplete="username" />
        <Field label="Email" name="email" type="email" placeholder="you@example.com" autoComplete="email" />
        <Field
          label="Password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />

        {state?.error && <p className="text-sm text-[var(--danger)]">{state.error}</p>}

        <SubmitButton pendingText="Creating account…">Sign up</SubmitButton>
      </form>

      <p className="text-sm text-[var(--muted)] mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--accent)] font-medium">
          Log in
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <input
        className="input"
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
      />
    </label>
  );
}
