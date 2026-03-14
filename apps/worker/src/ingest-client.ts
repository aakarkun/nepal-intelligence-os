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
  crisisFloodAlerts: "/v1/ingest/crisis/flood-alerts",
  politicsCabinetEvents: "/v1/ingest/politics/cabinet-events",
  politicsParliamentSession: "/v1/ingest/politics/parliament-session",
  worldArticles: "/v1/ingest/world/articles",
} as const;

async function post(
  apiUrl: string,
  endpoint: string,
  payload: unknown
): Promise<boolean> {
  const url = `${apiUrl.replace(/\/$/, "")}${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.ok;
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
