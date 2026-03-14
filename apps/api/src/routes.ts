import { Hono } from "hono";
import {
  ConstituencyResultSchema,
  NationalSummarySchema,
  SignalEventSchema,
  SourceHealthSchema,
  EarthquakeIncidentSchema,
  CrisisSummarySchema,
  ForexRateSchema,
  EconomySummarySchema,
  MarketAssetQuoteSchema,
  NepseSummarySchema,
} from "@repo/shared";
import {
  getNationalSummary,
  getConstituencyResults,
  getConstituencyResult,
  getSignalEvents,
  getSocialSignalEvents,
  getAnomalies,
  getSourceHealth,
  getEarthquakeIncidents,
  getCrisisSummary,
  getForexRates,
  getEconomySummary,
  getMarketAssetQuotes,
  getNepseSummary,
  getElectionDatasets,
  updateNationalSummary,
  updateConstituencyResult,
  addSignalEvent,
  addAnomaly,
  updateSourceHealth,
  replaceEarthquakeIncidents,
  updateCrisisSummary,
  replaceForexRates,
  updateEconomySummary,
  replaceMarketAssetQuotes,
  updateNepseSummary,
  resetElectionData,
} from "./store";
import { broadcast } from "./sse";
import { detectAnomalies } from "./anomaly";

export const api = new Hono().basePath("/v1");

// ─── GET Routes ──────────────────────────────────────────────────────────────

api.get("/national-summary", (c) => {
  return c.json(getNationalSummary(c.req.query("dataset") ?? undefined));
});

api.get("/constituencies", (c) => {
  const dataset = c.req.query("dataset");
  const status = c.req.query("status");
  const province = c.req.query("province");

  let results = getConstituencyResults(dataset ?? undefined);

  if (status) {
    results = results.filter((r) => r.status === status);
  }
  if (province) {
    const provinceId = Number(province);
    results = results.filter((r) => r.provinceId === provinceId);
  }

  return c.json(results);
});

api.get("/constituencies/:id", (c) => {
  const result = getConstituencyResult(
    c.req.param("id"),
    c.req.query("dataset") ?? undefined
  );
  if (!result) {
    return c.json({ error: "Constituency not found" }, 404);
  }
  return c.json(result);
});

api.get("/districts", (c) => {
  const results = getConstituencyResults(c.req.query("dataset") ?? undefined);
  const districtMap = new Map<
    string,
    {
      districtName: string;
      provinceId: number;
      constituencies: number;
      totalVotes: number;
      counted: number;
    }
  >();

  for (const r of results) {
    const existing = districtMap.get(r.districtName);
    if (existing) {
      existing.constituencies++;
      existing.totalVotes += r.totalVotes;
      if (r.status === "final") existing.counted++;
    } else {
      districtMap.set(r.districtName, {
        districtName: r.districtName,
        provinceId: r.provinceId,
        constituencies: 1,
        totalVotes: r.totalVotes,
        counted: r.status === "final" ? 1 : 0,
      });
    }
  }

  return c.json(Array.from(districtMap.values()));
});

api.get("/districts/:id", (c) => {
  const requestedDistrictName = decodeURIComponent(c.req.param("id"));
  const normalizedDistrictName = requestedDistrictName.trim().toUpperCase();
  const results = getConstituencyResults(c.req.query("dataset") ?? undefined).filter(
    (r) => r.districtName.trim().toUpperCase() === normalizedDistrictName
  );

  if (results.length === 0) {
    return c.json({ error: "District not found" }, 404);
  }

  const aggregate = {
    districtName: results[0].districtName,
    provinceId: results[0].provinceId,
    constituencies: results.length,
    totalVotes: results.reduce((sum, r) => sum + r.totalVotes, 0),
    counted: results.filter((r) => r.status === "final").length,
    results,
  };

  return c.json(aggregate);
});

api.get("/provinces", (c) => {
  const results = getConstituencyResults(c.req.query("dataset") ?? undefined);
  const provinceMap = new Map<
    number,
    {
      provinceId: number;
      constituencies: number;
      totalVotes: number;
      counted: number;
      districts: number;
    }
  >();

  for (const r of results) {
    const existing = provinceMap.get(r.provinceId);
    if (existing) {
      existing.constituencies++;
      existing.totalVotes += r.totalVotes;
      if (r.status === "final") existing.counted++;
    } else {
      provinceMap.set(r.provinceId, {
        provinceId: r.provinceId,
        constituencies: 1,
        totalVotes: r.totalVotes,
        counted: r.status === "final" ? 1 : 0,
        districts: 0,
      });
    }
  }

  const districtCounts = new Map<number, Set<string>>();
  for (const r of results) {
    const districts = districtCounts.get(r.provinceId) ?? new Set<string>();
    districts.add(r.districtName);
    districtCounts.set(r.provinceId, districts);
  }

  return c.json(
    Array.from(provinceMap.values()).map((province) => ({
      ...province,
      districts: districtCounts.get(province.provinceId)?.size ?? 0,
    }))
  );
});

api.get("/provinces/:id", (c) => {
  const provinceId = Number(c.req.param("id"));
  if (Number.isNaN(provinceId)) {
    return c.json({ error: "Invalid province id" }, 400);
  }

  const results = getConstituencyResults(c.req.query("dataset") ?? undefined).filter(
    (r) => r.provinceId === provinceId
  );

  if (results.length === 0) {
    return c.json({ error: "Province not found" }, 404);
  }

  const districts = new Map<
    string,
    {
      districtName: string;
      provinceId: number;
      constituencies: number;
      totalVotes: number;
      counted: number;
    }
  >();

  for (const r of results) {
    const existing = districts.get(r.districtName);
    if (existing) {
      existing.constituencies++;
      existing.totalVotes += r.totalVotes;
      if (r.status === "final") existing.counted++;
    } else {
      districts.set(r.districtName, {
        districtName: r.districtName,
        provinceId,
        constituencies: 1,
        totalVotes: r.totalVotes,
        counted: r.status === "final" ? 1 : 0,
      });
    }
  }

  return c.json({
    provinceId,
    constituencies: results.length,
    totalVotes: results.reduce((sum, r) => sum + r.totalVotes, 0),
    counted: results.filter((r) => r.status === "final").length,
    districts: Array.from(districts.values()).sort((a, b) =>
      a.districtName.localeCompare(b.districtName)
    ),
    results,
  });
});

api.get("/feed", (c) => {
  const limit = Number(c.req.query("limit") ?? 20);
  const offset = Number(c.req.query("offset") ?? 0);
  return c.json(getSignalEvents(limit, offset));
});

api.get("/feed/social", (c) => {
  const limit = Number(c.req.query("limit") ?? 20);
  const offset = Number(c.req.query("offset") ?? 0);
  return c.json(getSocialSignalEvents(limit, offset));
});

api.get("/anomalies", (c) => {
  return c.json(getAnomalies());
});

api.get("/sources/health", (c) => {
  return c.json(getSourceHealth());
});

api.get("/crisis/earthquakes", (c) => {
  return c.json(getEarthquakeIncidents());
});

api.get("/crisis/summary", (c) => {
  return c.json(
    getCrisisSummary() ?? {
      sourceId: "usgs",
      sourceName: "USGS Earthquake Hazards Program",
      timestamp: new Date().toISOString(),
      totalIncidents: 0,
      last24h: 0,
      maxMagnitude: 0,
      averageDepthKm: 0,
      incidentsBySeverity: {
        minor: 0,
        light: 0,
        moderate: 0,
        strongPlus: 0,
      },
    }
  );
});

api.get("/economy/forex", (c) => {
  return c.json(getForexRates());
});

api.get("/economy/summary", (c) => {
  return c.json(
    getEconomySummary() ?? {
      sourceId: "economy:forex",
      sourceName: "Nepal Rastra Bank Forex",
      timestamp: new Date().toISOString(),
      baseCurrency: "NPR",
      trackedRates: 0,
      advancingRates: 0,
      decliningRates: 0,
      unchangedRates: 0,
      usdBuy: null,
      eurBuy: null,
      gbpBuy: null,
      inrBuy: null,
      topMovers: [],
    }
  );
});

api.get("/economy/assets", (c) => {
  return c.json(getMarketAssetQuotes());
});

api.get("/economy/nepse", (c) => {
  return c.json(getNepseSummary() ?? null);
});

api.get("/election-datasets", (c) => {
  return c.json(getElectionDatasets());
});

// ─── POST Ingest Routes ─────────────────────────────────────────────────────

api.post("/ingest/snapshot", async (c) => {
  const body = await c.req.json();
  const parsed = ConstituencyResultSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid payload", issues: parsed.error.issues }, 400);
  }

  const newResult = parsed.data;
  const previousResult = getConstituencyResult(newResult.constituencyId);

  const anomalies = detectAnomalies(newResult, previousResult);
  for (const anomaly of anomalies) {
    addAnomaly(anomaly);
    broadcast({ type: "anomaly", data: anomaly });
  }

  updateConstituencyResult(newResult);
  broadcast({ type: "snapshot", data: newResult });

  return c.json({ ok: true, anomalies: anomalies.length });
});

api.post("/ingest/summary", async (c) => {
  const body = await c.req.json();
  const parsed = NationalSummarySchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid payload", issues: parsed.error.issues }, 400);
  }

  updateNationalSummary(parsed.data);
  broadcast({ type: "summary", data: parsed.data });

  return c.json({ ok: true });
});

api.post("/ingest/event", async (c) => {
  const body = await c.req.json();
  const parsed = SignalEventSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid payload", issues: parsed.error.issues }, 400);
  }

  addSignalEvent(parsed.data);
  broadcast({ type: "event", data: parsed.data });

  return c.json({ ok: true });
});

api.post("/ingest/source-health", async (c) => {
  const body = await c.req.json();
  const parsed = SourceHealthSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid payload", issues: parsed.error.issues }, 400);
  }

  updateSourceHealth(parsed.data);
  return c.json({ ok: true });
});

api.post("/ingest/crisis/earthquakes", async (c) => {
  const body = await c.req.json();
  const parsed = EarthquakeIncidentSchema.array().safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid payload", issues: parsed.error.issues }, 400);
  }

  replaceEarthquakeIncidents(parsed.data);
  return c.json({ ok: true, count: parsed.data.length });
});

api.post("/ingest/crisis/summary", async (c) => {
  const body = await c.req.json();
  const parsed = CrisisSummarySchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid payload", issues: parsed.error.issues }, 400);
  }

  updateCrisisSummary(parsed.data);
  return c.json({ ok: true });
});

api.post("/ingest/economy/forex", async (c) => {
  const body = await c.req.json();
  const parsed = ForexRateSchema.array().safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid payload", issues: parsed.error.issues }, 400);
  }

  replaceForexRates(parsed.data);
  return c.json({ ok: true, count: parsed.data.length });
});

api.post("/ingest/economy/summary", async (c) => {
  const body = await c.req.json();
  const parsed = EconomySummarySchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid payload", issues: parsed.error.issues }, 400);
  }

  updateEconomySummary(parsed.data);
  return c.json({ ok: true });
});

api.post("/ingest/economy/assets", async (c) => {
  const body = await c.req.json();
  const parsed = MarketAssetQuoteSchema.array().safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid payload", issues: parsed.error.issues }, 400);
  }

  replaceMarketAssetQuotes(parsed.data);
  return c.json({ ok: true, count: parsed.data.length });
});

api.post("/ingest/economy/nepse", async (c) => {
  const body = await c.req.json();
  const parsed = NepseSummarySchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid payload", issues: parsed.error.issues }, 400);
  }

  updateNepseSummary(parsed.data);
  return c.json({ ok: true });
});

api.post("/ingest/reset-election", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const datasetId =
    body && typeof body === "object" && "datasetId" in body
      ? String((body as { datasetId?: string }).datasetId ?? "")
      : undefined;
  resetElectionData(datasetId || undefined);
  return c.json({ ok: true });
});
