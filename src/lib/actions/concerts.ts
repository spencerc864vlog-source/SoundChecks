"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { findOrCreateVenue } from "@/lib/db/queries";

export type ActionState = { error?: string } | undefined;

const concertSchema = z.object({
  artist: z.string().trim().min(1, "Enter the artist or band.").max(120),
  tourName: z.string().trim().max(120).optional().or(z.literal("")),
  venue: z.string().trim().min(1, "Enter the venue.").max(160),
  city: z.string().trim().min(1, "Enter the city.").max(120),
  country: z.string().trim().min(1, "Enter the country.").max(120),
  date: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date."),
  posterUrl: z.string().trim().url().optional().or(z.literal("")),
});

export async function createConcertAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = concertSchema.safeParse({
    artist: formData.get("artist"),
    tourName: formData.get("tourName"),
    venue: formData.get("venue"),
    city: formData.get("city"),
    country: formData.get("country"),
    date: formData.get("date"),
    posterUrl: formData.get("posterUrl"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { artist, tourName, venue, city, country, date, posterUrl } = parsed.data;

  const venueRow = await findOrCreateVenue({ name: venue, city, country });

  const [concert] = await db
    .insert(schema.concerts)
    .values({
      artist,
      tourName: tourName || null,
      venueId: venueRow.id,
      date,
      posterUrl: posterUrl || null,
      createdByUserId: user.id,
    })
    .returning({ id: schema.concerts.id });

  redirect(`/concerts/${concert.id}/review`);
}

// ---------------------------------------------------------------------------
// Importing a show found via the setlist.fm search (see src/lib/setlistfm.ts)
// ---------------------------------------------------------------------------

const importSchema = z.object({
  setlistfmId: z.string().trim().min(1),
  artist: z.string().trim().min(1).max(120),
  tourName: z.string().trim().max(120).optional().or(z.literal("")),
  venue: z.string().trim().min(1).max(160),
  city: z.string().trim().min(1).max(120),
  country: z.string().trim().min(1).max(120),
  date: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date."),
});

export async function importConcertAction(formData: FormData) {
  const user = await requireUser();

  const parsed = importSchema.safeParse({
    setlistfmId: formData.get("setlistfmId"),
    artist: formData.get("artist"),
    tourName: formData.get("tourName"),
    venue: formData.get("venue"),
    city: formData.get("city"),
    country: formData.get("country"),
    date: formData.get("date"),
  });

  if (!parsed.success) {
    // Nothing sensible to show the user for a malformed hidden field — just
    // bounce back to the search so they can try again.
    redirect("/concerts/new");
  }

  const { setlistfmId, artist, tourName, venue, city, country, date } = parsed.data;

  const existing = await db.query.concerts.findFirst({
    where: eq(schema.concerts.setlistfmId, setlistfmId),
  });

  if (existing) {
    redirect(`/concerts/${existing.id}/review`);
  }

  const venueRow = await findOrCreateVenue({ name: venue, city, country });

  const [concert] = await db
    .insert(schema.concerts)
    .values({
      setlistfmId,
      artist,
      tourName: tourName || null,
      venueId: venueRow.id,
      date,
      createdByUserId: user.id,
    })
    .returning({ id: schema.concerts.id });

  redirect(`/concerts/${concert.id}/review`);
}
