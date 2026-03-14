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
  ForexRate,
  EconomySummary,
  MarketAssetQuote,
  NepseSummary,
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
let forexRates: ForexRate[] = [];
let economySummary: EconomySummary | null = null;
let marketAssetQuotes: MarketAssetQuote[] = [];
let nepseSummary: NepseSummary | null = null;
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
  offset = 0
): { events: SignalEvent[]; total: number } {
  const sorted = signalEvents.slice().reverse();
  return {
    events: sorted.slice(offset, offset + limit),
    total: signalEvents.length,
  };
}

export function getSocialSignalEvents(
  limit = 20,
  offset = 0
): { events: SignalEvent[]; total: number } {
  const social = signalEvents.filter((e) => e.type === "note");
  const sorted = social.slice().reverse();
  return {
    events: sorted.slice(offset, offset + limit),
    total: social.length,
  };
}

export function getAnomalies(): Anomaly[] {
  return anomalies.filter((a) => !a.resolved);
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
