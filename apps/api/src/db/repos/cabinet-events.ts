import { desc } from "drizzle-orm";
import { db } from "../client.js";
import { cabinetEvents } from "../schema.js";
import type { CabinetEvent } from "@repo/shared";

function rowToEvent(row: typeof cabinetEvents.$inferSelect): CabinetEvent {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary ?? "",
    publishedAt: row.publishedAt,
    source: "RSS Nepal",
    type: row.type as CabinetEvent["type"],
    keywords: Array.isArray(row.keywords) ? (row.keywords as string[]) : [],
    url: undefined,
  };
}

export async function upsertCabinetEvent(event: CabinetEvent): Promise<void> {
  await db.insert(cabinetEvents).values({
    id: event.id,
    title: event.title,
    summary: event.summary ?? null,
    source: event.source ?? null,
    type: event.type,
    keywords: event.keywords ? JSON.parse(JSON.stringify(event.keywords)) : null,
    publishedAt: event.publishedAt,
    ingestedAt: new Date().toISOString(),
  }).onConflictDoUpdate({
    target: cabinetEvents.id,
    set: {
      title: event.title,
      summary: event.summary ?? null,
      type: event.type,
      publishedAt: event.publishedAt,
    },
  });
}

export async function getCabinetEvents(opts?: { limit?: number }): Promise<CabinetEvent[]> {
  const limit = opts?.limit ?? 20;
  const rows = await db.select()
    .from(cabinetEvents)
    .orderBy(desc(cabinetEvents.publishedAt))
    .limit(limit);
  return rows.map(rowToEvent);
}

export async function replaceCabinetEvents(events: CabinetEvent[]): Promise<void> {
  await db.delete(cabinetEvents);
  if (events.length === 0) return;
  const toInsert = events.slice(0, 20).map((event) => ({
    id: event.id,
    title: event.title,
    summary: event.summary ?? null,
    source: event.source ?? null,
    type: event.type,
    keywords: event.keywords ? JSON.parse(JSON.stringify(event.keywords)) : null,
    publishedAt: event.publishedAt,
    ingestedAt: new Date().toISOString(),
  }));
  await db.insert(cabinetEvents).values(toInsert);
}
