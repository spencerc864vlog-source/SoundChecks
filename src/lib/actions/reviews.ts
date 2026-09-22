"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export type ActionState = { error?: string } | undefined;

const mediaItemSchema = z.object({
  url: z.string().url(),
  type: z.enum(["photo", "video"]),
});

const reviewSchema = z.object({
  concertId: z.string().uuid(),
  rating: z.coerce.number().int().min(1, "Pick a rating.").max(10),
  body: z.string().trim().max(4000).optional().or(z.literal("")),
  media: z.array(mediaItemSchema).max(10).optional(),
});

export async function upsertReviewAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const mediaRaw = formData.get("media");
  let media: { url: string; type: "photo" | "video" }[] = [];
  if (typeof mediaRaw === "string" && mediaRaw.length > 0) {
    try {
      media = JSON.parse(mediaRaw);
    } catch {
      return { error: "Something went wrong with your uploaded media. Try again." };
    }
  }

  const parsed = reviewSchema.safeParse({
    concertId: formData.get("concertId"),
    rating: formData.get("rating"),
    body: formData.get("body"),
    media,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { concertId, rating, body } = parsed.data;

  const concert = await db.query.concerts.findFirst({
    where: eq(schema.concerts.id, concertId),
  });
  if (!concert) {
    return { error: "That concert no longer exists." };
  }

  const [review] = await db
    .insert(schema.reviews)
    .values({ userId: user.id, concertId, rating, body: body || "" })
    .onConflictDoUpdate({
      target: [schema.reviews.userId, schema.reviews.concertId],
      set: { rating, body: body || "", updatedAt: new Date() },
    })
    .returning({ id: schema.reviews.id });

  // Replace media on every save — simplest correct behavior for edits.
  await db.delete(schema.reviewMedia).where(eq(schema.reviewMedia.reviewId, review.id));
  if (parsed.data.media && parsed.data.media.length > 0) {
    await db.insert(schema.reviewMedia).values(
      parsed.data.media.map((m, i) => ({
        reviewId: review.id,
        url: m.url,
        type: m.type,
        position: i,
      }))
    );
  }

  revalidatePath(`/concerts/${concertId}`);
  revalidatePath(`/u/${user.username}`);
  revalidatePath("/");
  redirect(`/concerts/${concertId}`);
}

const deleteSchema = z.object({ reviewId: z.string().uuid() });
const redirectPathSchema = z.string().startsWith("/").max(200);

export async function deleteReviewAction(formData: FormData) {
  const user = await requireUser();
  const parsed = deleteSchema.safeParse({ reviewId: formData.get("reviewId") });
  if (!parsed.success) return;

  const review = await db.query.reviews.findFirst({
    where: eq(schema.reviews.id, parsed.data.reviewId),
  });
  if (!review || review.userId !== user.id) return;

  await db.delete(schema.reviews).where(
    and(eq(schema.reviews.id, review.id), eq(schema.reviews.userId, user.id))
  );

  revalidatePath(`/concerts/${review.concertId}`);
  revalidatePath(`/u/${user.username}`);
  revalidatePath("/");

  // Called from an inline "Delete" on a review card (feed, profile, popular
  // reviews) — stay put and just let the revalidated data drop the card.
  // Called from the standalone edit page with no redirectPath — that page
  // no longer makes sense once its review is gone, so leave it.
  const redirectPathRaw = formData.get("redirectPath");
  const redirectPathParsed = redirectPathSchema.safeParse(redirectPathRaw);
  if (redirectPathParsed.success) {
    revalidatePath(redirectPathParsed.data);
    return;
  }

  redirect(`/concerts/${review.concertId}`);
}
