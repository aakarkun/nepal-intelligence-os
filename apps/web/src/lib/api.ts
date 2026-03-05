import { API_URL } from "./utils";
import type {
  NationalSummary,
  ConstituencyResult,
  SignalEvent,
  Anomaly,
  SourceHealth,
} from "@repo/shared";

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export function fetchNationalSummary(): Promise<NationalSummary> {
  return fetchJSON("/v1/national-summary");
}

export function fetchConstituencies(params?: {
  status?: string;
  province?: number;
}): Promise<ConstituencyResult[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.province) query.set("province", String(params.province));
  const qs = query.toString();
  return fetchJSON(`/v1/constituencies${qs ? `?${qs}` : ""}`);
}

export function fetchConstituency(id: string): Promise<ConstituencyResult> {
  return fetchJSON(`/v1/constituencies/${encodeURIComponent(id)}`);
}

export function fetchDistricts(): Promise<
  Array<{
    districtName: string;
    provinceId: number;
    constituencies: number;
    totalVotes: number;
    counted: number;
  }>
> {
  return fetchJSON("/v1/districts");
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
