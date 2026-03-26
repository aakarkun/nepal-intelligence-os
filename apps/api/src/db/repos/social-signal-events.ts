import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../client.js";
import { socialSignalEvents } from "../schema.js";
import type { SignalEvent } from "@repo/shared";

function entitiesEqual(a: unknown, b: unknown): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

function rowMatchesEvent(
  row: typeof socialSignalEvents.$inferSelect,
  event: SignalEvent
): boolean {
  return (
    row.title === event.title &&
    (row.body ?? "") === (event.body ?? "") &&
    row.publishedAt === event.timestamp &&
    row.type === event.type &&
    row.severity === event.severity &&
    (row.source ?? null) === (event.source ?? null) &&
    (row.url ?? null) === (event.url ?? null) &&
    entitiesEqual(row.entities, event.entities)
  );
}

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
  const existing = await db
    .select()
    .from(socialSignalEvents)
    .where(eq(socialSignalEvents.id, event.id))
    .limit(1);

  const existingPublishedAt = existing[0]?.publishedAt ?? null;
  const newPublishedAtMs = Date.parse(event.timestamp);
  const existingPublishedAtMs = existingPublishedAt ? Date.parse(existingPublishedAt) : NaN;
  const publishedAtToStore =
    existingPublishedAt && Number.isFinite(existingPublishedAtMs) && Number.isFinite(newPublishedAtMs)
      ? newPublishedAtMs < existingPublishedAtMs
        ? event.timestamp
        : existingPublishedAt
      : event.timestamp;

  if (existing[0] && rowMatchesEvent(existing[0], event)) {
    return;
  }

  await db.insert(socialSignalEvents).values({
    id: event.id,
    title: event.title,
    body: event.body ?? null,
    source: event.source ?? null,
    url: event.url ?? null,
    type: event.type,
    severity: event.severity,
    entities: event.entities ? JSON.parse(JSON.stringify(event.entities)) : null,
    publishedAt: publishedAtToStore,
    ingestedAt: new Date().toISOString(),
  }).onConflictDoUpdate({
    target: socialSignalEvents.id,
    set: { title: event.title, body: event.body ?? null, type: event.type, severity: event.severity, publishedAt: publishedAtToStore },
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
