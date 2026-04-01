import { eq, and, desc } from "drizzle-orm";
import { db } from "../client.js";
import { anomalies } from "../schema.js";

export type AnomalyRow = {
  id: string;
  type: string;
  description: string;
  source: string | null;
  severity: string;
  resolved: boolean;
  detectedAt: string;
  resolvedAt: string | null;
};

export async function insertAnomaly(anomaly: AnomalyRow): Promise<void> {
  await db.insert(anomalies).values({
    id: anomaly.id,
    type: anomaly.type,
    description: anomaly.description,
    source: anomaly.source ?? null,
    severity: anomaly.severity ?? "warning",
    resolved: anomaly.resolved ?? false,
    detectedAt: anomaly.detectedAt,
    resolvedAt: anomaly.resolvedAt ?? null,
  });
}

export async function getAnomalies(opts?: { resolved?: boolean; limit?: number }): Promise<AnomalyRow[]> {
  const conditions = [];
  if (opts?.resolved !== undefined) conditions.push(eq(anomalies.resolved, opts.resolved));
  const limit = opts?.limit ?? 100;
  const rows = await db.select()
    .from(anomalies)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(anomalies.detectedAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    description: r.description,
    source: r.source,
    severity: r.severity,
    resolved: r.resolved,
    detectedAt: r.detectedAt,
    resolvedAt: r.resolvedAt,
  }));
}

export async function resolveAnomaly(id: string): Promise<void> {
  await db.update(anomalies)
    .set({ resolved: true, resolvedAt: new Date().toISOString() })
    .where(eq(anomalies.id, id));
}
