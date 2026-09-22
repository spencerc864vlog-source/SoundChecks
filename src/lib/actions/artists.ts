"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export type ActionState = { error?: string } | undefined;

const artistRatingSchema = z.object({
  artistId: z.string().uuid(),
  rating: z.coerce.number().int().min(1, "Pick a rating.").max(10),
  body: z.string().trim().max(4000).optional().or(z.literal("")),
});

export async function rateArtistAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = artistRatingSchema.safeParse({
    artistId: formData.get("artistId"),
    rating: formData.get("rating"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { artistId, rating, body } = parsed.data;

  const artist = await db.query.artists.findFirst({ where: eq(schema.artists.id, artistId) });
  if (!artist) {
    return { error: "That artist no longer exists." };
  }

  await db
    .insert(schema.artistRatings)
    .values({ userId: user.id, artistId, rating, body: body || "" })
    .onConflictDoUpdate({
      target: [schema.artistRatings.userId, schema.artistRatings.artistId],
      set: { rating, body: body || "", updatedAt: new Date() },
    });

  revalidatePath(`/artists/${artistId}`);
  redirect(`/artists/${artistId}`);
}

const deleteSchema = z.object({ artistId: z.string().uuid() });

export async function deleteArtistRatingAction(formData: FormData) {
  const user = await requireUser();
  const parsed = deleteSchema.safeParse({ artistId: formData.get("artistId") });
  if (!parsed.success) return;

  await db
    .delete(schema.artistRatings)
    .where(
      and(
        eq(schema.artistRatings.artistId, parsed.data.artistId),
        eq(schema.artistRatings.userId, user.id)
      )
    );

  revalidatePath(`/artists/${parsed.data.artistId}`);
  redirect(`/artists/${parsed.data.artistId}`);
}
