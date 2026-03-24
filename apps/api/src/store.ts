/**
 * Store: re-exports from PostgreSQL repos (src/db/repos) with same signatures
 * for route compatibility. In-memory state only for data without a table yet
 * (election datasets, national summary, constituency results, forex, economy,
 * market assets, nepse summary, market portal snapshot, crisis summary, earthquake incidents, flood metadata).
 */

import type {
  NationalSummary,
  ConstituencyResult,
  SignalEvent,
  Anomaly,
  SourceHealth,
  EarthquakeIncident,
  CrisisSummary,
  CrisisIncident,
  FloodAlert,
  ForexRate,
  EconomySummary,
  MarketAssetQuote,
  NepseSummary,
  MarketPortalSnapshot,
  CabinetEvent,
  ParliamentSession,
  GeopoliticsArticle,
  WatchlistItem,
} from "@repo/shared";
import * as signalEventsRepo from "./db/repos/signal-events.js";
import * as socialSignalEventsRepo from "./db/repos/social-signal-events.js";
import * as worldArticlesRepo from "./db/repos/world-articles.js";
import * as watchlistRepo from "./db/repos/watchlist-items.js";
import * as reactionsRepo from "./db/repos/reactions.js";
import * as cabinetRepo from "./db/repos/cabinet-events.js";
import * as parliamentRepo from "./db/repos/parliament-sessions.js";
import * as floodRepo from "./db/repos/flood-alerts.js";
import * as sourceHealthRepo from "./db/repos/source-health.js";
import * as anomaliesRepo from "./db/repos/anomalies.js";
import * as crisisRepo from "./db/repos/crisis-incidents.js";
import * as constituencyRepo from "./db/repos/constituency-results.js";
import * as nationalSummariesRepo from "./db/repos/national-summaries.js";
import * as snapshotsRepo from "./db/repos/snapshots.js";
import * as nepseSnapshotsRepo from "./db/repos/nepse-snapshots.js";

// ─── In-memory (no table yet) ────────────────────────────────────────────────

export type ElectionDatasetMeta = {
  id: string;
  label: string;
  sourceId?: string;
  sourceName?: string;
  timestamp: string;
  isCurrent: boolean;
};

type ElectionDataset = {
  meta: Omit<ElectionDatasetMeta, "isCurrent">;
  nationalSummary: NationalSummary;
  constituencyResults: Map<string, ConstituencyResult>;
};

function emptySummary(): NationalSummary {
  return {
    totalSeats: 0,
    totalConstituencies: 0,
    countedConstituencies: 0,
    totalVotesCast: 0,
    timestamp: new Date().toISOString(),
    partyResults: [],
  };
}

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

function buildDatasetMeta(
  sourceId: string | undefined,
  sourceName: string | undefined,
  timestamp: string
): Omit<ElectionDatasetMeta, "isCurrent"> {
  const year = new Date(timestamp).getUTCFullYear();
  const safeSourceId = sourceId ? slugify(sourceId) : "archive";
  const id = `${safeSourceId}-${year}`;
  const rawLabelSource = sourceName ?? sourceId ?? "Election Archive";
  const labelSource =
    sourceId === "ekantipur" || rawLabelSource.toLowerCase().includes("election commission")
      ? "Nepal Election"
      : rawLabelSource;
  return { id, label: `${labelSource} ${year}`, sourceId, sourceName, timestamp };
}

const electionDatasets = new Map<string, ElectionDataset>();
let currentElectionDatasetId: string | null = null;

let floodSeasonInactive = false;
let floodLastUpdated: string | null = null;
let floodSource: "dhm" | "gdacs" | null = null;

let forexRates: ForexRate[] = [];
let economySummary: EconomySummary | null = null;
let marketAssetQuotes: MarketAssetQuote[] = [];
let nepseSummary: NepseSummary | null = null;
let marketPortalSnapshot: MarketPortalSnapshot | null = null;
let crisisSummary: CrisisSummary | null = null;
let earthquakeIncidents: EarthquakeIncident[] = [];

function ensureElectionDataset(
  sourceId: string | undefined,
  sourceName: string | undefined,
  timestamp: string
): ElectionDataset {
  const meta = buildDatasetMeta(sourceId, sourceName, timestamp);
  const existing = electionDatasets.get(meta.id);
  if (existing) {
    existing.meta = { ...existing.meta, sourceId, sourceName, timestamp, label: meta.label };
    return existing;
  }
  const dataset: ElectionDataset = {
    meta,
    nationalSummary: emptySummary(),
    constituencyResults: new Map<string, ConstituencyResult>(),
  };
  electionDatasets.set(meta.id, dataset);
  return dataset;
}

function getDataset(datasetId?: string | null): ElectionDataset | undefined {
  const id = datasetId ?? currentElectionDatasetId;
  if (!id) return undefined;
  return electionDatasets.get(id);
}

function nanoid10(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}

const SNAPSHOT_SLUGS = {
  floodMeta: "cache:floodMeta",
  forexRates: "cache:forexRates",
  economySummary: "cache:economySummary",
  marketAssetQuotes: "cache:marketAssetQuotes",
  nepseSummary: "cache:nepseSummary",
  marketPortalSnapshot: "cache:marketPortalSnapshot",
  crisisSummary: "cache:crisisSummary",
  earthquakeIncidents: "cache:earthquakeIncidents",
} as const;

function persistCacheSnapshot(opts: {
  slug: string;
  type: string;
  title: string;
  data: unknown;
  ttlDays?: number;
}): void {
  const now = new Date();
  const ttlDays = opts.ttlDays ?? 30;
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000).toISOString();
  void snapshotsRepo
    .insertSnapshot({
      slug: opts.slug,
      type: opts.type,
      title: opts.title,
      data: opts.data ?? null,
      createdAt,
      expiresAt,
    })
    .catch(() => {
      // Best-effort cache persistence; ingestion should not fail if snapshot write fails.
    });
}

export async function hydrateOperationalCacheFromDb(): Promise<void> {
  const [
    floodMetaSnap,
    forexSnap,
    economySnap,
    marketSnap,
    nepseSnap,
    marketPortalSnap,
    crisisSnap,
    quakeSnap,
  ] = await Promise.all([
    snapshotsRepo.getSnapshot(SNAPSHOT_SLUGS.floodMeta),
    snapshotsRepo.getSnapshot(SNAPSHOT_SLUGS.forexRates),
    snapshotsRepo.getSnapshot(SNAPSHOT_SLUGS.economySummary),
    snapshotsRepo.getSnapshot(SNAPSHOT_SLUGS.marketAssetQuotes),
    snapshotsRepo.getSnapshot(SNAPSHOT_SLUGS.nepseSummary),
    snapshotsRepo.getSnapshot(SNAPSHOT_SLUGS.marketPortalSnapshot),
    snapshotsRepo.getSnapshot(SNAPSHOT_SLUGS.crisisSummary),
    snapshotsRepo.getSnapshot(SNAPSHOT_SLUGS.earthquakeIncidents),
  ]);

  if (floodMetaSnap?.data && typeof floodMetaSnap.data === "object") {
    const d = floodMetaSnap.data as Partial<{
      seasonInactive: boolean;
      lastUpdated: string | null;
      source: "dhm" | "gdacs" | null;
    }>;
    if (typeof d.seasonInactive === "boolean") floodSeasonInactive = d.seasonInactive;
    if (typeof d.lastUpdated === "string" || d.lastUpdated === null) floodLastUpdated = d.lastUpdated ?? null;
    if (d.source === "dhm" || d.source === "gdacs" || d.source === null) floodSource = d.source ?? null;
  }

  if (Array.isArray(forexSnap?.data)) forexRates = forexSnap.data as ForexRate[];
  if (economySnap?.data && typeof economySnap.data === "object") economySummary = economySnap.data as EconomySummary;
  if (Array.isArray(marketSnap?.data)) marketAssetQuotes = marketSnap.data as MarketAssetQuote[];
  if (nepseSnap?.data && typeof nepseSnap.data === "object") nepseSummary = nepseSnap.data as NepseSummary;
  if (marketPortalSnap?.data && typeof marketPortalSnap.data === "object") {
    marketPortalSnapshot = marketPortalSnap.data as MarketPortalSnapshot;
  }
  if (crisisSnap?.data && typeof crisisSnap.data === "object") crisisSummary = crisisSnap.data as CrisisSummary;
  if (Array.isArray(quakeSnap?.data)) earthquakeIncidents = quakeSnap.data as EarthquakeIncident[];
}

// ─── Readers (sync: in-memory) ───────────────────────────────────────────────

export function getNationalSummary(datasetId?: string): NationalSummary {
  return getDataset(datasetId)?.nationalSummary ?? emptySummary();
}

export function getConstituencyResults(datasetId?: string): ConstituencyResult[] {
  return Array.from(getDataset(datasetId)?.constituencyResults.values() ?? []);
}

export function getConstituencyResult(
  id: string,
  datasetId?: string
): ConstituencyResult | undefined {
  return getDataset(datasetId)?.constituencyResults.get(id);
}

export function getForexRates(): ForexRate[] {
  return forexRates;
}

export function getEconomySummary(): EconomySummary | null {
  return economySummary;
}

export function getMarketAssetQuotes(): MarketAssetQuote[] {
  return marketAssetQuotes;
}

export function getNepseSummary(): NepseSummary | null {
  return nepseSummary;
}

export function getMarketPortalSnapshot(): MarketPortalSnapshot | null {
  return marketPortalSnapshot;
}

export function getElectionDatasets(): ElectionDatasetMeta[] {
  return Array.from(electionDatasets.values())
    .map(({ meta }) => ({ ...meta, isCurrent: meta.id === currentElectionDatasetId }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function getEarthquakeIncidents(): EarthquakeIncident[] {
  return earthquakeIncidents;
}

export function getCrisisSummary(): CrisisSummary | null {
  return crisisSummary;
}

// ─── Readers (async: from DB) ───────────────────────────────────────────────

export async function getSignalEvents(
  limit = 20,
  offset = 0,
  type?: string,
  severity?: string
): Promise<{ events: SignalEvent[]; total: number }> {
  return signalEventsRepo.getSignalEvents({ limit, offset, type, severity });
}

export async function getSocialSignalEvents(
  limit = 20,
  offset = 0,
  type?: string,
  severity?: string
): Promise<{ events: SignalEvent[]; total: number }> {
  return socialSignalEventsRepo.getSocialSignalEvents({ limit, type, severity });
}

export async function getWorldArticles(
  panel?: string,
  limit = 20
): Promise<GeopoliticsArticle[]> {
  return worldArticlesRepo.getWorldArticles({ panel, limit });
}

export async function getWatchlist(): Promise<WatchlistItem[]> {
  return watchlistRepo.getWatchlistItems();
}

export async function getCabinetEvents(limit = 20): Promise<CabinetEvent[]> {
  return cabinetRepo.getCabinetEvents({ limit });
}

export async function getParliamentSession(): Promise<ParliamentSession | null> {
  return parliamentRepo.getCurrentSession();
}

export async function getSourceHealth(): Promise<SourceHealth[]> {
  return sourceHealthRepo.getAllSourceHealth();
}

export async function getCrisisIncidents(): Promise<CrisisIncident[]> {
  return crisisRepo.getCrisisIncidents({ limit: 500 });
}

/** Operational anomalies from source health; stored anomalies from DB. */
export type AnomalyContextFilter = "election" | "operational" | "all";

export async function getAnomalies(context?: AnomalyContextFilter): Promise<Anomaly[]> {
  const [storedRows, healthList] = await Promise.all([
    anomaliesRepo.getAnomalies({ resolved: false, limit: 200 }),
    sourceHealthRepo.getAllSourceHealth(),
  ]);
  const stored: Anomaly[] = storedRows.map((r) => ({
    id: r.id,
    type: r.type as Anomaly["type"],
    severity: r.severity as Anomaly["severity"],
    details: r.description,
    timestamp: r.detectedAt,
    resolved: r.resolved,
    context: "election" as const,
  }));
  const electionOnly = stored.filter((a) => a.context !== "operational");
  const operational: Anomaly[] = healthList.flatMap((h) => {
    if (h.status === "stale")
      return [{
        id: `operational-source-${h.sourceId}`,
        type: "source_stale" as const,
        severity: "warning" as const,
        details: `${h.sourceName} has not updated recently (last: ${h.lastUpdate})`,
        timestamp: h.lastUpdate,
        resolved: false,
        context: "operational" as const,
      }];
    if (h.status === "error")
      return [{
        id: `operational-source-${h.sourceId}`,
        type: "source_error" as const,
        severity: "critical" as const,
        details: `${h.sourceName} is reporting errors (error rate: ${(h.errorRate * 100).toFixed(0)}%)`,
        timestamp: h.lastUpdate,
        resolved: false,
        context: "operational" as const,
      }];
    return [];
  });
  switch (context) {
    case "election":
      return electionOnly;
    case "operational":
      return operational;
    case "all":
    default: {
      const byId = new Map<string, Anomaly>();
      for (const a of operational) byId.set(a.id, a);
      for (const a of electionOnly) byId.set(a.id, a);
      return Array.from(byId.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }
  }
}

export async function getFloodAlerts(statusFilter?: string): Promise<{
  alerts: FloodAlert[];
  seasonInactive: boolean;
  lastUpdated: string | null;
  alertsSource?: "dhm" | "gdacs";
}> {
  const statuses = statusFilter
    ? statusFilter.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;
  const all = await floodRepo.getFloodAlerts(
    statuses?.length === 1 ? { status: statuses[0] } : {}
  );
  const alerts =
    statuses && statuses.length > 1 ? all.filter((a) => statuses.includes(a.status)) : all;
  return {
    alerts,
    seasonInactive: floodSeasonInactive,
    lastUpdated: floodLastUpdated,
    alertsSource: floodSource ?? undefined,
  };
}

// ─── Reactions (async: from DB) ───────────────────────────────────────────────

export async function addReaction(input: {
  itemId: string;
  itemTitle: string;
  reaction: "like";
  email: string | null;
  fingerprint: string;
}): Promise<{ liked: true; count: number }> {
  const id = nanoid10();
  await reactionsRepo.insertReaction({
    id,
    itemId: input.itemId,
    itemTitle: input.itemTitle.slice(0, 60),
    reaction: "like",
    email: input.email ?? null,
    fingerprint: input.fingerprint,
  });
  const { count } = await reactionsRepo.getReactionStatus(input.itemId, input.fingerprint);
  return { liked: true, count };
}

export async function removeReaction(
  itemId: string,
  fingerprint: string
): Promise<{ liked: false; count: number }> {
  await reactionsRepo.deleteReaction(itemId, fingerprint);
  const { count } = await reactionsRepo.getReactionStatus(itemId, undefined);
  return { liked: false, count };
}

export async function getReactionStatus(
  itemId: string,
  fingerprint: string | undefined
): Promise<{ count: number; liked: boolean }> {
  return reactionsRepo.getReactionStatus(itemId, fingerprint);
}

export async function getReactionsBatch(
  ids: string[],
  fingerprint: string | undefined
): Promise<Record<string, { count: number; liked: boolean }>> {
  return reactionsRepo.getReactionsBatch(ids, fingerprint);
}

export async function associateEmailWithFingerprint(
  fingerprint: string,
  email: string
): Promise<number> {
  return reactionsRepo.associateEmail(fingerprint, email);
}

// ─── Writers (sync: in-memory) ───────────────────────────────────────────────

export async function updateNationalSummary(summary: NationalSummary): Promise<void> {
  const dataset = ensureElectionDataset(
    summary.sourceId,
    summary.sourceName,
    summary.sourceFetchedAt ?? summary.timestamp
  );
  dataset.nationalSummary = summary;
  currentElectionDatasetId = dataset.meta.id;
  await nationalSummariesRepo.upsertNationalSummary(dataset.meta.id, summary);
}

export async function updateConstituencyResult(result: ConstituencyResult): Promise<void> {
  const dataset = ensureElectionDataset(
    result.sourceId,
    result.sourceName,
    result.sourceFetchedAt ?? result.lastUpdate
  );
  dataset.constituencyResults.set(result.constituencyId, result);
  currentElectionDatasetId = dataset.meta.id;
  const leading = result.candidates?.length
    ? result.candidates.reduce((a, b) => (a.votes >= b.votes ? a : b))
    : null;
  await constituencyRepo.upsertConstituencyResult({
    id: `${dataset.meta.id}::${result.constituencyId}`,
    name: result.constituencyName,
    district: result.districtName ?? null,
    province: result.provinceId ?? null,
    leadingCandidate: leading?.candidateName ?? null,
    party: leading?.partyName ?? null,
    margin: null,
    totalVotes: result.totalVotes ?? null,
    percentReported: null,
    status: result.status ?? null,
    dataset: dataset.meta.id,
    updatedAt: result.lastUpdate,
  });
}

export function replaceEarthquakeIncidents(incidents: EarthquakeIncident[]): void {
  earthquakeIncidents = incidents;
  persistCacheSnapshot({
    slug: SNAPSHOT_SLUGS.earthquakeIncidents,
    type: "operational_cache",
    title: "Earthquake incidents cache",
    data: incidents,
    ttlDays: 14,
  });
}

export function updateCrisisSummary(summary: CrisisSummary | null): void {
  crisisSummary = summary;
  persistCacheSnapshot({
    slug: SNAPSHOT_SLUGS.crisisSummary,
    type: "operational_cache",
    title: "Crisis summary cache",
    data: summary,
    ttlDays: 14,
  });
}

export function replaceForexRates(rates: ForexRate[]): void {
  forexRates = rates;
  persistCacheSnapshot({
    slug: SNAPSHOT_SLUGS.forexRates,
    type: "operational_cache",
    title: "Forex rates cache",
    data: rates,
    ttlDays: 14,
  });
}

export function updateEconomySummary(summary: EconomySummary | null): void {
  economySummary = summary;
  persistCacheSnapshot({
    slug: SNAPSHOT_SLUGS.economySummary,
    type: "operational_cache",
    title: "Economy summary cache",
    data: summary,
    ttlDays: 14,
  });
}

export function replaceMarketAssetQuotes(quotes: MarketAssetQuote[]): void {
  marketAssetQuotes = quotes;
  persistCacheSnapshot({
    slug: SNAPSHOT_SLUGS.marketAssetQuotes,
    type: "operational_cache",
    title: "Market asset quotes cache",
    data: quotes,
    ttlDays: 14,
  });
}

export function updateNepseSummary(summary: NepseSummary | null): void {
  nepseSummary = summary;
  persistCacheSnapshot({
    slug: SNAPSHOT_SLUGS.nepseSummary,
    type: "operational_cache",
    title: "NEPSE summary cache",
    data: summary,
    ttlDays: 14,
  });
}

export function updateMarketPortalSnapshot(snapshot: MarketPortalSnapshot | null): void {
  marketPortalSnapshot = snapshot;
  persistCacheSnapshot({
    slug: SNAPSHOT_SLUGS.marketPortalSnapshot,
    type: "operational_cache",
    title: "Market portal snapshot",
    data: snapshot,
    ttlDays: 14,
  });
}

export async function appendNepseSnapshot(summary: NepseSummary): Promise<void> {
  await nepseSnapshotsRepo.insertNepseSnapshot({
    id: nanoid10(),
    indexValue: summary.index ?? null,
    change: summary.change ?? null,
    changePercent: summary.changePercent ?? null,
    turnover: summary.totalTurnover ?? null,
    marketStatus: summary.marketStatus ?? null,
    topGainers: summary.topGainers ?? null,
    topLosers: summary.topLosers ?? null,
    scrapedAt: summary.timestamp,
  });
}

export async function getNepseSnapshotHistory(limit = 200): Promise<
  Array<{
    id: string;
    indexValue: number | null;
    change: number | null;
    changePercent: number | null;
    turnover: number | null;
    marketStatus: string | null;
    topGainers: unknown;
    topLosers: unknown;
    scrapedAt: string;
  }>
> {
  return nepseSnapshotsRepo.listNepseSnapshots(limit);
}

export function resetElectionData(datasetId?: string): void {
  if (!datasetId) {
    currentElectionDatasetId = null;
    electionDatasets.clear();
    return;
  }
  electionDatasets.delete(datasetId);
  if (currentElectionDatasetId === datasetId) currentElectionDatasetId = null;
}

/** Load election datasets and constituency results from DB into in-memory store (e.g. after API restart). */
export async function hydrateElectionFromDb(): Promise<void> {
  const [summaryMetaList, allConstituencyRows] = await Promise.all([
    nationalSummariesRepo.listNationalSummaryDatasetIds(),
    constituencyRepo.getConstituencyResults({}),
  ]);
  if (summaryMetaList.length === 0 && allConstituencyRows.length === 0) return;

  for (const { datasetId, updatedAt } of summaryMetaList) {
    const summaryPayload = await nationalSummariesRepo.getNationalSummary(datasetId);
    if (!summaryPayload) continue;
    const meta = buildDatasetMeta(
      summaryPayload.sourceId,
      summaryPayload.sourceName,
      summaryPayload.timestamp ?? updatedAt
    );
    const dataset: ElectionDataset = {
      meta: { ...meta, id: datasetId },
      nationalSummary: summaryPayload,
      constituencyResults: new Map<string, ConstituencyResult>(),
    };
    const rowsForDataset = allConstituencyRows.filter((r) => r.dataset === datasetId);
    for (const row of rowsForDataset) {
      const constituencyId = row.id.includes("::") ? row.id.split("::").slice(1).join("::") : row.id;
      const resolved = resolveParty(row.party);
      const cr: ConstituencyResult = {
        constituencyId,
        constituencyName: row.name,
        districtName: row.district ?? undefined,
        provinceId: row.province ?? 0,
        status: (row.status as ConstituencyResult["status"]) ?? "counting",
        totalVotes: row.totalVotes ?? 0,
        lastUpdate: row.updatedAt,
        candidates:
          row.leadingCandidate && row.party
            ? [
                {
                  candidateId: "",
                  candidateName: row.leadingCandidate,
                  partyId: resolved.partyId,
                  partyName: row.party,
                  partyColor: resolved.partyColor,
                  votes: 0,
                },
              ]
            : [],
        sourceId: undefined,
        sourceName: undefined,
        sourceFetchedAt: row.updatedAt,
      };
      dataset.constituencyResults.set(constituencyId, cr);
    }
    electionDatasets.set(datasetId, dataset);
  }
  if (summaryMetaList.length > 0) {
    currentElectionDatasetId = summaryMetaList[0].datasetId;
  }
}

// ─── Writers (async: to DB) ──────────────────────────────────────────────────

export async function addSignalEvent(event: SignalEvent): Promise<void> {
  await signalEventsRepo.insertSignalEvent(event);
}

export async function addAnomaly(anomaly: Anomaly): Promise<void> {
  await anomaliesRepo.insertAnomaly({
    id: anomaly.id,
    type: anomaly.type,
    description: anomaly.details,
    source: null,
    severity: anomaly.severity,
    resolved: anomaly.resolved ?? false,
    detectedAt: anomaly.timestamp,
    resolvedAt: null,
  });
}

export async function updateSourceHealth(health: SourceHealth): Promise<void> {
  await sourceHealthRepo.upsertSourceHealth(health);
}

export async function setFloodAlerts(payload: {
  alerts: FloodAlert[];
  seasonInactive?: boolean;
  lastUpdated: string;
  alertsSource?: "dhm" | "gdacs";
}): Promise<void> {
  await floodRepo.replaceFloodAlerts(payload.alerts);
  floodSeasonInactive = payload.seasonInactive ?? false;
  floodLastUpdated = payload.lastUpdated;
  floodSource = payload.alertsSource ?? null;
  persistCacheSnapshot({
    slug: SNAPSHOT_SLUGS.floodMeta,
    type: "operational_cache",
    title: "Flood meta cache",
    data: {
      seasonInactive: floodSeasonInactive,
      lastUpdated: floodLastUpdated,
      source: floodSource,
    },
    ttlDays: 30,
  });
}

export async function setCabinetEvents(events: CabinetEvent[]): Promise<void> {
  await cabinetRepo.replaceCabinetEvents(events.slice(0, 20));
}

export async function setParliamentSession(session: ParliamentSession | null): Promise<void> {
  if (!session) return;
  await parliamentRepo.upsertParliamentSession(session);
}

export async function upsertWorldArticles(articles: GeopoliticsArticle[]): Promise<void> {
  for (const a of articles) await worldArticlesRepo.upsertWorldArticle(a);
}

export async function createWatchlistItem(
  input: Omit<WatchlistItem, "id" | "createdAt">
): Promise<WatchlistItem> {
  const now = new Date().toISOString();
  const item: WatchlistItem = {
    ...input,
    id: nanoid10(),
    createdAt: now,
  };
  await watchlistRepo.insertWatchlistItem(item);
  return item;
}

export async function deleteWatchlistItem(id: string): Promise<boolean> {
  return watchlistRepo.deleteWatchlistItem(id);
}

export async function toggleWatchlistItemActive(id: string): Promise<WatchlistItem | null> {
  return watchlistRepo.toggleWatchlistItem(id);
}

export async function updateWatchlistItemLastTriggered(
  id: string,
  _lastTriggeredAt: string
): Promise<void> {
  await watchlistRepo.updateWatchlistTriggered(id, "ingest");
}

export async function replaceCrisisIncidents(incidents: CrisisIncident[]): Promise<void> {
  await crisisRepo.replaceCrisisIncidents(incidents);
}

// ─── No-op for compatibility (no longer persisting to JSON) ───────────────────

export async function loadPersistedState(): Promise<boolean> {
  return false;
}
