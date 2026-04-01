import { db } from "../client.js";
import { sourceHealth } from "../schema.js";
import type { SourceHealth } from "@repo/shared";

function rowToHealth(row: typeof sourceHealth.$inferSelect): SourceHealth {
  return {
    sourceId: row.sourceId,
    sourceName: row.label,
    lastUpdate: row.lastSuccessAt ?? row.lastErrorAt ?? new Date(0).toISOString(),
    errorRate: row.errorRate ?? 0,
    status: (row.circuitOpen ? "error" : "live") as SourceHealth["status"],
    updateCount: row.totalUpdates ?? 0,
  };
}

export async function upsertSourceHealth(health: SourceHealth): Promise<void> {
  await db.insert(sourceHealth).values({
    sourceId: health.sourceId,
    label: health.sourceName,
    lastSuccessAt: health.lastUpdate,
    lastErrorAt: null,
    consecutiveFailures: 0,
    totalUpdates: health.updateCount ?? 0,
    errorRate: health.errorRate ?? 0,
    circuitOpen: health.status === "error",
    updatedAt: new Date().toISOString(),
  }).onConflictDoUpdate({
    target: sourceHealth.sourceId,
    set: {
      label: health.sourceName,
      lastSuccessAt: health.lastUpdate,
      totalUpdates: health.updateCount ?? 0,
      errorRate: health.errorRate ?? 0,
      circuitOpen: health.status === "error",
      updatedAt: new Date().toISOString(),
    },
  });
}

export async function getAllSourceHealth(): Promise<SourceHealth[]> {
  const rows = await db.select().from(sourceHealth);
  return rows.map(rowToHealth);
}
