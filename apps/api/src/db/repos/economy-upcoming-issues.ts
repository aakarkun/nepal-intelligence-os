import { asc, desc } from "drizzle-orm";
import { db } from "../client.js";
import { economyUpcomingIssues } from "../schema.js";

export type UpcomingIssueRow = {
  id: string;
  category: string;
  sn: number;
  symbol: string;
  company: string;
  units: number;
  sector: string;
  remark: string;
  sourceUrl: string | null;
  fetchedAt: string;
  updatedAt: string;
};

export type UpcomingIssuesByCategory = Record<string, UpcomingIssueRow[]>;

export type UpcomingIssuesMeta = {
  /** When upstream data was fetched (max row `fetched_at`). */
  asOf: string | null;
  ingestedAt: string | null;
  source: string | null;
};

function rowToApi(row: typeof economyUpcomingIssues.$inferSelect): UpcomingIssueRow {
  return {
    id: row.id,
    category: row.category,
    sn: row.sn,
    symbol: row.symbol,
    company: row.company,
    units: row.units,
    sector: row.sector,
    remark: row.remark,
    sourceUrl: row.sourceUrl ?? null,
    fetchedAt: row.fetchedAt,
    updatedAt: row.updatedAt,
  };
}

export async function listUpcomingIssues(): Promise<UpcomingIssuesByCategory> {
  const rows = await db
    .select()
    .from(economyUpcomingIssues)
    .orderBy(
      asc(economyUpcomingIssues.category),
      asc(economyUpcomingIssues.sn),
      asc(economyUpcomingIssues.symbol)
    );

  const grouped: UpcomingIssuesByCategory = {};
  for (const row of rows) {
    const apiRow = rowToApi(row);
    const bucket = grouped[apiRow.category] ?? [];
    bucket.push(apiRow);
    grouped[apiRow.category] = bucket;
  }
  return grouped;
}

export async function getUpcomingIssuesMeta(): Promise<UpcomingIssuesMeta> {
  const rows = await db
    .select({
      updatedAt: economyUpcomingIssues.updatedAt,
      fetchedAt: economyUpcomingIssues.fetchedAt,
      sourceUrl: economyUpcomingIssues.sourceUrl,
    })
    .from(economyUpcomingIssues)
    .orderBy(desc(economyUpcomingIssues.updatedAt))
    .limit(1);

  const row = rows[0];
  return {
    asOf: row?.fetchedAt ?? null,
    ingestedAt: row?.updatedAt ?? null,
    source: row?.sourceUrl ?? null,
  };
}

export type UpcomingIssueIngestRow = Omit<
  UpcomingIssueRow,
  "id" | "fetchedAt" | "updatedAt" | "sourceUrl"
> & {
  fetchedAt?: string;
  updatedAt?: string;
  sourceUrl?: string | null;
};

function stableUpcomingIssueId(input: {
  category: string;
  symbol: string;
  company: string;
}): string {
  // Stable, human-debuggable key. Id collisions are avoided via unique (category,symbol,company).
  return `upcoming:${input.category}:${input.symbol}:${input.company}`;
}

export async function upsertUpcomingIssues(
  rows: UpcomingIssueIngestRow[]
): Promise<{ upserted: number; newestUpdatedAt: string | null }> {
  const now = new Date().toISOString();
  let newestUpdatedAt: string | null = null;

  for (const r of rows) {
    const updatedAt = r.updatedAt ?? now;
    const fetchedAt = r.fetchedAt ?? now;
    if (!newestUpdatedAt || updatedAt > newestUpdatedAt) newestUpdatedAt = updatedAt;
    const id = stableUpcomingIssueId({
      category: r.category,
      symbol: r.symbol,
      company: r.company,
    });

    await db
      .insert(economyUpcomingIssues)
      .values({
        id,
        category: r.category,
        sn: r.sn,
        symbol: r.symbol,
        company: r.company,
        units: r.units,
        sector: r.sector,
        remark: r.remark,
        sourceUrl: r.sourceUrl ?? null,
        fetchedAt,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: economyUpcomingIssues.id,
        set: {
          category: r.category,
          sn: r.sn,
          symbol: r.symbol,
          company: r.company,
          units: r.units,
          sector: r.sector,
          remark: r.remark,
          sourceUrl: r.sourceUrl ?? null,
          fetchedAt,
          updatedAt,
        },
      });
  }

  const last = await db
    .select({ updatedAt: economyUpcomingIssues.updatedAt })
    .from(economyUpcomingIssues)
    .orderBy(desc(economyUpcomingIssues.updatedAt))
    .limit(1);
  newestUpdatedAt = last[0]?.updatedAt ?? newestUpdatedAt;

  return { upserted: rows.length, newestUpdatedAt };
}

