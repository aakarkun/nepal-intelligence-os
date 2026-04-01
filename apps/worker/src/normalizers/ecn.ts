import type {
  NationalSummary,
  ConstituencyResult,
  PartyResult,
} from "@repo/shared";
import type { EcnRawResult } from "../sources/ecn";

const FETCHED_AT = new Date().toISOString();

/**
 * Maps raw ECN data to NationalSummary. Returns null if mapping fails or no data.
 */
export function normalizeEcnToSummary(
  raw: EcnRawResult,
  sourceId: string,
  sourceName: string
): NationalSummary | null {
  try {
    const summaries = raw.summaries ?? [];
    if (summaries.length === 0) {
      return null;
    }
    const first = summaries[0] as Record<string, unknown> | undefined;
    if (!first || typeof first !== "object") {
      return null;
    }
    const partyResults = (first.partyResults as PartyResult[] | undefined) ?? [];
    // House of Representatives: 275 total seats = 165 constituency (FPTP) + 110 PR
    const totalSeats = Number(first.totalSeats) || 275;
    const totalConstituencies = Number(first.totalConstituencies) || 165;
    const countedConstituencies =
      Number(first.countedConstituencies) ?? partyResults.reduce((s, p) => s + (Number(p.seatsWon) || 0) + (Number(p.seatsLeading) || 0), 0);
    const totalVotesCast = Number(first.totalVotesCast) || 0;
    const timestamp =
      (typeof first.timestamp === "string" && first.timestamp) || FETCHED_AT;

    const summary: NationalSummary = {
      totalSeats,
      totalConstituencies,
      countedConstituencies,
      totalVotesCast,
      timestamp,
      partyResults: Array.isArray(partyResults) ? partyResults : [],
      sourceId,
      sourceName,
      sourceFetchedAt: FETCHED_AT,
    };
    return summary;
  } catch {
    return null;
  }
}

/**
 * Maps raw ECN constituency rows to ConstituencyResult[]. Invalid entries are skipped.
 */
export function normalizeEcnToConstituencies(
  raw: EcnRawResult,
  sourceId: string,
  sourceName: string
): ConstituencyResult[] {
  const items = raw.constituencies ?? [];
  const results: ConstituencyResult[] = [];

  for (const item of items) {
    try {
      const row = item as Record<string, unknown> | undefined;
      if (!row || typeof row !== "object") continue;

      const constituencyId =
        (row.constituencyId as string) ?? (row.id as string) ?? `ecn-${results.length + 1}`;
      const constituencyName =
        (row.constituencyName as string) ?? (row.name as string) ?? constituencyId;
      const districtName = (row.districtName as string) ?? "Unknown";
      const provinceId = Number(row.provinceId) || 1;
      const status =
        (row.status as "counting" | "final" | "stale" | "error") ?? "counting";
      const totalVotes = Number(row.totalVotes) || 0;
      const lastUpdate =
        (row.lastUpdate as string) ?? (row.timestamp as string) ?? FETCHED_AT;
      const candidates = (row.candidates as ConstituencyResult["candidates"]) ?? [];

      results.push({
        constituencyId,
        constituencyName,
        districtName,
        provinceId,
        status,
        totalVotes,
        lastUpdate,
        candidates: Array.isArray(candidates) ? candidates : [],
        sourceId,
        sourceName,
        sourceFetchedAt: FETCHED_AT,
      });
    } catch {
      // skip invalid row
    }
  }

  return results;
}
