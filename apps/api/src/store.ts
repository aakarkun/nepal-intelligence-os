import type {
  NationalSummary,
  ConstituencyResult,
  SignalEvent,
  Anomaly,
  SourceHealth,
  EarthquakeIncident,
  CrisisSummary,
  ForexRate,
  EconomySummary,
  MarketAssetQuote,
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
let forexRates: ForexRate[] = [];
let economySummary: EconomySummary | null = null;
let marketAssetQuotes: MarketAssetQuote[] = [];

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
  const labelSource = sourceName ?? sourceId ?? "Election Archive";
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

export function getForexRates(): ForexRate[] {
  return forexRates;
}

export function getEconomySummary(): EconomySummary | null {
  return economySummary;
}

export function getMarketAssetQuotes(): MarketAssetQuote[] {
  return marketAssetQuotes;
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

// ─── Writers ─────────────────────────────────────────────────────────────────

export function updateNationalSummary(summary: NationalSummary): void {
  const dataset = ensureElectionDataset(
    summary.sourceId,
    summary.sourceName,
    summary.sourceFetchedAt ?? summary.timestamp
  );
  dataset.nationalSummary = summary;
  currentElectionDatasetId = dataset.meta.id;
}

export function updateConstituencyResult(result: ConstituencyResult): void {
  const dataset = ensureElectionDataset(
    result.sourceId,
    result.sourceName,
    result.sourceFetchedAt ?? result.lastUpdate
  );
  dataset.constituencyResults.set(result.constituencyId, result);
  currentElectionDatasetId = dataset.meta.id;
}

export function addSignalEvent(event: SignalEvent): void {
  signalEvents.push(event);
}

export function addAnomaly(anomaly: Anomaly): void {
  anomalies.push(anomaly);
}

export function updateSourceHealth(health: SourceHealth): void {
  sourceHealth.set(health.sourceId, health);
}

export function replaceEarthquakeIncidents(incidents: EarthquakeIncident[]): void {
  earthquakeIncidents = incidents;
}

export function updateCrisisSummary(summary: CrisisSummary): void {
  crisisSummary = summary;
}

export function replaceForexRates(rates: ForexRate[]): void {
  forexRates = rates;
}

export function updateEconomySummary(summary: EconomySummary): void {
  economySummary = summary;
}

export function replaceMarketAssetQuotes(quotes: MarketAssetQuote[]): void {
  marketAssetQuotes = quotes;
}

export function resetElectionData(datasetId?: string): void {
  if (!datasetId) {
    currentElectionDatasetId = null;
    electionDatasets.clear();
    return;
  }
  electionDatasets.delete(datasetId);
  if (currentElectionDatasetId === datasetId) {
    currentElectionDatasetId = null;
  }
}
