import { eq } from "drizzle-orm";
import { db } from "../client.js";
import { watchlistItems } from "../schema.js";
import type { WatchlistItem } from "@repo/shared";

function rowToItem(row: typeof watchlistItems.$inferSelect): WatchlistItem {
  return {
    id: row.id,
    label: row.label,
    type: row.type as WatchlistItem["type"],
    value: row.value,
    threshold: row.threshold ?? undefined,
    telegramChatId: row.telegramChatId ?? undefined,
    createdAt: row.createdAt,
    lastTriggeredAt: row.lastTriggeredAt ?? undefined,
    active: row.active,
  };
}

export async function getWatchlistItems(): Promise<WatchlistItem[]> {
  const rows = await db.select().from(watchlistItems);
  return rows.map(rowToItem);
}

export async function insertWatchlistItem(item: WatchlistItem): Promise<void> {
  await db.insert(watchlistItems).values({
    id: item.id,
    label: item.label,
    type: item.type,
    value: item.value,
    threshold: item.threshold ?? null,
    telegramChatId: item.telegramChatId ?? null,
    active: item.active ?? true,
    createdAt: item.createdAt,
    lastTriggeredAt: item.lastTriggeredAt ?? null,
    lastTriggeredSignalId: null,
  });
}

export async function deleteWatchlistItem(id: string): Promise<boolean> {
  const existing = await db.select().from(watchlistItems).where(eq(watchlistItems.id, id)).limit(1);
  if (existing.length === 0) return false;
  await db.delete(watchlistItems).where(eq(watchlistItems.id, id));
  return true;
}

export async function toggleWatchlistItem(id: string): Promise<WatchlistItem | null> {
  const rows = await db.select().from(watchlistItems).where(eq(watchlistItems.id, id)).limit(1);
  if (rows.length === 0) return null;
  await db.update(watchlistItems).set({ active: !rows[0].active }).where(eq(watchlistItems.id, id));
  const updated = await db.select().from(watchlistItems).where(eq(watchlistItems.id, id)).limit(1);
  return updated[0] ? rowToItem(updated[0]) : null;
}

export async function updateWatchlistTriggered(id: string, signalId: string): Promise<void> {
  await db.update(watchlistItems)
    .set({ lastTriggeredAt: new Date().toISOString(), lastTriggeredSignalId: signalId })
    .where(eq(watchlistItems.id, id));
}
