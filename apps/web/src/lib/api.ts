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
  MarketPortalSnapshot,
  NrbBulletinSnapshot,
  PoliticalPulseEvent,
  PartyIntelRow,
  PoliticalPulseStats,
  PoliticalWeeklyDigest,
  PartyActivity,
  CabinetMinisterWatch,
  LegislativeBillRow,
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
  offset = 0,
  type?: string,
  severity?: string
): Promise<{ events: SignalEvent[]; total: number }> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (type && type !== "all") params.set("type", type);
  if (severity && severity !== "all") params.set("severity", severity);
  return fetchJSON(`/v1/feed?${params.toString()}`);
}

export function fetchSocialFeed(
  limit = 20,
  offset = 0,
  type?: string,
  severity?: string
): Promise<{ events: SignalEvent[]; total: number }> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (type && type !== "all") params.set("type", type);
  if (severity && severity !== "all") params.set("severity", severity);
  return fetchJSON(`/v1/feed/social?${params.toString()}`);
}

export type AnomalyContextFilter = "election" | "operational" | "all";

export function fetchAnomalies(context?: AnomalyContextFilter): Promise<Anomaly[]> {
  const params = new URLSearchParams();
  if (context && context !== "all") params.set("context", context);
  const qs = params.toString();
  return fetchJSON(`/v1/anomalies${qs ? `?${qs}` : ""}`);
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

export function fetchNrbBulletin(): Promise<NrbBulletinSnapshot | null> {
  return fetchJSON<NrbBulletinSnapshot | null>("/v1/economy/nrb-bulletin");
}

export function fetchMarketAssetQuotes(): Promise<MarketAssetQuote[]> {
  return fetchJSON("/v1/economy/assets");
}

export function fetchNepseSummary(): Promise<NepseSummary | null> {
  return fetchJSON<NepseSummary | null>("/v1/economy/nepse");
}

export function fetchMarketPortalSnapshot(): Promise<MarketPortalSnapshot | null> {
  return fetchJSON<MarketPortalSnapshot | null>("/v1/economy/market-portal");
}

export type UpcomingIssueApiRow = {
  symbol: string;
  company: string;
  units: number;
  sector: string;
  remark?: string | null;
};

export type UpcomingIssuesApiMeta = {
  asOf?: string | null;
  ingestedAt?: string | null;
  source?: string | null;
};

export type UpcomingIssuesApiData = Record<string, UpcomingIssueApiRow[]>;

export type UpcomingIssuesApiResponse =
  | UpcomingIssuesApiData
  | {
      data: UpcomingIssuesApiData;
      meta?: UpcomingIssuesApiMeta | null;
    };

export function fetchUpcomingIssues(): Promise<UpcomingIssuesApiResponse> {
  return fetchJSON("/v1/economy/upcoming-issues");
}

export type NepseSnapshotHistoryRow = {
  id: string;
  indexValue: number | null;
  change: number | null;
  changePercent: number | null;
  turnover: number | null;
  marketStatus: string | null;
  topGainers: unknown;
  topLosers: unknown;
  scrapedAt: string;
};

export function fetchNepseHistory(limit = 500): Promise<NepseSnapshotHistoryRow[]> {
  const q = new URLSearchParams({ limit: String(Math.min(2000, Math.max(1, limit))) });
  return fetchJSON<NepseSnapshotHistoryRow[]>(`/v1/economy/nepse/history?${q}`);
}

export function fetchElectionDatasets(): Promise<ElectionDataset[]> {
  return fetchJSON("/v1/election-datasets");
}

export function fetchPoliticalPulseEvents(params?: {
  category?: string;
  partyId?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<{ events: PoliticalPulseEvent[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.category) q.set("category", params.category);
  if (params?.partyId) q.set("party_id", params.partyId);
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  if (params?.q) q.set("q", params.q);
  if (params?.page != null) q.set("page", String(params.page));
  if (params?.limit != null) q.set("limit", String(params.limit));
  const qs = q.toString();
  return fetchJSON(`/v1/political-pulse/events${qs ? `?${qs}` : ""}`);
}

export function fetchPoliticalPulseParties(): Promise<PartyIntelRow[]> {
  return fetchJSON("/v1/political-pulse/parties");
}

export function fetchPoliticalPulseBills(): Promise<{
  bills: LegislativeBillRow[];
  countsByStatus: Record<string, number>;
}> {
  return fetchJSON("/v1/political-pulse/bills");
}

export function fetchPoliticalPulseStats(): Promise<PoliticalPulseStats> {
  return fetchJSON("/v1/political-pulse/stats");
}

export function fetchPoliticalPulseWeeklyDigest(): Promise<PoliticalWeeklyDigest | null> {
  return fetchJSON<PoliticalWeeklyDigest | null>("/v1/political-pulse/summary/weekly");
}

export function fetchPartyActivity(partyId: string): Promise<PartyActivity> {
  return fetchJSON(`/v1/political-pulse/parties/${encodeURIComponent(partyId)}/activity`);
}

export function fetchCabinetWatch(): Promise<CabinetMinisterWatch[]> {
  return fetchJSON("/v1/political-pulse/cabinet-watch");
}

export type IntelBriefType = "daily" | "economic" | "crisis" | "custom";

export type IntelBriefRequest = {
  type: IntelBriefType;
  query?: string;
};

export type IntelBriefResponse = {
  type: string;
  brief: string;
  generatedAt: string;
  dataPoints: number;
};

export async function fetchIntelBrief(
  request: IntelBriefRequest
): Promise<IntelBriefResponse> {
  const res = await fetch(`${API_URL}/v1/intel/brief`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
    throw new Error(err.detail ?? err.error ?? `API error: ${res.status}`);
  }
  return res.json();
}

export type WatchlistItemType =
  | "keyword"
  | "constituency"
  | "district"
  | "price_threshold"
  | "crisis_severity";

export type WatchlistItem = {
  id: string;
  label: string;
  type: WatchlistItemType;
  value: string;
  threshold?: number;
  createdAt: string;
  lastTriggeredAt?: string;
  active: boolean;
};

export async function createWatchlistItem(body: {
  label: string;
  type: WatchlistItemType;
  value: string;
  active?: boolean;
}): Promise<WatchlistItem> {
  const res = await fetch(`${API_URL}/v1/watchlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
    throw new Error(err.detail ?? err.error ?? `API error: ${res.status}`);
  }
  return res.json();
}

export type ReactionStatus = { count: number; liked: boolean };

export async function postReaction(body: {
  itemId: string;
  itemTitle: string;
  reaction: "like";
  email?: string | null;
  fingerprint: string;
}): Promise<{ liked: true; count: number }> {
  const res = await fetch(`${API_URL}/v1/reactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
    throw new Error(err.detail ?? err.error ?? `API error: ${res.status}`);
  }
  return res.json();
}

export async function deleteReaction(
  itemId: string,
  fingerprint: string
): Promise<{ liked: false; count: number }> {
  const res = await fetch(`${API_URL}/v1/reactions/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fingerprint }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
    throw new Error(err.detail ?? err.error ?? `API error: ${res.status}`);
  }
  return res.json();
}

export async function getReactionStatus(
  itemId: string,
  fingerprint?: string
): Promise<ReactionStatus> {
  const url = new URL(`${API_URL}/v1/reactions/${encodeURIComponent(itemId)}`);
  if (fingerprint) url.searchParams.set("fp", fingerprint);
  const res = await fetch(url.toString());
  if (!res.ok) return { count: 0, liked: false };
  return res.json();
}

export async function getReactionsBatch(
  ids: string[],
  fingerprint?: string
): Promise<Record<string, ReactionStatus>> {
  if (ids.length === 0) return {};
  const url = new URL(`${API_URL}/v1/reactions/batch`);
  url.searchParams.set("ids", ids.slice(0, 50).join(","));
  if (fingerprint) url.searchParams.set("fp", fingerprint);
  const res = await fetch(url.toString());
  if (!res.ok) return {};
  return res.json();
}

export async function patchAssociateEmail(
  fingerprint: string,
  email: string
): Promise<{ updated: number }> {
  const res = await fetch(`${API_URL}/v1/reactions/associate-email`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fingerprint, email }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
    throw new Error(err.detail ?? err.error ?? `API error: ${res.status}`);
  }
  return res.json();
}
