import { eq, desc } from "drizzle-orm";
import { db } from "../client.js";
import { nationalSummaries } from "../schema.js";
import type { NationalSummary } from "@repo/shared";

export async function upsertNationalSummary(
  datasetId: string,
  payload: NationalSummary
): Promise<void> {
  const updatedAt = payload.timestamp ?? new Date().toISOString();
  await db
    .insert(nationalSummaries)
    .values({
      datasetId,
      payload: payload as unknown as Record<string, unknown>,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: nationalSummaries.datasetId,
      set: { payload: payload as unknown as Record<string, unknown>, updatedAt },
    });
}

export async function getNationalSummary(
  datasetId: string
): Promise<NationalSummary | null> {
  const rows = await db
    .select()
    .from(nationalSummaries)
    .where(eq(nationalSummaries.datasetId, datasetId))
    .limit(1);
  const row = rows[0];
  if (!row?.payload) return null;
  return row.payload as unknown as NationalSummary;
}

export async function listNationalSummaryDatasetIds(): Promise<
  { datasetId: string; updatedAt: string }[]
> {
  const rows = await db
    .select({ datasetId: nationalSummaries.datasetId, updatedAt: nationalSummaries.updatedAt })
    .from(nationalSummaries)
    .orderBy(desc(nationalSummaries.updatedAt));
  return rows;
}
