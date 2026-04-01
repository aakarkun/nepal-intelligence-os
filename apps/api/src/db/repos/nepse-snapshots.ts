import { desc } from "drizzle-orm";
import { db } from "../client.js";
import { nepseSnapshots } from "../schema.js";

export type NepseSnapshotRow = {
  id: string;
  indexValue: number | null;
  change: number | null;
  changePercent: number | null;
  turnover: number | null;
  marketStatus: string | null;
  topGainers: unknown;
  topLosers: unknown;
  scrapedAt: string;
};

export async function insertNepseSnapshot(snapshot: NepseSnapshotRow): Promise<void> {
  await db.insert(nepseSnapshots).values({
    id: snapshot.id,
    indexValue: snapshot.indexValue ?? null,
    change: snapshot.change ?? null,
    changePercent: snapshot.changePercent ?? null,
    turnover: snapshot.turnover ?? null,
    marketStatus: snapshot.marketStatus ?? null,
    topGainers: snapshot.topGainers ? JSON.parse(JSON.stringify(snapshot.topGainers)) : null,
    topLosers: snapshot.topLosers ? JSON.parse(JSON.stringify(snapshot.topLosers)) : null,
    scrapedAt: snapshot.scrapedAt,
  });
}

export async function getLatestNepseSnapshot(): Promise<NepseSnapshotRow | null> {
  const rows = await db.select()
    .from(nepseSnapshots)
    .orderBy(desc(nepseSnapshots.scrapedAt))
    .limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    indexValue: r.indexValue,
    change: r.change,
    changePercent: r.changePercent,
    turnover: r.turnover,
    marketStatus: r.marketStatus,
    topGainers: r.topGainers,
    topLosers: r.topLosers,
    scrapedAt: r.scrapedAt,
  };
}

export async function listNepseSnapshots(limit = 200): Promise<NepseSnapshotRow[]> {
  const rows = await db.select()
    .from(nepseSnapshots)
    .orderBy(desc(nepseSnapshots.scrapedAt))
    .limit(Math.max(1, Math.min(limit, 2000)));
  return rows.map((r) => ({
    id: r.id,
    indexValue: r.indexValue,
    change: r.change,
    changePercent: r.changePercent,
    turnover: r.turnover,
    marketStatus: r.marketStatus,
    topGainers: r.topGainers,
    topLosers: r.topLosers,
    scrapedAt: r.scrapedAt,
  }));
}
