"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";

const toggleSchema = z.object({
  ticketmasterEventId: z.string().trim().min(1),
  eventName: z.string().trim().min(1),
  eventDate: z.string().optional().or(z.literal("")),
  venueName: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  eventUrl: z.string().url(),
  redirectPath: z.string().startsWith("/").max(300).optional(),
});

/** Flags/unflags a Ticketmaster event as "want to go" — a simple toggle, same shape as follow/like. */
export async function toggleWantToGoAction(formData: FormData) {
  const user = await requireUser();

  const parsed = toggleSchema.safeParse({
    ticketmasterEventId: formData.get("ticketmasterEventId"),
    eventName: formData.get("eventName"),
    eventDate: formData.get("eventDate"),
    venueName: formData.get("venueName"),
    city: formData.get("city"),
    eventUrl: formData.get("eventUrl"),
    redirectPath: formData.get("redirectPath") || undefined,
  });
  if (!parsed.success) return;

  const { ticketmasterEventId, eventName, eventDate, venueName, city, eventUrl, redirectPath } =
    parsed.data;

  const existing = await db.query.wantToGo.findFirst({
    where: and(
      eq(schema.wantToGo.userId, user.id),
      eq(schema.wantToGo.ticketmasterEventId, ticketmasterEventId)
    ),
  });

  if (existing) {
    await db.delete(schema.wantToGo).where(eq(schema.wantToGo.id, existing.id));
  } else {
    await db.insert(schema.wantToGo).values({
      userId: user.id,
      ticketmasterEventId,
      eventName,
      eventDate: eventDate || null,
      venueName: venueName || null,
      city: city || null,
      eventUrl,
    });
  }

  if (redirectPath) revalidatePath(redirectPath);
  revalidatePath(`/u/${user.username}/want-to-go`);
}
