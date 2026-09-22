"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export async function markAllNotificationsReadAction() {
  const user = await requireUser();
  await db
    .update(schema.notifications)
    .set({ isRead: true })
    .where(and(eq(schema.notifications.userId, user.id), eq(schema.notifications.isRead, false)));
  revalidatePath("/notifications");
}
