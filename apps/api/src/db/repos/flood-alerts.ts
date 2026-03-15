import { eq, and } from "drizzle-orm";
import { db } from "../client.js";
import { floodAlerts } from "../schema.js";
import type { FloodAlert } from "@repo/shared";

function rowToAlert(row: typeof floodAlerts.$inferSelect): FloodAlert {
  return {
    id: row.id,
    stationName: row.stationName,
    river: row.river ?? "",
    district: row.district ?? "",
    province: row.province ?? 1,
    waterLevel: row.waterLevel ?? 0,
    normalLevel: row.normalLevel ?? 0,
    warningLevel: row.warningLevel ?? 0,
    dangerLevel: row.dangerLevel ?? 0,
    status: row.status as FloodAlert["status"],
    trend: row.trend as FloodAlert["trend"] | undefined,
    observedAt: row.observedAt,
    source: row.source as FloodAlert["source"],
  };
}

export async function replaceFloodAlerts(alerts: FloodAlert[]): Promise<void> {
  await db.delete(floodAlerts);
  if (alerts.length === 0) return;
  await db.insert(floodAlerts).values(
    alerts.map((a) => ({
      id: a.id,
      stationName: a.stationName,
      river: a.river ?? null,
      district: a.district ?? null,
      province: a.province ?? null,
      waterLevel: a.waterLevel ?? null,
      normalLevel: a.normalLevel ?? null,
      warningLevel: a.warningLevel ?? null,
      dangerLevel: a.dangerLevel ?? null,
      status: a.status,
      trend: a.trend ?? null,
      source: a.source,
      seasonInactive: false,
      lat: null,
      lng: null,
      observedAt: a.observedAt,
      ingestedAt: new Date().toISOString(),
    }))
  );
}

export async function getFloodAlerts(opts?: { status?: string }): Promise<FloodAlert[]> {
  const rows = await db.select()
    .from(floodAlerts)
    .where(opts?.status ? eq(floodAlerts.status, opts.status) : undefined);
  return rows.map(rowToAlert);
}
