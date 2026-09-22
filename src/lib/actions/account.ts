"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireUser, clearSessionCookie } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { db, schema } from "@/lib/db";

export type ActionState = { error?: string } | undefined;

const deleteAccountSchema = z.object({
  password: z.string().min(1, "Enter your password to confirm."),
});

/**
 * Permanently deletes the signed-in user's account and everything tied to
 * it (reviews, lists, ratings, follows, likes, comments, want-to-go,
 * top four, notifications — every one of those tables cascades on the
 * user row). Shows they logged are kept: concerts.createdByUserId is set
 * to null instead of cascading, so other people's reviews/lists built on
 * those shows aren't affected (see drizzle/0005 for why).
 *
 * Requires re-entering the account password, since this can't be undone.
 */
export async function deleteAccountAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = deleteAccountSchema.safeParse({
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const passwordOk = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!passwordOk) {
    return { error: "Incorrect password." };
  }

  await db.delete(schema.users).where(eq(schema.users.id, user.id));

  await clearSessionCookie();
  redirect("/");
}
