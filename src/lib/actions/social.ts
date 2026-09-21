"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export type ActionState = { error?: string } | undefined;

const pathSchema = z.string().startsWith("/").max(200);

function safeRevalidate(path: unknown) {
  const parsed = pathSchema.safeParse(path);
  if (parsed.success) revalidatePath(parsed.data);
}

// ---------------------------------------------------------------------------
// Follow / unfollow
// ---------------------------------------------------------------------------

export async function toggleFollowAction(formData: FormData) {
  const user = await requireUser();
  const targetUserId = formData.get("targetUserId");
  const redirectPath = formData.get("redirectPath");

  if (typeof targetUserId !== "string" || targetUserId === user.id) return;

  const existing = await db.query.follows.findFirst({
    where: and(
      eq(schema.follows.followerId, user.id),
      eq(schema.follows.followingId, targetUserId)
    ),
  });

  if (existing) {
    await db
      .delete(schema.follows)
      .where(
        and(
          eq(schema.follows.followerId, user.id),
          eq(schema.follows.followingId, targetUserId)
        )
      );
  } else {
    await db.insert(schema.follows).values({
      followerId: user.id,
      followingId: targetUserId,
    });
  }

  safeRevalidate(redirectPath);
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Likes
// ---------------------------------------------------------------------------

export async function toggleLikeAction(formData: FormData) {
  const user = await requireUser();
  const reviewId = formData.get("reviewId");
  const redirectPath = formData.get("redirectPath");

  if (typeof reviewId !== "string") return;

  const existing = await db.query.likes.findFirst({
    where: and(eq(schema.likes.userId, user.id), eq(schema.likes.reviewId, reviewId)),
  });

  if (existing) {
    await db
      .delete(schema.likes)
      .where(and(eq(schema.likes.userId, user.id), eq(schema.likes.reviewId, reviewId)));
  } else {
    await db.insert(schema.likes).values({ userId: user.id, reviewId });
  }

  safeRevalidate(redirectPath);
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

const commentSchema = z.object({
  reviewId: z.string().uuid(),
  body: z.string().trim().min(1, "Write something first.").max(1000),
});

export async function addCommentAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = commentSchema.safeParse({
    reviewId: formData.get("reviewId"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.insert(schema.comments).values({
    userId: user.id,
    reviewId: parsed.data.reviewId,
    body: parsed.data.body,
  });

  safeRevalidate(formData.get("redirectPath"));
}
