"use server";

import { z } from "zod";
import { eq, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/lib/db";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

export type ActionState = { error?: string } | undefined;

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(24, "Username must be 24 characters or fewer.")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores.");

const signupSchema = z.object({
  username: usernameSchema,
  email: z.string().trim().email("Enter a valid email address."),
  displayName: z.string().trim().min(1, "Enter a display name.").max(60),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function signupAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    username: formData.get("username"),
    email: formData.get("email"),
    displayName: formData.get("displayName"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { username, email, displayName, password } = parsed.data;

  const existing = await db.query.users.findFirst({
    where: or(eq(schema.users.username, username), eq(schema.users.email, email)),
  });

  if (existing) {
    return {
      error:
        existing.username === username
          ? "That username is taken."
          : "An account with that email already exists.",
    };
  }

  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(schema.users)
    .values({ username, email, displayName, passwordHash })
    .returning({ id: schema.users.id });

  await setSessionCookie(user.id);
  redirect(`/u/${username}`);
}

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your username or email."),
  password: z.string().min(1, "Enter your password."),
});

export async function loginAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { identifier, password } = parsed.data;

  const user = await db.query.users.findFirst({
    where: or(eq(schema.users.username, identifier), eq(schema.users.email, identifier)),
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Incorrect username/email or password." };
  }

  await setSessionCookie(user.id);
  redirect(`/`);
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
