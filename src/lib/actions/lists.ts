"use server";

import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export type ActionState = { error?: string } | undefined;

const createListSchema = z.object({
  title: z.string().trim().min(1, "Give your list a title.").max(120),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  concertId: z.string().uuid().optional().or(z.literal("")),
});

export async function createListAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = createListSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    concertId: formData.get("concertId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { title, description, concertId } = parsed.data;

  const [list] = await db
    .insert(schema.lists)
    .values({ userId: user.id, title, description: description || "" })
    .returning();

  if (concertId) {
    await db
      .insert(schema.listItems)
      .values({ listId: list.id, concertId, position: 1 })
      .onConflictDoNothing();
  }

  revalidatePath(`/u/${user.username}/lists`);
  redirect(`/u/${user.username}/lists/${list.id}`);
}

const addToListSchema = z.object({
  listId: z.string().uuid(),
  concertId: z.string().uuid(),
  redirectPath: z.string().startsWith("/").max(200).optional(),
});

export async function addToListAction(formData: FormData) {
  const user = await requireUser();

  const parsed = addToListSchema.safeParse({
    listId: formData.get("listId"),
    concertId: formData.get("concertId"),
    redirectPath: formData.get("redirectPath") || undefined,
  });
  if (!parsed.success) return;

  const { listId, concertId, redirectPath } = parsed.data;

  const list = await db.query.lists.findFirst({ where: eq(schema.lists.id, listId) });
  if (!list || list.userId !== user.id) return;

  const [{ nextPosition }] = await db
    .select({
      nextPosition: sql<number>`coalesce(max(${schema.listItems.position}), 0) + 1`,
    })
    .from(schema.listItems)
    .where(eq(schema.listItems.listId, listId));

  await db
    .insert(schema.listItems)
    .values({ listId, concertId, position: Number(nextPosition) })
    .onConflictDoNothing();

  await db.update(schema.lists).set({ updatedAt: new Date() }).where(eq(schema.lists.id, listId));

  revalidatePath(`/u/${user.username}/lists/${listId}`);
  if (redirectPath) {
    revalidatePath(redirectPath);
    redirect(redirectPath);
  }
}

const removeFromListSchema = z.object({
  listId: z.string().uuid(),
  itemId: z.string().uuid(),
});

export async function removeFromListAction(formData: FormData) {
  const user = await requireUser();
  const parsed = removeFromListSchema.safeParse({
    listId: formData.get("listId"),
    itemId: formData.get("itemId"),
  });
  if (!parsed.success) return;

  const list = await db.query.lists.findFirst({ where: eq(schema.lists.id, parsed.data.listId) });
  if (!list || list.userId !== user.id) return;

  await db.delete(schema.listItems).where(eq(schema.listItems.id, parsed.data.itemId));

  revalidatePath(`/u/${user.username}/lists/${parsed.data.listId}`);
}

const deleteListSchema = z.object({ listId: z.string().uuid() });

export async function deleteListAction(formData: FormData) {
  const user = await requireUser();
  const parsed = deleteListSchema.safeParse({ listId: formData.get("listId") });
  if (!parsed.success) return;

  const list = await db.query.lists.findFirst({ where: eq(schema.lists.id, parsed.data.listId) });
  if (!list || list.userId !== user.id) return;

  await db.delete(schema.lists).where(eq(schema.lists.id, parsed.data.listId));

  revalidatePath(`/u/${user.username}/lists`);
  redirect(`/u/${user.username}/lists`);
}
