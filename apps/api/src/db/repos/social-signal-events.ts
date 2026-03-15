import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../client.js";
import { socialSignalEvents } from "../schema.js";
import type { SignalEvent } from "@repo/shared";

function rowToEvent(row: typeof socialSignalEvents.$inferSelect): SignalEvent {
  return {
    id: row.id,
    type: row.type as SignalEvent["type"],
    severity: row.severity as SignalEvent["severity"],
    title: row.title,
    body: row.body ?? "",
    timestamp: row.publishedAt,
    source: row.source ?? undefined,
    url: row.url ?? undefined,
    entities: (row.entities as SignalEvent["entities"]) ?? undefined,
  };
}

export async function insertSocialSignalEvent(event: SignalEvent): Promise<void> {
  await db.insert(socialSignalEvents).values({
    id: event.id,
    title: event.title,
    body: event.body ?? null,
    source: event.source ?? null,
    url: event.url ?? null,
    type: event.type,
    severity: event.severity,
    entities: event.entities ? JSON.parse(JSON.stringify(event.entities)) : null,
    publishedAt: event.timestamp,
    ingestedAt: new Date().toISOString(),
  }).onConflictDoUpdate({
    target: socialSignalEvents.id,
    set: { title: event.title, body: event.body ?? null, type: event.type, severity: event.severity, publishedAt: event.timestamp },
  });
}

export async function getSocialSignalEvents(opts?: {
  limit?: number;
  type?: string;
  severity?: string;
}): Promise<{ events: SignalEvent[]; total: number }> {
  const conditions = [];
  if (opts?.type) conditions.push(eq(socialSignalEvents.type, opts.type));
  if (opts?.severity) conditions.push(eq(socialSignalEvents.severity, opts.severity));

  const limit = opts?.limit ?? 50;
  const [rows, countResult] = await Promise.all([
    db.select()
      .from(socialSignalEvents)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(socialSignalEvents.publishedAt))
      .limit(limit),
    db.select({ count: sql<number>`count(*)::int` })
      .from(socialSignalEvents)
      .where(conditions.length ? and(...conditions) : undefined),
  ]);
  const total = countResult[0]?.count ?? 0;
  return { events: rows.map(rowToEvent), total };
}
