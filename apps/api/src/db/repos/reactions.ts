import { eq, and } from "drizzle-orm";
import { db } from "../client.js";
import { reactions } from "../schema.js";

export async function insertReaction(reaction: {
  id: string;
  itemId: string;
  itemTitle: string;
  reaction: "like";
  email: string | null;
  fingerprint: string;
}): Promise<void> {
  await db.insert(reactions).values({
    id: reaction.id,
    itemId: reaction.itemId,
    itemTitle: reaction.itemTitle,
    reaction: reaction.reaction,
    email: reaction.email ?? null,
    fingerprint: reaction.fingerprint,
    createdAt: new Date().toISOString(),
  }).onConflictDoNothing();
}

export async function deleteReaction(itemId: string, fingerprint: string): Promise<void> {
  await db.delete(reactions).where(and(eq(reactions.itemId, itemId), eq(reactions.fingerprint, fingerprint)));
}

export async function getReactionStatus(
  itemId: string,
  fp: string | undefined
): Promise<{ count: number; liked: boolean }> {
  const rows = await db.select().from(reactions).where(eq(reactions.itemId, itemId));
  const count = rows.length;
  const liked = fp != null && rows.some((r) => r.fingerprint === fp);
  return { count, liked };
}

export async function getReactionsBatch(
  itemIds: string[],
  fp: string | undefined
): Promise<Record<string, { count: number; liked: boolean }>> {
  const result: Record<string, { count: number; liked: boolean }> = {};
  for (const id of itemIds.slice(0, 50)) {
    result[id] = await getReactionStatus(id, fp);
  }
  return result;
}

export async function associateEmail(fingerprint: string, email: string): Promise<number> {
  const rows = await db.select().from(reactions).where(eq(reactions.fingerprint, fingerprint));
  let updated = 0;
  for (const r of rows) {
    if (r.email == null) {
      await db.update(reactions).set({ email: email }).where(eq(reactions.id, r.id));
      updated++;
    }
  }
  return updated;
}
