"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export type ActionState = { error?: string } | undefined;

const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Enter a display name.").max(60),
  bio: z.string().trim().max(280).optional().or(z.literal("")),
  avatarUrl: z.string().trim().url().optional().or(z.literal("")),
});

export async function updateProfileAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    bio: formData.get("bio"),
    avatarUrl: formData.get("avatarUrl"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db
    .update(schema.users)
    .set({
      displayName: parsed.data.displayName,
      bio: parsed.data.bio || "",
      avatarUrl: parsed.data.avatarUrl || null,
    })
    .where(eq(schema.users.id, user.id));

  revalidatePath(`/u/${user.username}`);
  redirect(`/u/${user.username}`);
}

const topFourSchema = z.object({
  concertIds: z.array(z.string().uuid().nullable()).length(4),
});

export async function setTopFourAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const raw = [1, 2, 3, 4].map((i) => {
    const value = formData.get(`slot${i}`);
    return typeof value === "string" && value.length > 0 ? value : null;
  });

  const parsed = topFourSchema.safeParse({ concertIds: raw });
  if (!parsed.success) {
    return { error: "Invalid selection." };
  }

  const seen = new Set<string>();
  const entries: { userId: string; concertId: string; position: number }[] = [];
  parsed.data.concertIds.forEach((concertId, index) => {
    if (concertId && !seen.has(concertId)) {
      seen.add(concertId);
      entries.push({ userId: user.id, concertId, position: index + 1 });
    }
  });

  await db.transaction(async (tx) => {
    await tx.delete(schema.topFour).where(eq(schema.topFour.userId, user.id));
    if (entries.length > 0) {
      await tx.insert(schema.topFour).values(entries);
    }
  });

  revalidatePath(`/u/${user.username}`);
  redirect(`/u/${user.username}`);
}
