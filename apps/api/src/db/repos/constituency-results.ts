import { eq, and, desc } from "drizzle-orm";
import { db } from "../client.js";
import { constituencyResults } from "../schema.js";

export type ConstituencyResultRow = {
  id: string;
  name: string;
  district: string | null;
  province: number | null;
  leadingCandidate: string | null;
  party: string | null;
  margin: number | null;
  totalVotes: number | null;
  percentReported: number | null;
  status: string | null;
  /** Full result JSON when available (multi-candidate breakdown). */
  payload?: unknown | null;
  dataset: string;
  updatedAt: string;
};

export async function upsertConstituencyResult(result: ConstituencyResultRow): Promise<void> {
  await db.insert(constituencyResults).values({
    id: result.id,
    name: result.name,
    district: result.district ?? null,
    province: result.province ?? null,
    leadingCandidate: result.leadingCandidate ?? null,
    party: result.party ?? null,
    margin: result.margin ?? null,
    totalVotes: result.totalVotes ?? null,
    percentReported: result.percentReported ?? null,
    status: result.status ?? null,
    dataset: result.dataset ?? "current",
    updatedAt: result.updatedAt ?? new Date().toISOString(),
  }).onConflictDoUpdate({
    target: constituencyResults.id,
    set: {
      name: result.name,
      district: result.district ?? null,
      province: result.province ?? null,
      leadingCandidate: result.leadingCandidate ?? null,
      party: result.party ?? null,
      margin: result.margin ?? null,
      totalVotes: result.totalVotes ?? null,
      percentReported: result.percentReported ?? null,
      status: result.status ?? null,
      dataset: result.dataset ?? "current",
      updatedAt: result.updatedAt ?? new Date().toISOString(),
    },
  });
}

export async function getConstituencyResults(opts?: {
  dataset?: string;
  district?: string;
}): Promise<ConstituencyResultRow[]> {
  const conditions = [];
  if (opts?.dataset) conditions.push(eq(constituencyResults.dataset, opts.dataset));
  if (opts?.district) conditions.push(eq(constituencyResults.district, opts.district));
  const rows = await db.select()
    .from(constituencyResults)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(constituencyResults.updatedAt));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    district: r.district,
    province: r.province,
    leadingCandidate: r.leadingCandidate,
    party: r.party,
    margin: r.margin,
    totalVotes: r.totalVotes,
    percentReported: r.percentReported,
    status: r.status,
    payload: r.payload ?? null,
    dataset: r.dataset,
    updatedAt: r.updatedAt,
  }));
}
