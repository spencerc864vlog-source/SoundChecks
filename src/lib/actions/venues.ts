"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export type ActionState = { error?: string } | undefined;

const venueRatingSchema = z.object({
  venueId: z.string().uuid(),
  rating: z.coerce.number().int().min(1, "Pick a rating.").max(10),
  body: z.string().trim().max(4000).optional().or(z.literal("")),
});

export async function rateVenueAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = venueRatingSchema.safeParse({
    venueId: formData.get("venueId"),
    rating: formData.get("rating"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { venueId, rating, body } = parsed.data;

  const venue = await db.query.venues.findFirst({ where: eq(schema.venues.id, venueId) });
  if (!venue) {
    return { error: "That venue no longer exists." };
  }

  await db
    .insert(schema.venueRatings)
    .values({ userId: user.id, venueId, rating, body: body || "" })
    .onConflictDoUpdate({
      target: [schema.venueRatings.userId, schema.venueRatings.venueId],
      set: { rating, body: body || "", updatedAt: new Date() },
    });

  revalidatePath(`/venues/${venueId}`);
  redirect(`/venues/${venueId}`);
}

const deleteSchema = z.object({ venueId: z.string().uuid() });

export async function deleteVenueRatingAction(formData: FormData) {
  const user = await requireUser();
  const parsed = deleteSchema.safeParse({ venueId: formData.get("venueId") });
  if (!parsed.success) return;

  await db
    .delete(schema.venueRatings)
    .where(
      and(
        eq(schema.venueRatings.venueId, parsed.data.venueId),
        eq(schema.venueRatings.userId, user.id)
      )
    );

  revalidatePath(`/venues/${parsed.data.venueId}`);
  redirect(`/venues/${parsed.data.venueId}`);
}
