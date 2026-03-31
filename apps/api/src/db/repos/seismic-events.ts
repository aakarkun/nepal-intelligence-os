import { eq, and, gte, desc } from "drizzle-orm";
import { db } from "../client.js";
import { seismicEvents } from "../schema.js";

export type SeismicEventRow = {
  id: string;
  magnitude: number;
  place: string | null;
  depth: number | null;
  lat: number | null;
  lng: number | null;
  usgsUrl: string | null;
  sig: number | null;
  occurredAt: string;
  ingestedAt: string;
};

export async function upsertSeismicEvent(event: SeismicEventRow): Promise<void> {
  await db.insert(seismicEvents).values({
    id: event.id,
    magnitude: event.magnitude,
    place: event.place ?? null,
    depth: event.depth ?? null,
    lat: event.lat ?? null,
    lng: event.lng ?? null,
    usgsUrl: event.usgsUrl ?? null,
    sig: event.sig ?? null,
    occurredAt: event.occurredAt,
    ingestedAt: event.ingestedAt ?? new Date().toISOString(),
  }).onConflictDoUpdate({
    target: seismicEvents.id,
    set: {
      magnitude: event.magnitude,
      place: event.place ?? null,
      occurredAt: event.occurredAt,
    },
  });
}

export async function getSeismicEvents(opts?: { limit?: number; minMagnitude?: number }): Promise<SeismicEventRow[]> {
  const conditions = [];
  if (opts?.minMagnitude != null) conditions.push(gte(seismicEvents.magnitude, opts.minMagnitude));
  const limit = opts?.limit ?? 50;
  const rows = await db.select()
    .from(seismicEvents)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(seismicEvents.occurredAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    magnitude: r.magnitude,
    place: r.place,
    depth: r.depth,
    lat: r.lat,
    lng: r.lng,
    usgsUrl: r.usgsUrl,
    sig: r.sig,
    occurredAt: r.occurredAt,
    ingestedAt: r.ingestedAt,
  }));
}
