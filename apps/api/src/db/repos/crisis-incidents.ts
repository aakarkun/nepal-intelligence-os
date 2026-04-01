import { eq, and, desc } from "drizzle-orm";
import { db } from "../client.js";
import { crisisIncidents } from "../schema.js";
import type { CrisisIncident } from "@repo/shared";

function rowToIncident(row: typeof crisisIncidents.$inferSelect): CrisisIncident {
  return {
    id: row.id,
    type: row.type as CrisisIncident["type"],
    title: row.title,
    place: "",
    latitude: row.lat ?? 0,
    longitude: row.lng ?? 0,
    timestamp: row.reportedAt,
    sourceId: row.source ?? "",
    url: row.url ?? undefined,
  };
}

export async function upsertCrisisIncident(incident: CrisisIncident): Promise<void> {
  await db.insert(crisisIncidents).values({
    id: incident.id,
    title: incident.title,
    type: incident.type,
    severity: "info",
    district: null,
    province: null,
    lat: incident.latitude ?? null,
    lng: incident.longitude ?? null,
    source: incident.sourceId ?? null,
    url: incident.url ?? null,
    reportedAt: incident.timestamp,
    ingestedAt: new Date().toISOString(),
  }).onConflictDoUpdate({
    target: crisisIncidents.id,
    set: {
      title: incident.title,
      type: incident.type,
      lat: incident.latitude ?? null,
      lng: incident.longitude ?? null,
      reportedAt: incident.timestamp,
    },
  });
}

export async function getCrisisIncidents(opts?: {
  limit?: number;
  type?: string;
  severity?: string;
}): Promise<CrisisIncident[]> {
  const conditions = [];
  if (opts?.type) conditions.push(eq(crisisIncidents.type, opts.type));
  if (opts?.severity) conditions.push(eq(crisisIncidents.severity, opts.severity));
  const limit = opts?.limit ?? 50;
  const rows = await db.select()
    .from(crisisIncidents)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(crisisIncidents.reportedAt))
    .limit(limit);
  return rows.map(rowToIncident);
}

export async function replaceCrisisIncidents(incidents: CrisisIncident[]): Promise<void> {
  await db.delete(crisisIncidents);
  if (incidents.length === 0) return;
  await db.insert(crisisIncidents).values(
    incidents.map((incident) => ({
      id: incident.id,
      title: incident.title,
      type: incident.type,
      severity: "info",
      district: null,
      province: null,
      lat: incident.latitude ?? null,
      lng: incident.longitude ?? null,
      source: incident.sourceId ?? null,
      url: incident.url ?? null,
      reportedAt: incident.timestamp,
      ingestedAt: new Date().toISOString(),
    }))
  );
}
