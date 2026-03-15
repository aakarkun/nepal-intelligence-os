import { API_URL } from "./utils";
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
  CabinetEvent,
  ParliamentSession,
  GeopoliticsArticle,
  ForexRate,
  EconomySummary,
  MarketAssetQuote,
  NepseSummary,
} from "@repo/shared";

export type ElectionDataset = {
  id: string;
  label: string;
  sourceId?: string;
  sourceName?: string;
  timestamp: string;
  isCurrent: boolean;
};

async function fetchJSON<T>(path: string, dataset?: string | null): Promise<T> {
  const url = new URL(`${API_URL}${path}`);
  if (dataset) url.searchParams.set("dataset", dataset);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export function fetchNationalSummary(dataset?: string | null): Promise<NationalSummary> {
  return fetchJSON("/v1/national-summary", dataset);
}

export function fetchConstituencies(params?: {
  status?: string;
  province?: number;
  dataset?: string | null;
}): Promise<ConstituencyResult[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.province) query.set("province", String(params.province));
  if (params?.dataset) query.set("dataset", params.dataset);
  const qs = query.toString();
  return fetchJSON(`/v1/constituencies${qs ? `?${qs}` : ""}`);
}

export function fetchConstituency(
  id: string,
  dataset?: string | null
): Promise<ConstituencyResult> {
  return fetchJSON(`/v1/constituencies/${encodeURIComponent(id)}`, dataset);
}

export function fetchDistricts(dataset?: string | null): Promise<
  Array<{
    districtName: string;
    provinceId: number;
    constituencies: number;
    totalVotes: number;
    counted: number;
  }>
> {
  return fetchJSON("/v1/districts", dataset);
}

export function fetchDistrictDetail(
  districtName: string,
  dataset?: string | null
): Promise<{
  districtName: string;
  provinceId: number;
  constituencies: number;
  totalVotes: number;
  counted: number;
  results: ConstituencyResult[];
}> {
  return fetchJSON(`/v1/districts/${encodeURIComponent(districtName)}`, dataset);
}

export function fetchProvinceDetail(
  provinceId: number,
  dataset?: string | null
): Promise<{
  provinceId: number;
  constituencies: number;
  totalVotes: number;
  counted: number;
  districts: Array<{
    districtName: string;
    provinceId: number;
    constituencies: number;
    totalVotes: number;
    counted: number;
  }>;
  results: ConstituencyResult[];
}> {
  return fetchJSON(`/v1/provinces/${provinceId}`, dataset);
}

export function fetchFeed(
  limit = 20,
  offset = 0
): Promise<{ events: SignalEvent[]; total: number }> {
  return fetchJSON(`/v1/feed?limit=${limit}&offset=${offset}`);
}

export function fetchSocialFeed(
  limit = 20,
  offset = 0
): Promise<{ events: SignalEvent[]; total: number }> {
  return fetchJSON(`/v1/feed/social?limit=${limit}&offset=${offset}`);
}

export function fetchAnomalies(): Promise<Anomaly[]> {
  return fetchJSON("/v1/anomalies");
}

export function fetchSourceHealth(): Promise<SourceHealth[]> {
  return fetchJSON("/v1/sources/health");
}

export function fetchEarthquakeIncidents(): Promise<EarthquakeIncident[]> {
  return fetchJSON("/v1/crisis/earthquakes");
}

export function fetchCrisisSummary(): Promise<CrisisSummary> {
  return fetchJSON("/v1/crisis/summary");
}

export function fetchCrisisIncidents(): Promise<CrisisIncident[]> {
  return fetchJSON("/v1/crisis/incidents");
}

export function fetchFloodAlerts(status?: string): Promise<{
  alerts: FloodAlert[];
  seasonInactive: boolean;
  lastUpdated: string | null;
  alertsSource?: "dhm" | "gdacs";
}> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return fetchJSON(`/v1/crisis/flood-alerts${qs}`);
}

export function fetchCabinetEvents(limit?: number): Promise<CabinetEvent[]> {
  const qs = limit != null ? `?limit=${limit}` : "";
  return fetchJSON(`/v1/politics/cabinet-events${qs}`);
}

export function fetchParliamentSession(): Promise<ParliamentSession | null> {
  return fetchJSON<ParliamentSession | null>("/v1/politics/parliament-session");
}

export function fetchWorldArticles(panel?: string, limit?: number): Promise<GeopoliticsArticle[]> {
  const params = new URLSearchParams();
  if (panel) params.set("panel", panel);
  if (limit != null) params.set("limit", String(limit));
  const qs = params.toString();
  return fetchJSON(`/v1/world/articles${qs ? `?${qs}` : ""}`);
}

export function fetchForexRates(): Promise<ForexRate[]> {
  return fetchJSON("/v1/economy/forex");
}

export function fetchEconomySummary(): Promise<EconomySummary> {
  return fetchJSON("/v1/economy/summary");
}

export function fetchMarketAssetQuotes(): Promise<MarketAssetQuote[]> {
  return fetchJSON("/v1/economy/assets");
}

export function fetchNepseSummary(): Promise<NepseSummary | null> {
  return fetchJSON<NepseSummary | null>("/v1/economy/nepse");
}

export function fetchElectionDatasets(): Promise<ElectionDataset[]> {
  return fetchJSON("/v1/election-datasets");
}
