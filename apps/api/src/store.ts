import path from "node:path";
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
  CabinetEvent,
  ParliamentSession,
  GeopoliticsArticle,
  WatchlistItem,
} from "@repo/shared";

// ─── In-Memory Stores ────────────────────────────────────────────────────────

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

const electionDatasets = new Map<string, ElectionDataset>();
let currentElectionDatasetId: string | null = null;
const signalEvents: SignalEvent[] = [];
const anomalies: Anomaly[] = [];
const sourceHealth = new Map<string, SourceHealth>();
let earthquakeIncidents: EarthquakeIncident[] = [];
let crisisSummary: CrisisSummary | null = null;
let crisisIncidents: CrisisIncident[] = [];
let floodAlerts: FloodAlert[] = [];
let floodAlertsSeasonInactive = false;
let floodAlertsLastUpdated: string | null = null;
let floodAlertsSource: "dhm" | "gdacs" | null = null;
let forexRates: ForexRate[] = [];
let economySummary: EconomySummary | null = null;
let marketAssetQuotes: MarketAssetQuote[] = [];
let nepseSummary: NepseSummary | null = null;
let cabinetEvents: CabinetEvent[] = [];
let parliamentSession: ParliamentSession | null = null;
const worldArticles = new Map<string, GeopoliticsArticle>();
let watchlistItems: WatchlistItem[] = [];
const PERSISTED_STATE_PATH =
  process.env.API_STATE_PATH ??
  path.resolve(import.meta.dir, "../.live-api-state.json");
const BOOTSTRAP_STATE_PATH =
  process.env.API_BOOTSTRAP_STATE_PATH ??
  path.resolve(import.meta.dir, "../../../data/bootstrap/live-api-state.json");
let persistTimer: ReturnType<typeof setTimeout> | null = null;

type PersistedElectionDataset = {
  meta: Omit<ElectionDatasetMeta, "isCurrent">;
  nationalSummary: NationalSummary;
  constituencyResults: ConstituencyResult[];
};

type PersistedApiState = {
  currentElectionDatasetId: string | null;
  electionDatasets: PersistedElectionDataset[];
  signalEvents: SignalEvent[];
  anomalies: Anomaly[];
  sourceHealth: SourceHealth[];
  earthquakeIncidents: EarthquakeIncident[];
  crisisSummary: CrisisSummary | null;
  forexRates: ForexRate[];
  economySummary: EconomySummary | null;
  marketAssetQuotes: MarketAssetQuote[];
  nepseSummary: NepseSummary | null;
  floodAlerts: FloodAlert[];
  floodAlertsSeasonInactive: boolean;
  floodAlertsLastUpdated: string | null;
  floodAlertsSource: "dhm" | "gdacs" | null;
  cabinetEvents: CabinetEvent[];
  parliamentSession: ParliamentSession | null;
  worldArticles: GeopoliticsArticle[];
  watchlistItems: WatchlistItem[];
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
  // For national HoR elections, prefer a civic-facing label instead of the raw data source.
  const labelSource =
    sourceId === "ekantipur" || rawLabelSource.toLowerCase().includes("election commission")
      ? "Nepal Election"
      : rawLabelSource;
  return {
    id,
    label: `${labelSource} ${year}`,
    sourceId,
    sourceName,
    timestamp,
  };
}

function ensureElectionDataset(
  sourceId: string | undefined,
  sourceName: string | undefined,
  timestamp: string
): ElectionDataset {
  const meta = buildDatasetMeta(sourceId, sourceName, timestamp);
  const existing = electionDatasets.get(meta.id);
  if (existing) {
    existing.meta = {
      ...existing.meta,
      sourceId,
      sourceName,
      timestamp,
      label: meta.label,
    };
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

function serializeState(): PersistedApiState {
  return {
    currentElectionDatasetId,
    electionDatasets: Array.from(electionDatasets.values()).map((dataset) => ({
      meta: dataset.meta,
      nationalSummary: dataset.nationalSummary,
      constituencyResults: Array.from(dataset.constituencyResults.values()),
    })),
    signalEvents: [...signalEvents],
    anomalies: [...anomalies],
    sourceHealth: Array.from(sourceHealth.values()),
    earthquakeIncidents,
    crisisSummary,
    forexRates,
    economySummary,
    marketAssetQuotes,
    nepseSummary,
    floodAlerts,
    floodAlertsSeasonInactive,
    floodAlertsLastUpdated,
    floodAlertsSource,
    cabinetEvents,
    parliamentSession,
    worldArticles: Array.from(worldArticles.values()),
    watchlistItems: [...watchlistItems],
  };
}

async function persistState(): Promise<void> {
  try {
    await Bun.write(PERSISTED_STATE_PATH, JSON.stringify(serializeState(), null, 2));
  } catch (err) {
    console.warn(
      "[nepal-intelligence-os] Failed to persist API state:",
      err instanceof Error ? err.message : err
    );
  }
}

function schedulePersist(): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void persistState();
  }, 150);
}

// ─── Readers ─────────────────────────────────────────────────────────────────

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

export function getSignalEvents(
  limit = 20,
  offset = 0,
  type?: string,
  severity?: string
): { events: SignalEvent[]; total: number } {
  let list = signalEvents;
  if (type != null && type !== "") {
    list = list.filter((e) => e.type === type);
  }
  if (severity != null && severity !== "") {
    list = list.filter((e) => e.severity === severity);
  }
  const sorted = list.slice().reverse();
  return {
    events: sorted.slice(offset, offset + limit),
    total: sorted.length,
  };
}

export function getSocialSignalEvents(
  limit = 20,
  offset = 0,
  type?: string,
  severity?: string
): { events: SignalEvent[]; total: number } {
  let social = signalEvents.filter((e) => e.type === "note");
  if (type != null && type !== "") {
    social = social.filter((e) => e.type === type);
  }
  if (severity != null && severity !== "") {
    social = social.filter((e) => e.severity === severity);
  }
  const sorted = social.slice().reverse();
  return {
    events: sorted.slice(offset, offset + limit),
    total: sorted.length,
  };
}

/** Operational anomalies derived live from source health (stale/error). */
export function getOperationalAnomalies(): Anomaly[] {
  const list: Anomaly[] = [];
  const now = new Date().toISOString();
  for (const h of sourceHealth.values()) {
    if (h.status === "stale") {
      list.push({
        id: `operational-source-${h.sourceId}`,
        type: "source_stale",
        severity: "warning",
        details: `${h.sourceName} has not updated recently (last: ${h.lastUpdate})`,
        timestamp: h.lastUpdate,
        resolved: false,
        context: "operational",
      });
    } else if (h.status === "error") {
      list.push({
        id: `operational-source-${h.sourceId}`,
        type: "source_error",
        severity: "critical",
        details: `${h.sourceName} is reporting errors (error rate: ${(h.errorRate * 100).toFixed(0)}%)`,
        timestamp: h.lastUpdate,
        resolved: false,
        context: "operational",
      });
    }
  }
  return list;
}

export type AnomalyContextFilter = "election" | "operational" | "all";

export function getAnomalies(context?: AnomalyContextFilter): Anomaly[] {
  const stored = anomalies.filter((a) => !a.resolved);
  const electionOnly = stored.filter((a) => a.context !== "operational");
  const operational = getOperationalAnomalies();

  switch (context) {
    case "election":
      return electionOnly;
    case "operational":
      return operational;
    case "all":
    default:
      const byId = new Map<string, Anomaly>();
      for (const a of operational) byId.set(a.id, a);
      for (const a of electionOnly) byId.set(a.id, a);
      return Array.from(byId.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }
}

export function getSourceHealth(): SourceHealth[] {
  return Array.from(sourceHealth.values());
}

export function getEarthquakeIncidents(): EarthquakeIncident[] {
  return earthquakeIncidents;
}

export function getCrisisSummary(): CrisisSummary | null {
  return crisisSummary;
}

export function getCrisisIncidents(): CrisisIncident[] {
  return crisisIncidents;
}

export function getFloodAlerts(statusFilter?: string): {
  alerts: FloodAlert[];
  seasonInactive: boolean;
  lastUpdated: string | null;
} {
  let list = floodAlerts;
  if (statusFilter) {
    const statuses = statusFilter.split(",").map((s) => s.trim());
    list = list.filter((a) => statuses.includes(a.status));
  }
  return {
    alerts: list,
    seasonInactive: floodAlertsSeasonInactive,
    lastUpdated: floodAlertsLastUpdated,
    alertsSource: floodAlertsSource ?? undefined,
  };
}

export function setFloodAlerts(payload: {
  alerts: FloodAlert[];
  seasonInactive?: boolean;
  lastUpdated: string;
  alertsSource?: "dhm" | "gdacs";
}): void {
  floodAlerts = payload.alerts;
  floodAlertsSeasonInactive = payload.seasonInactive ?? false;
  floodAlertsLastUpdated = payload.lastUpdated;
  floodAlertsSource = payload.alertsSource ?? null;
  schedulePersist();
}

export function getCabinetEvents(limit = 20): CabinetEvent[] {
  return cabinetEvents.slice(0, limit);
}

export function setCabinetEvents(events: CabinetEvent[]): void {
  cabinetEvents = events.slice(0, 20);
  schedulePersist();
}

export function getParliamentSession(): ParliamentSession | null {
  return parliamentSession;
}

export function setParliamentSession(session: ParliamentSession | null): void {
  parliamentSession = session;
  schedulePersist();
}

export function getWorldArticles(panel?: string, limit = 20): GeopoliticsArticle[] {
  let list = Array.from(worldArticles.values());
  if (panel) list = list.filter((a) => a.panel === panel);
  list.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  return list.slice(0, limit);
}

export function upsertWorldArticles(articles: GeopoliticsArticle[]): void {
  for (const a of articles) {
    worldArticles.set(a.id, a);
  }
  schedulePersist();
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

export function getElectionDatasets(): ElectionDatasetMeta[] {
  return Array.from(electionDatasets.values())
    .map(({ meta }) => ({
      ...meta,
      isCurrent: meta.id === currentElectionDatasetId,
    }))
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
}

export function getWatchlist(): WatchlistItem[] {
  return [...watchlistItems];
}

function nanoid10(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}

export function createWatchlistItem(
  input: Omit<WatchlistItem, "id" | "createdAt">
): WatchlistItem {
  const now = new Date().toISOString();
  const item: WatchlistItem = {
    ...input,
    id: nanoid10(),
    createdAt: now,
  };
  watchlistItems.push(item);
  schedulePersist();
  return item;
}

export function deleteWatchlistItem(id: string): boolean {
  const before = watchlistItems.length;
  watchlistItems = watchlistItems.filter((w) => w.id !== id);
  if (watchlistItems.length < before) {
    schedulePersist();
    return true;
  }
  return false;
}

export function toggleWatchlistItemActive(id: string): WatchlistItem | null {
  const item = watchlistItems.find((w) => w.id === id);
  if (!item) return null;
  item.active = !item.active;
  schedulePersist();
  return item;
}

export function updateWatchlistItemLastTriggered(
  id: string,
  lastTriggeredAt: string
): void {
  const item = watchlistItems.find((w) => w.id === id);
  if (item) {
    item.lastTriggeredAt = lastTriggeredAt;
    schedulePersist();
  }
}

export async function loadPersistedState(): Promise<boolean> {
  try {
    const liveFile = Bun.file(PERSISTED_STATE_PATH);
    const bootstrapFile = Bun.file(BOOTSTRAP_STATE_PATH);
    const file = (await liveFile.exists()) ? liveFile : (await bootstrapFile.exists()) ? bootstrapFile : null;
    if (!file) return false;

    const raw = (await file.json()) as PersistedApiState;

    electionDatasets.clear();
    currentElectionDatasetId = raw.currentElectionDatasetId ?? null;

    for (const dataset of raw.electionDatasets ?? []) {
      electionDatasets.set(dataset.meta.id, {
        meta: dataset.meta,
        nationalSummary: dataset.nationalSummary,
        constituencyResults: new Map(
          (dataset.constituencyResults ?? []).map((result) => [
            result.constituencyId,
            result,
          ])
        ),
      });
    }

    signalEvents.length = 0;
    signalEvents.push(...(raw.signalEvents ?? []));

    anomalies.length = 0;
    anomalies.push(...(raw.anomalies ?? []));

    sourceHealth.clear();
    for (const health of raw.sourceHealth ?? []) {
      sourceHealth.set(health.sourceId, health);
    }

    earthquakeIncidents = raw.earthquakeIncidents ?? [];
    crisisSummary = raw.crisisSummary ?? null;
    forexRates = raw.forexRates ?? [];
    economySummary = raw.economySummary ?? null;
    marketAssetQuotes = raw.marketAssetQuotes ?? [];
    nepseSummary = raw.nepseSummary ?? null;
    floodAlerts = raw.floodAlerts ?? [];
    floodAlertsSeasonInactive = raw.floodAlertsSeasonInactive ?? false;
    floodAlertsLastUpdated = raw.floodAlertsLastUpdated ?? null;
    floodAlertsSource = raw.floodAlertsSource ?? null;
    cabinetEvents = raw.cabinetEvents ?? [];
    parliamentSession = raw.parliamentSession ?? null;
    worldArticles.clear();
    for (const a of raw.worldArticles ?? []) {
      worldArticles.set(a.id, a);
    }
    watchlistItems = raw.watchlistItems ?? [];
    return true;
  } catch (err) {
    console.warn(
      "[nepal-intelligence-os] Failed to load persisted API state:",
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

// ─── Writers ─────────────────────────────────────────────────────────────────

export function updateNationalSummary(summary: NationalSummary): void {
  const dataset = ensureElectionDataset(
    summary.sourceId,
    summary.sourceName,
    summary.sourceFetchedAt ?? summary.timestamp
  );
  dataset.nationalSummary = summary;
  currentElectionDatasetId = dataset.meta.id;
  schedulePersist();
}

export function updateConstituencyResult(result: ConstituencyResult): void {
  const dataset = ensureElectionDataset(
    result.sourceId,
    result.sourceName,
    result.sourceFetchedAt ?? result.lastUpdate
  );
  dataset.constituencyResults.set(result.constituencyId, result);
  currentElectionDatasetId = dataset.meta.id;
  schedulePersist();
}

export function addSignalEvent(event: SignalEvent): void {
  signalEvents.push(event);
  schedulePersist();
}

export function addAnomaly(anomaly: Anomaly): void {
  anomalies.push(anomaly);
  schedulePersist();
}

export function updateSourceHealth(health: SourceHealth): void {
  sourceHealth.set(health.sourceId, health);
  schedulePersist();
}

export function replaceEarthquakeIncidents(incidents: EarthquakeIncident[]): void {
  earthquakeIncidents = incidents;
  schedulePersist();
}

export function updateCrisisSummary(summary: CrisisSummary): void {
  crisisSummary = summary;
  schedulePersist();
}

export function replaceCrisisIncidents(incidents: CrisisIncident[]): void {
  crisisIncidents = incidents;
}

export function replaceForexRates(rates: ForexRate[]): void {
  forexRates = rates;
  schedulePersist();
}

export function updateEconomySummary(summary: EconomySummary): void {
  economySummary = summary;
  schedulePersist();
}

export function replaceMarketAssetQuotes(quotes: MarketAssetQuote[]): void {
  marketAssetQuotes = quotes;
  schedulePersist();
}

export function updateNepseSummary(summary: NepseSummary): void {
  nepseSummary = summary;
  schedulePersist();
}

export function resetElectionData(datasetId?: string): void {
  if (!datasetId) {
    currentElectionDatasetId = null;
    electionDatasets.clear();
    schedulePersist();
    return;
  }
  electionDatasets.delete(datasetId);
  if (currentElectionDatasetId === datasetId) {
    currentElectionDatasetId = null;
  }
  schedulePersist();
}
