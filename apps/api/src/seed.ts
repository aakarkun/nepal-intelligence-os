import path from "node:path";
import type { NationalSummary } from "@repo/shared";
import { ConstituencyResultSchema, NationalSummarySchema } from "@repo/shared";
import {
  hydrateElectionFromDb,
  resetElectionData,
  updateNationalSummary,
  updateConstituencyResult,
} from "./store";

const FIXTURES_DIR = path.resolve(import.meta.dir, "../../worker/fixtures");

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const PARTY_BRAND_COLORS: Record<string, string> = {
  rsp: "#1a97d5",
  nc: "#3f653b",
  "ncp-uml": "#ee1c25",
  "ncp-mc": "#ef4444",
  rppp: "#f97316",
  jspn: "#ef4444",
  nwpp: "#6b7280",
  ind: "#888888",
  others: "#666666",
};

function resolveParty(partyName?: string | null): { partyId: string; partyColor: string } {
  const name = (partyName ?? "").toLowerCase();
  if (!name) return { partyId: "others", partyColor: PARTY_BRAND_COLORS.others };

  if (name.includes("rastriya swatantra") || name.includes("swatantra")) {
    return { partyId: "rsp", partyColor: PARTY_BRAND_COLORS.rsp };
  }
  if (name.includes("congress")) {
    return { partyId: "nc", partyColor: PARTY_BRAND_COLORS.nc };
  }
  if (name.includes("uml")) {
    return { partyId: "ncp-uml", partyColor: PARTY_BRAND_COLORS["ncp-uml"] };
  }
  if (name.includes("maoist") || name.includes("communist")) {
    return { partyId: "ncp-mc", partyColor: PARTY_BRAND_COLORS["ncp-mc"] };
  }
  if (name.includes("prajatantra")) {
    return { partyId: "rppp", partyColor: PARTY_BRAND_COLORS.rppp };
  }
  if (name.includes("samajbadi")) {
    return { partyId: "jspn", partyColor: PARTY_BRAND_COLORS.jspn };
  }
  if (name.includes("independent")) {
    return { partyId: "ind", partyColor: PARTY_BRAND_COLORS.ind };
  }

  return { partyId: slugify(partyName ?? "others"), partyColor: PARTY_BRAND_COLORS.others };
}

function deriveNationalSummaryFromConstituencies(input: {
  rows: { party: string | null; status: string | null }[];
  timestamp: string;
}): NationalSummary {
  const partyCounts = new Map<string, { partyName: string; seatsLeading: number }>();
  let countedConstituencies = 0;
  for (const r of input.rows) {
    if (r.status) countedConstituencies++;
    if (!r.party) continue;
    const existing = partyCounts.get(r.party);
    partyCounts.set(r.party, {
      partyName: r.party,
      seatsLeading: (existing?.seatsLeading ?? 0) + 1,
    });
  }
  const partyResults = Array.from(partyCounts.values())
    .sort((a, b) => b.seatsLeading - a.seatsLeading)
    .map(({ partyName, seatsLeading }) => {
      const resolved = resolveParty(partyName);
      return {
      partyId: resolved.partyId,
      partyName,
      partyShortName: partyName,
      partyColor: resolved.partyColor,
      seatsWon: 0,
      seatsLeading,
      totalVotes: 0,
      };
    });

  return {
    totalSeats: input.rows.length,
    totalConstituencies: input.rows.length,
    countedConstituencies,
    totalVotesCast: 0,
    timestamp: input.timestamp,
    partyResults,
    sourceId: "derived",
    sourceName: "Derived from constituency_results",
    sourceFetchedAt: input.timestamp,
  };
}

export async function seedFromFixturesIfEmpty(): Promise<void> {
  const [
    { getConstituencyResults },
    { getNationalSummary, listNationalSummaryDatasetIds, upsertNationalSummary },
  ] =
    await Promise.all([
      import("./db/repos/constituency-results.js"),
      import("./db/repos/national-summaries.js"),
    ]);

  const [existingConstituencies, existingSummaryMeta] = await Promise.all([
    getConstituencyResults({}),
    listNationalSummaryDatasetIds(),
  ]);

  const shouldSeedConstituencies = existingConstituencies.length === 0;
  const shouldSeedSummaries = existingSummaryMeta.length === 0;
  const existingSummaryDatasetIds = new Set(existingSummaryMeta.map((m) => m.datasetId));
  const existingConstituencyDatasetIds = new Set(existingConstituencies.map((r) => r.dataset));
  const missingSummariesForDatasets = Array.from(existingConstituencyDatasetIds).filter(
    (datasetId) => !existingSummaryDatasetIds.has(datasetId)
  );

  // We also want to re-derive placeholder summaries (sourceId === "derived") so partyId/partyColor
  // stays in sync with our resolver.
  let shouldUpgradeDerivedSummaries = false;
  if (existingConstituencies.length > 0 && existingSummaryMeta.length > 0) {
    for (const { datasetId } of existingSummaryMeta) {
      if (!existingConstituencyDatasetIds.has(datasetId)) continue;
      const payload = await getNationalSummary(datasetId);
      if (payload?.sourceId === "derived") {
        shouldUpgradeDerivedSummaries = true;
        break;
      }
    }
  }

  const shouldDeriveOrUpgradeSummaries =
    (missingSummariesForDatasets.length > 0 || shouldUpgradeDerivedSummaries) &&
    existingConstituencies.length > 0;

  if (!shouldSeedConstituencies && !shouldSeedSummaries && !shouldDeriveOrUpgradeSummaries) return;

  try {
    let mutatedDb = false;
    const [constituenciesRaw, summariesRaw] = await Promise.all([
      shouldSeedConstituencies
        ? Bun.file(path.join(FIXTURES_DIR, "constituency_results.json")).json()
        : Promise.resolve([]),
      shouldSeedSummaries
        ? Bun.file(path.join(FIXTURES_DIR, "national_summary.json")).json()
        : Promise.resolve([]),
    ]);

    if (shouldSeedConstituencies) {
      const constituencyList = Array.isArray(constituenciesRaw) ? constituenciesRaw : [];
      let seeded = 0;
      for (const item of constituencyList) {
        const parsed = ConstituencyResultSchema.safeParse(item);
        if (parsed.success) {
          await updateConstituencyResult(parsed.data);
          seeded++;
        }
      }
      if (seeded > 0) {
        mutatedDb = true;
        console.log(
          `[nepal-intelligence-os] Seeded ${seeded} constituency results from fixtures`
        );
      }
    }

    if (shouldSeedSummaries) {
      const summaryList = Array.isArray(summariesRaw) ? summariesRaw : [];
      const validSummaries: NationalSummary[] = [];
      for (const item of summaryList) {
        const parsed = NationalSummarySchema.safeParse(item);
        if (parsed.success) validSummaries.push(parsed.data);
      }
      if (validSummaries.length > 0) {
        const latest = validSummaries.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0];
        await updateNationalSummary(latest);
        mutatedDb = true;
        console.log("[nepal-intelligence-os] Seeded national summary from fixtures");
      }
    }

    // Common when election scraping is disabled after a run: constituency rows exist but no matching
    // national summary for that dataset (or the summary is already a derived placeholder). Derive a
    // minimal summary so the UI has a dataset to show.
    const [constituencyRowsAfter, summaryMetaAfter] = await Promise.all([
      getConstituencyResults({}),
      listNationalSummaryDatasetIds(),
    ]);
    const summaryDatasetIdsAfter = new Set(summaryMetaAfter.map((m) => m.datasetId));
    const derivedSummaryDatasetIds = new Set<string>();
    for (const { datasetId } of summaryMetaAfter) {
      const row = await getNationalSummary(datasetId);
      if (row?.sourceId === "derived") derivedSummaryDatasetIds.add(datasetId);
    }
    const byDataset = new Map<
      string,
      { rows: { party: string | null; status: string | null }[]; maxTs: string }
    >();
    for (const r of constituencyRowsAfter) {
      if (summaryDatasetIdsAfter.has(r.dataset) && !derivedSummaryDatasetIds.has(r.dataset)) continue;
      const entry = byDataset.get(r.dataset) ?? { rows: [], maxTs: r.updatedAt };
      entry.rows.push({ party: r.party, status: r.status });
      if (new Date(r.updatedAt).getTime() > new Date(entry.maxTs).getTime()) entry.maxTs = r.updatedAt;
      byDataset.set(r.dataset, entry);
    }
    if (byDataset.size > 0) {
      for (const [datasetId, v] of byDataset.entries()) {
        const derived = deriveNationalSummaryFromConstituencies({
          rows: v.rows,
          timestamp: v.maxTs,
        });
        await upsertNationalSummary(datasetId, derived);
      }
      mutatedDb = true;
      console.log(
        `[nepal-intelligence-os] Derived national summaries for ${byDataset.size} dataset(s) from constituency_results`
      );
    }

    // If we wrote to DB after the initial hydrate at API startup, refresh in-memory election datasets
    // so `/v1/election-datasets` and related endpoints reflect the newly seeded rows immediately.
    if (mutatedDb) {
      resetElectionData();
      await hydrateElectionFromDb();
    }
  } catch (e) {
    console.warn(
      "[nepal-intelligence-os] Seed skipped (fixtures not found or invalid):",
      e instanceof Error ? e.message : e
    );
  }
}
