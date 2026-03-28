import { eq } from "drizzle-orm";
import { db } from "../client.js";
import { workerState } from "../schema.js";

export type WorkerStateRow = {
  id: string;
  lastNepseRunAt: number | null;
  lastCoingeckoRunAt: number | null;
  lastMetalsRunAt: number | null;
  lastNrbRunAt: number | null;
  lastNewsRunAt: number | null;
  lastRssNepalRunAt: number | null;
  lastParliamentRunAt: number | null;
  lastDhmRunAt: number | null;
  lastGdacsRunAt: number | null;
  lastGdeltRunAt: number | null;
  lastUnRssRunAt: number | null;
  lastUsgsRunAt: number | null;
  lastPoliticalRssRunAt: number | null;
  lastParliamentBillsRunAt: number | null;
  lastGazetteRunAt: number | null;
  lastWeeklyDigestRunAt: number | null;
  updatedAt: Date | string;
};

export async function getWorkerState(): Promise<WorkerStateRow | null> {
  const rows = await db.select().from(workerState).where(eq(workerState.id, "singleton")).limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  // Coerce bigint to number (driver may return string); avoids NaN in shouldRun() comparisons
  const toNum = (v: number | string | null | undefined): number | null =>
    v == null ? null : Number(v);
  return {
    id: r.id,
    lastNepseRunAt: toNum(r.lastNepseRunAt),
    lastCoingeckoRunAt: toNum(r.lastCoingeckoRunAt),
    lastMetalsRunAt: toNum(r.lastMetalsRunAt),
    lastNrbRunAt: toNum(r.lastNrbRunAt),
    lastNewsRunAt: toNum(r.lastNewsRunAt),
    lastRssNepalRunAt: toNum(r.lastRssNepalRunAt),
    lastParliamentRunAt: toNum(r.lastParliamentRunAt),
    lastDhmRunAt: toNum(r.lastDhmRunAt),
    lastGdacsRunAt: toNum(r.lastGdacsRunAt),
    lastGdeltRunAt: toNum(r.lastGdeltRunAt),
    lastUnRssRunAt: toNum(r.lastUnRssRunAt),
    lastUsgsRunAt: toNum(r.lastUsgsRunAt),
    lastPoliticalRssRunAt: toNum(r.lastPoliticalRssRunAt),
    lastParliamentBillsRunAt: toNum(r.lastParliamentBillsRunAt),
    lastGazetteRunAt: toNum(r.lastGazetteRunAt),
    lastWeeklyDigestRunAt: toNum(r.lastWeeklyDigestRunAt),
    updatedAt: r.updatedAt,
  };
}

export async function updateWorkerState(partial: Partial<Omit<WorkerStateRow, "id">>): Promise<void> {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (partial.lastNepseRunAt !== undefined) set.lastNepseRunAt = partial.lastNepseRunAt;
  if (partial.lastCoingeckoRunAt !== undefined) set.lastCoingeckoRunAt = partial.lastCoingeckoRunAt;
  if (partial.lastMetalsRunAt !== undefined) set.lastMetalsRunAt = partial.lastMetalsRunAt;
  if (partial.lastNrbRunAt !== undefined) set.lastNrbRunAt = partial.lastNrbRunAt;
  if (partial.lastNewsRunAt !== undefined) set.lastNewsRunAt = partial.lastNewsRunAt;
  if (partial.lastRssNepalRunAt !== undefined) set.lastRssNepalRunAt = partial.lastRssNepalRunAt;
  if (partial.lastParliamentRunAt !== undefined) set.lastParliamentRunAt = partial.lastParliamentRunAt;
  if (partial.lastDhmRunAt !== undefined) set.lastDhmRunAt = partial.lastDhmRunAt;
  if (partial.lastGdacsRunAt !== undefined) set.lastGdacsRunAt = partial.lastGdacsRunAt;
  if (partial.lastGdeltRunAt !== undefined) set.lastGdeltRunAt = partial.lastGdeltRunAt;
  if (partial.lastUnRssRunAt !== undefined) set.lastUnRssRunAt = partial.lastUnRssRunAt;
  if (partial.lastUsgsRunAt !== undefined) set.lastUsgsRunAt = partial.lastUsgsRunAt;
  if (partial.lastPoliticalRssRunAt !== undefined)
    set.lastPoliticalRssRunAt = partial.lastPoliticalRssRunAt;
  if (partial.lastParliamentBillsRunAt !== undefined)
    set.lastParliamentBillsRunAt = partial.lastParliamentBillsRunAt;
  if (partial.lastGazetteRunAt !== undefined) set.lastGazetteRunAt = partial.lastGazetteRunAt;
  if (partial.lastWeeklyDigestRunAt !== undefined)
    set.lastWeeklyDigestRunAt = partial.lastWeeklyDigestRunAt;
  await db.update(workerState).set(set as typeof workerState.$inferInsert).where(eq(workerState.id, "singleton"));
}
