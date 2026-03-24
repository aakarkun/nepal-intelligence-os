/**
 * Evaluates watchlist rules against current API state and sends Telegram alerts
 * when rules match. Called at the end of each live cycle.
 */

import type { WatchlistItem } from "@repo/shared";
import { sendTelegramMessage } from "./telegram";
import { postWatchlistTriggered } from "../ingest-client";

export type WatchlistContextSignal = { title: string; body: string; constituencyId?: string };
export type WatchlistContextCrisisSummary = { incidentsBySeverity: Record<string, number> };
export type WatchlistContextCrisisIncident = { place: string };
export type WatchlistContextFloodAlert = { district: string };
export type WatchlistContextEarthquake = { place: string };
export type WatchlistContextNepse = { index: number };
export type WatchlistContextAssetQuote = { assetCode: string; price: number };

export type WatchlistContext = {
  signals: WatchlistContextSignal[];
  crisisSummary: WatchlistContextCrisisSummary | null;
  crisisIncidents: WatchlistContextCrisisIncident[];
  floodAlerts: WatchlistContextFloodAlert[];
  earthquakes: WatchlistContextEarthquake[];
  nepseSummary: WatchlistContextNepse | null;
  assetQuotes: WatchlistContextAssetQuote[];
};

type SignalEvent = WatchlistContextSignal;
type CrisisSummary = WatchlistContextCrisisSummary;
type CrisisIncident = WatchlistContextCrisisIncident;
type FloodAlert = WatchlistContextFloodAlert;
type EarthquakeIncident = WatchlistContextEarthquake;
type NepseSummary = WatchlistContextNepse;
type MarketAssetQuote = WatchlistContextAssetQuote;

function norm(s: string): string {
  return s.toLowerCase().trim();
}

function matchesKeyword(value: string, signals: SignalEvent[]): boolean {
  const v = norm(value);
  if (!v) return false;
  for (const s of signals) {
    if (norm(s.title).includes(v) || norm(s.body).includes(v)) return true;
  }
  return false;
}

function matchesConstituency(value: string, signals: SignalEvent[]): boolean {
  const v = norm(value);
  for (const s of signals) {
    if (s.constituencyId && norm(s.constituencyId) === v) return true;
    if (norm(s.title).includes(v) || norm(s.body).includes(v)) return true;
  }
  return false;
}

function matchesDistrict(
  value: string,
  earthquakes: EarthquakeIncident[],
  crisisIncidents: CrisisIncident[],
  floodAlerts: FloodAlert[]
): boolean {
  const v = norm(value);
  for (const e of earthquakes) {
    if (norm(e.place).includes(v)) return true;
  }
  for (const c of crisisIncidents) {
    if (norm(c.place).includes(v)) return true;
  }
  for (const f of floodAlerts) {
    if (norm(f.district).includes(v)) return true;
  }
  return false;
}

function matchesPriceThreshold(
  value: string,
  threshold: number | undefined,
  nepseSummary: NepseSummary | null,
  assetQuotes: MarketAssetQuote[]
): boolean {
  if (threshold === undefined || !Number.isFinite(threshold)) return false;
  const symbol = norm(value);
  if (symbol === "nepse" && nepseSummary) {
    return nepseSummary.index >= threshold;
  }
  const asset = assetQuotes.find((a) => norm(a.assetCode) === symbol);
  return asset ? asset.price >= threshold : false;
}

function matchesCrisisSeverity(
  value: string,
  crisisSummary: CrisisSummary | null
): boolean {
  if (!crisisSummary?.incidentsBySeverity) return false;
  const key = value as keyof typeof crisisSummary.incidentsBySeverity;
  const count = crisisSummary.incidentsBySeverity[key];
  return typeof count === "number" && count > 0;
}

function itemMatches(item: WatchlistItem, ctx: WatchlistContext): boolean {
  switch (item.type) {
    case "keyword":
      return matchesKeyword(item.value, ctx.signals);
    case "constituency":
      return matchesConstituency(item.value, ctx.signals);
    case "district":
      return matchesDistrict(
        item.value,
        ctx.earthquakes,
        ctx.crisisIncidents,
        ctx.floodAlerts
      );
    case "price_threshold":
      return matchesPriceThreshold(
        item.value,
        item.threshold,
        ctx.nepseSummary,
        ctx.assetQuotes
      );
    case "crisis_severity":
      return matchesCrisisSeverity(item.value, ctx.crisisSummary);
    default:
      return false;
  }
}

/** Exported for unit tests: evaluates whether a watchlist item matches the given context. */
export function evaluateWatchlistItem(
  item: WatchlistItem,
  ctx: WatchlistContext
): boolean {
  return itemMatches(item, ctx);
}

type FeedResponse = { events?: SignalEvent[]; total?: number } | SignalEvent[];

export function normalizeSignalsFromFeedResponse(payload: unknown): SignalEvent[] {
  if (Array.isArray(payload)) {
    return payload as SignalEvent[];
  }

  if (payload && typeof payload === "object" && "events" in payload) {
    const events = (payload as FeedResponse & { events?: unknown }).events;
    return Array.isArray(events) ? (events as SignalEvent[]) : [];
  }

  return [];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json() as Promise<T>;
}

export async function runWatchlistCheck(
  apiUrl: string,
  telegramBotToken: string | undefined
): Promise<void> {
  const base = apiUrl.replace(/\/$/, "");
  let watchlist: WatchlistItem[];
  try {
    watchlist = await fetchJson<WatchlistItem[]>(`${base}/v1/watchlist`);
  } catch (e) {
    console.warn("[watchlist] Failed to fetch watchlist:", e instanceof Error ? e.message : e);
    return;
  }

  const active = watchlist.filter((w) => w.active);
  if (active.length === 0) return;

  let ctx: WatchlistContext;
  try {
    const [signalsResponse, crisisSummary, crisisIncidents, floodPayload, earthquakes, nepseSummary, assetQuotes] =
      await Promise.all([
        fetchJson<FeedResponse>(`${base}/v1/feed?limit=80`),
        fetchJson<CrisisSummary | null>(`${base}/v1/crisis/summary`).catch(() => null),
        fetchJson<CrisisIncident[]>(`${base}/v1/crisis/incidents`).catch(() => []),
        fetchJson<{ alerts?: FloodAlert[] }>(`${base}/v1/crisis/flood-alerts`).catch(() => ({ alerts: [] })),
        fetchJson<EarthquakeIncident[]>(`${base}/v1/crisis/earthquakes`).catch(() => []),
        fetchJson<NepseSummary | null>(`${base}/v1/economy/nepse`).catch(() => null),
        fetchJson<MarketAssetQuote[]>(`${base}/v1/economy/assets`).catch(() => []),
      ]);
    ctx = {
      signals: normalizeSignalsFromFeedResponse(signalsResponse),
      crisisSummary,
      crisisIncidents: Array.isArray(crisisIncidents) ? crisisIncidents : [],
      floodAlerts: Array.isArray(floodPayload?.alerts) ? floodPayload.alerts : [],
      earthquakes: Array.isArray(earthquakes) ? earthquakes : [],
      nepseSummary,
      assetQuotes: Array.isArray(assetQuotes) ? assetQuotes : [],
    };
  } catch (e) {
    console.warn("[watchlist] Failed to fetch context:", e instanceof Error ? e.message : e);
    return;
  }

  for (const item of active) {
    if (!itemMatches(item, ctx)) continue;

    const chatId = item.telegramChatId?.trim();
    const message = `[Watch] ${item.label}\nType: ${item.type}\nValue: ${item.value}${item.threshold != null ? ` (threshold: ${item.threshold})` : ""}`;

    if (chatId && telegramBotToken) {
      const sent = await sendTelegramMessage(telegramBotToken, chatId, message);
      if (!sent) console.warn("[watchlist] Telegram send failed for", item.id);
    }

    const ok = await postWatchlistTriggered(apiUrl, item.id);
    if (!ok) console.warn("[watchlist] Ingest triggered failed for", item.id);
  }
}
