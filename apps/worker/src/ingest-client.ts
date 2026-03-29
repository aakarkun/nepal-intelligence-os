import type {
  NationalSummary,
  ConstituencyResult,
  SignalEvent,
  SourceHealth,
  EarthquakeIncident,
  CrisisSummary,
  CrisisIncident,
  FloodAlertsPayload,
  CabinetEvent,
  ParliamentSession,
  GeopoliticsArticle,
  ForexRate,
  EconomySummary,
  MarketAssetQuote,
  NepseSummary,
  MarketPortalSnapshot,
  PoliticalPulseEvent,
  LegislativeBillRow,
} from "@repo/shared";

const ENDPOINTS = {
  summary: "/v1/ingest/summary",
  snapshot: "/v1/ingest/snapshot",
  event: "/v1/ingest/event",
  sourceHealth: "/v1/ingest/source-health",
  crisisEarthquakes: "/v1/ingest/crisis/earthquakes",
  crisisSummary: "/v1/ingest/crisis/summary",
  crisisIncidents: "/v1/ingest/crisis/incidents",
  economyForex: "/v1/ingest/economy/forex",
  economySummary: "/v1/ingest/economy/summary",
  economyAssets: "/v1/ingest/economy/assets",
  economyNepse: "/v1/ingest/economy/nepse",
  economyMarketPortal: "/v1/ingest/economy/market-portal",
  crisisFloodAlerts: "/v1/ingest/crisis/flood-alerts",
  politicsCabinetEvents: "/v1/ingest/politics/cabinet-events",
  politicsParliamentSession: "/v1/ingest/politics/parliament-session",
  worldArticles: "/v1/ingest/world/articles",
  politicalPulseEvent: "/v1/ingest/political-pulse/event",
  politicalPulseBill: "/v1/ingest/political-pulse/bill",
  politicalPulseWeeklyDigest: "/v1/ingest/political-pulse/weekly-digest",
} as const;

async function post(
  apiUrl: string,
  endpoint: string,
  payload: unknown
): Promise<boolean> {
  const url = `${apiUrl.replace(/\/$/, "")}${endpoint}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret = process.env.WORKER_SECRET;
  if (secret) headers["X-Worker-Secret"] = secret;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (res.ok) return true;
  const text = await res.text().catch(() => "");
  console.warn(`[ingest] POST ${endpoint} failed: ${res.status} ${text.slice(0, 400)}`);
  return false;
}

export async function postSummary(
  apiUrl: string,
  summary: NationalSummary
): Promise<boolean> {
  return post(apiUrl, ENDPOINTS.summary, summary);
}

export async function postSnapshot(
  apiUrl: string,
  snapshot: ConstituencyResult
): Promise<boolean> {
  return post(apiUrl, ENDPOINTS.snapshot, snapshot);
}

export async function postEvent(
  apiUrl: string,
  event: SignalEvent
): Promise<boolean> {
  return post(apiUrl, ENDPOINTS.event, event);
}

export async function postSourceHealth(
  apiUrl: string,
  health: SourceHealth
): Promise<boolean> {
  return post(apiUrl, ENDPOINTS.sourceHealth, health);
}

export async function postEarthquakeIncidents(
  apiUrl: string,
  incidents: EarthquakeIncident[]
): Promise<boolean> {
  return post(apiUrl, ENDPOINTS.crisisEarthquakes, incidents);
}

export async function postCrisisSummary(
  apiUrl: string,
  summary: CrisisSummary
): Promise<boolean> {
  return post(apiUrl, ENDPOINTS.crisisSummary, summary);
}

export async function postCrisisIncidents(
  apiUrl: string,
  incidents: CrisisIncident[]
): Promise<boolean> {
  return post(apiUrl, ENDPOINTS.crisisIncidents, incidents);
}

export async function postForexRates(
  apiUrl: string,
  rates: ForexRate[]
): Promise<boolean> {
  return post(apiUrl, ENDPOINTS.economyForex, rates);
}

export async function postEconomySummary(
  apiUrl: string,
  summary: EconomySummary
): Promise<boolean> {
  return post(apiUrl, ENDPOINTS.economySummary, summary);
}

export async function postMarketAssetQuotes(
  apiUrl: string,
  quotes: MarketAssetQuote[]
): Promise<boolean> {
  return post(apiUrl, ENDPOINTS.economyAssets, quotes);
}

export async function postNepseSummary(
  apiUrl: string,
  summary: NepseSummary
): Promise<boolean> {
  return post(apiUrl, ENDPOINTS.economyNepse, summary);
}

export async function postMarketPortalSnapshot(
  apiUrl: string,
  snapshot: MarketPortalSnapshot
): Promise<boolean> {
  return post(apiUrl, ENDPOINTS.economyMarketPortal, snapshot);
}

export async function postFloodAlerts(
  apiUrl: string,
  payload: FloodAlertsPayload
): Promise<boolean> {
  return post(apiUrl, ENDPOINTS.crisisFloodAlerts, payload);
}

export async function postCabinetEvents(
  apiUrl: string,
  events: CabinetEvent[]
): Promise<boolean> {
  return post(apiUrl, ENDPOINTS.politicsCabinetEvents, events);
}

export async function postParliamentSession(
  apiUrl: string,
  session: ParliamentSession
): Promise<boolean> {
  return post(apiUrl, ENDPOINTS.politicsParliamentSession, session);
}

export async function postWorldArticles(
  apiUrl: string,
  articles: GeopoliticsArticle[]
): Promise<boolean> {
  return post(apiUrl, ENDPOINTS.worldArticles, articles);
}

export async function postPoliticalEvent(
  apiUrl: string,
  event: Omit<PoliticalPulseEvent, "fetchedAt"> & { fetchedAt?: string }
): Promise<boolean> {
  return post(apiUrl, ENDPOINTS.politicalPulseEvent, event);
}

export async function postMinisterBio(
  apiUrl: string,
  mpId: string,
  payload: { bioText: string | null; bioSource: string; bioFetchedAt: string }
): Promise<boolean> {
  const endpoint = `/v1/ingest/political-pulse/mp/${encodeURIComponent(mpId)}/bio`;
  return post(apiUrl, endpoint, payload);
}

export async function postLegislativeBill(
  apiUrl: string,
  bill: LegislativeBillRow
): Promise<boolean> {
  return post(apiUrl, ENDPOINTS.politicalPulseBill, bill);
}

export async function postWeeklyDigest(
  apiUrl: string,
  digest: {
    content: string;
    periodStart: string;
    periodEnd: string;
    generatedAt: string;
  }
): Promise<boolean> {
  return post(apiUrl, ENDPOINTS.politicalPulseWeeklyDigest, digest);
}

export type NewsFeedSourceRow = {
  id: string;
  name: string;
  rssUrl: string;
  websiteUrl: string | null;
  language: string | null;
  category: string | null;
  isActive: boolean;
  lastPolledAt: string | null;
  pollIntervalMinutes: number;
};

export async function getPoliticalNewsSources(
  apiUrl: string
): Promise<NewsFeedSourceRow[] | null> {
  const url = `${apiUrl.replace(/\/$/, "")}/v1/political-pulse/news-sources`;
  const headers: Record<string, string> = {};
  if (process.env.WORKER_SECRET) headers["X-Worker-Secret"] = process.env.WORKER_SECRET;
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    return (await res.json()) as NewsFeedSourceRow[];
  } catch {
    return null;
  }
}

export async function urlExistsInPoliticalPulse(
  apiUrl: string,
  articleUrl: string
): Promise<boolean> {
  const u = new URL(`${apiUrl.replace(/\/$/, "")}/v1/political-pulse/exists`);
  u.searchParams.set("url", articleUrl);
  const headers: Record<string, string> = {};
  if (process.env.WORKER_SECRET) headers["X-Worker-Secret"] = process.env.WORKER_SECRET;
  try {
    const res = await fetch(u.toString(), { headers });
    if (!res.ok) return false;
    const data = (await res.json()) as { exists?: boolean };
    return data.exists === true;
  } catch {
    return false;
  }
}

export async function postNewsSourcePolled(
  apiUrl: string,
  sourceId: string,
  at: string
): Promise<boolean> {
  const url = `${apiUrl.replace(/\/$/, "")}/v1/ingest/political-pulse/news-source/${encodeURIComponent(sourceId)}/polled`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.WORKER_SECRET) headers["X-Worker-Secret"] = process.env.WORKER_SECRET;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ at }),
  });
  return res.ok;
}

/** Notify API that a watchlist item was triggered (e.g. after sending Telegram alert). */
export async function postWatchlistTriggered(
  apiUrl: string,
  watchlistItemId: string
): Promise<boolean> {
  const endpoint = `/v1/ingest/watchlist/${watchlistItemId}/triggered`;
  const url = `${apiUrl.replace(/\/$/, "")}${endpoint}`;
  const res = await fetch(url, { method: "POST" });
  return res.ok;
}

export type EcnIngestPayload = {
  summary: NationalSummary | null;
  constituencies: ConstituencyResult[];
};

/**
 * Runs full ECN ingest: POST summary (if present), each constituency snapshot, then source health.
 */
export async function runEcnIngest(
  apiUrl: string,
  ecnData: EcnIngestPayload
): Promise<void> {
  const { summary, constituencies } = ecnData;
  const now = new Date().toISOString();

  if (summary) {
    const ok = await postSummary(apiUrl, summary);
    if (!ok) {
      console.warn("[ingest] POST summary failed");
    }
  }

  for (const snapshot of constituencies) {
    const ok = await postSnapshot(apiUrl, snapshot);
    if (!ok) {
      console.warn(`[ingest] POST snapshot ${snapshot.constituencyId} failed`);
    }
  }

  const health: SourceHealth = {
    sourceId: "ecn",
    sourceName: "Election Commission of Nepal",
    lastUpdate: now,
    errorRate: 0,
    status: "live",
    updateCount: (summary ? 1 : 0) + constituencies.length,
  };
  await postSourceHealth(apiUrl, health);
}
