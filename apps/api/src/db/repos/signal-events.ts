import { eq, and, gte, desc, sql } from "drizzle-orm";
import { db } from "../client.js";
import { signalEvents } from "../schema.js";
import type { SignalEvent } from "@repo/shared";

function entitiesEqual(a: unknown, b: unknown): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

function rowMatchesEvent(
  row: typeof signalEvents.$inferSelect,
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

function rowToEvent(row: typeof signalEvents.$inferSelect): SignalEvent {
  return {
    id: row.id,
    type: row.type as SignalEvent["type"],
    severity: row.severity as SignalEvent["severity"],
    title: row.title,
    body: row.body ?? "",
    timestamp: row.publishedAt,
    districtId: row.province ?? undefined,
    source: row.source ?? undefined,
    url: row.url ?? undefined,
    entities: (row.entities as SignalEvent["entities"]) ?? undefined,
  };
}

export async function insertSignalEvent(event: SignalEvent): Promise<void> {
  const existing = await db
    .select()
    .from(signalEvents)
    .where(eq(signalEvents.id, event.id))
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

  await db.insert(signalEvents).values({
    id: event.id,
    title: event.title,
    body: event.body ?? null,
    source: event.source ?? null,
    url: event.url ?? null,
    type: event.type,
    severity: event.severity,
    entities: event.entities ? JSON.parse(JSON.stringify(event.entities)) : null,
    district: null,
    province: event.districtId ?? null,
    lat: null,
    lng: null,
    publishedAt: publishedAtToStore,
    ingestedAt: new Date().toISOString(),
  }).onConflictDoUpdate({
    target: signalEvents.id,
    set: {
      title: event.title,
      body: event.body ?? null,
      type: event.type,
      severity: event.severity,
      publishedAt: publishedAtToStore,
    },
  });
}

export async function getSignalEvents(opts?: {
  limit?: number;
  offset?: number;
  type?: string;
  severity?: string;
  since?: Date;
}): Promise<{ events: SignalEvent[]; total: number }> {
  const conditions = [];
  if (opts?.type) conditions.push(eq(signalEvents.type, opts.type));
  if (opts?.severity) conditions.push(eq(signalEvents.severity, opts.severity));
  if (opts?.since) conditions.push(gte(signalEvents.publishedAt, opts.since.toISOString()));

  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  const [rows, countResult] = await Promise.all([
    db.select()
      .from(signalEvents)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(signalEvents.publishedAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` })
      .from(signalEvents)
      .where(conditions.length ? and(...conditions) : undefined),
  ]);

  const total = countResult[0]?.count ?? 0;
  return { events: rows.map(rowToEvent), total };
}
