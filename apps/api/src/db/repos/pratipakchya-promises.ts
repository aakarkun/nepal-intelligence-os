import { asc, desc, eq } from "drizzle-orm";
import { db } from "../client.js";
import { pratipakchyaPromises } from "../schema.js";

export type PratipakchyaPromiseRow = {
  id: number;
  category: string;
  categoryNe: string | null;
  categoryEn: string | null;
  titleNe: string | null;
  titleEn: string | null;
  deadline: string | null;
  deadlineDate: string | null;
  status: string;
  progress: number;
  lastUpdated: string | null;
  evidence: string | null;
  notes: string | null;
  payload: unknown;
  fetchedAt: string;
  updatedAt: string;
};

function rowToApi(row: typeof pratipakchyaPromises.$inferSelect): PratipakchyaPromiseRow {
  return {
    id: row.id,
    category: row.category,
    categoryNe: row.categoryNe ?? null,
    categoryEn: row.categoryEn ?? null,
    titleNe: row.titleNe ?? null,
    titleEn: row.titleEn ?? null,
    deadline: row.deadline ?? null,
    deadlineDate: row.deadlineDate ? String(row.deadlineDate) : null,
    status: row.status,
    progress: row.progress ?? 0,
    lastUpdated: row.lastUpdated ? String(row.lastUpdated) : null,
    evidence: row.evidence ?? null,
    notes: row.notes ?? null,
    payload: row.payload,
    fetchedAt: row.fetchedAt,
    updatedAt: row.updatedAt,
  };
}

export async function listPromises(limit = 200): Promise<PratipakchyaPromiseRow[]> {
  const rows = await db
    .select()
    .from(pratipakchyaPromises)
    .orderBy(asc(pratipakchyaPromises.id))
    .limit(Math.min(1000, Math.max(1, limit)));
  return rows.map(rowToApi);
}

export async function getPromiseById(id: number): Promise<PratipakchyaPromiseRow | null> {
  const rows = await db
    .select()
    .from(pratipakchyaPromises)
    .where(eq(pratipakchyaPromises.id, id))
    .limit(1);
  return rows[0] ? rowToApi(rows[0]) : null;
}

export async function upsertPromises(
  rows: Array<Omit<PratipakchyaPromiseRow, "fetchedAt" | "updatedAt"> & { fetchedAt?: string; updatedAt?: string }>
): Promise<{ upserted: number; newestUpdatedAt: string | null }> {
  const now = new Date().toISOString();
  let newestUpdatedAt: string | null = null;

  for (const r of rows) {
    const updatedAt = r.updatedAt ?? now;
    const fetchedAt = r.fetchedAt ?? now;
    if (!newestUpdatedAt || updatedAt > newestUpdatedAt) newestUpdatedAt = updatedAt;

    await db
      .insert(pratipakchyaPromises)
      .values({
        id: r.id,
        category: r.category,
        categoryNe: r.categoryNe,
        categoryEn: r.categoryEn,
        titleNe: r.titleNe,
        titleEn: r.titleEn,
        deadline: r.deadline,
        deadlineDate: r.deadlineDate ? new Date(r.deadlineDate) : null,
        status: r.status,
        progress: r.progress,
        lastUpdated: r.lastUpdated ? new Date(r.lastUpdated) : null,
        evidence: r.evidence,
        notes: r.notes,
        payload: JSON.parse(JSON.stringify(r.payload ?? {})),
        fetchedAt,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: pratipakchyaPromises.id,
        set: {
          category: r.category,
          categoryNe: r.categoryNe,
          categoryEn: r.categoryEn,
          titleNe: r.titleNe,
          titleEn: r.titleEn,
          deadline: r.deadline,
          deadlineDate: r.deadlineDate ? new Date(r.deadlineDate) : null,
          status: r.status,
          progress: r.progress,
          lastUpdated: r.lastUpdated ? new Date(r.lastUpdated) : null,
          evidence: r.evidence,
          notes: r.notes,
          payload: JSON.parse(JSON.stringify(r.payload ?? {})),
          fetchedAt,
          updatedAt,
        },
      });
  }

  // Touching DB sequentially is acceptable here (100 rows, low cadence).
  // If we need higher throughput later, we can batch into `INSERT ... VALUES ...` with onConflict.
  const last = await db
    .select({ updatedAt: pratipakchyaPromises.updatedAt })
    .from(pratipakchyaPromises)
    .orderBy(desc(pratipakchyaPromises.updatedAt))
    .limit(1);
  newestUpdatedAt = last[0]?.updatedAt ?? newestUpdatedAt;

  return { upserted: rows.length, newestUpdatedAt };
}

