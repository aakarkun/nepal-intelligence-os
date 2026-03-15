import { Hono } from "hono";
import { z } from "zod";
import {
  ConstituencyResultSchema,
  NationalSummarySchema,
  SignalEventSchema,
  SourceHealthSchema,
  EarthquakeIncidentSchema,
  CrisisSummarySchema,
  CrisisIncidentSchema,
  FloodAlertsPayloadSchema,
  CabinetEventSchema,
  ParliamentSessionSchema,
  GeopoliticsArticleSchema,
  ForexRateSchema,
  EconomySummarySchema,
  MarketAssetQuoteSchema,
  NepseSummarySchema,
  WatchlistItemSchema,
  WatchlistItemTypeSchema,
  ReactionSchema,
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
  getCrisisIncidents,
  getFloodAlerts,
  setFloodAlerts,
  getCabinetEvents,
  setCabinetEvents,
  getParliamentSession,
  setParliamentSession,
  getWorldArticles,
  upsertWorldArticles,
  getForexRates,
  getEconomySummary,
  getMarketAssetQuotes,
  getNepseSummary,
  getElectionDatasets,
  getWatchlist,
  createWatchlistItem,
  deleteWatchlistItem,
  toggleWatchlistItemActive,
  updateWatchlistItemLastTriggered,
  addReaction,
  removeReaction,
  getReactionStatus,
  getReactionsBatch,
  associateEmailWithFingerprint,
  updateNationalSummary,
  updateConstituencyResult,
  addSignalEvent,
  addAnomaly,
  updateSourceHealth,
  replaceEarthquakeIncidents,
  updateCrisisSummary,
  replaceCrisisIncidents,
  replaceForexRates,
  updateEconomySummary,
  replaceMarketAssetQuotes,
  updateNepseSummary,
  resetElectionData,
} from "./store";
import { broadcast } from "./sse";
import { detectAnomalies } from "./anomaly";
import {
  buildContextAndPrompt,
  callAnthropic,
  type BriefResponse,
} from "./intel-brief";
import { getCircuitBreaker } from "./lib/circuit-breaker";
import * as workerStateRepo from "./db/repos/worker-state.js";

function requireWorkerSecret(c: { req: { header: (n: string) => string | undefined } }): boolean {
  const secret = process.env.WORKER_SECRET;
  if (!secret) return true;
  return c.req.header("X-Worker-Secret") === secret;
}

const IntelBriefRequestSchema = z.object({
  type: z.enum(["daily", "economic", "crisis", "custom"]),
  query: z.string().optional(),
});

const pendingResets = new Set<string>();

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

api.get("/feed", async (c) => {
  const limit = Number(c.req.query("limit") ?? 20);
  const offset = Number(c.req.query("offset") ?? 0);
  const type = c.req.query("type");
  const severity = c.req.query("severity");
  const result = await getSignalEvents(limit, offset, type ?? undefined, severity ?? undefined);
  return c.json(result);
});

api.get("/feed/social", async (c) => {
  const limit = Number(c.req.query("limit") ?? 20);
  const offset = Number(c.req.query("offset") ?? 0);
  const type = c.req.query("type");
  const severity = c.req.query("severity");
  const result = await getSocialSignalEvents(limit, offset, type ?? undefined, severity ?? undefined);
  return c.json(result);
});

api.get("/anomalies", async (c) => {
  const context = c.req.query("context") as "election" | "operational" | "all" | undefined;
  const valid = context === "election" || context === "operational" || context === "all" ? context : undefined;
  return c.json(await getAnomalies(valid));
});

api.get("/sources/health", async (c) => {
  return c.json(await getSourceHealth());
});

api.get("/admin/sources/health", async (c) => {
  return c.json(await getSourceHealth());
});

api.get("/admin/consume-reset/:sourceId", (c) => {
  const secret = c.req.header("X-Admin-Secret");
  if (process.env.ADMIN_SECRET && secret !== process.env.ADMIN_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const sourceId = c.req.param("sourceId");
  const consumed = pendingResets.has(sourceId);
  if (consumed) pendingResets.delete(sourceId);
  return c.json({ consumed });
});

// ─── Worker state (DB-backed; X-Worker-Secret) ───────────────────────────────

api.get("/worker-state", async (c) => {
  if (!requireWorkerSecret(c)) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const state = await workerStateRepo.getWorkerState();
  if (!state) return c.json({ error: "Worker state not found" }, 404);
  return c.json(state);
});

api.patch("/worker-state", async (c) => {
  if (!requireWorkerSecret(c)) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const partial: Parameters<typeof workerStateRepo.updateWorkerState>[0] = {};
  const keys = [
    "lastNepseRunAt", "lastCoingeckoRunAt", "lastMetalsRunAt", "lastNrbRunAt",
    "lastNewsRunAt", "lastRssNepalRunAt", "lastParliamentRunAt", "lastDhmRunAt",
    "lastGdacsRunAt", "lastGdeltRunAt", "lastUnRssRunAt", "lastUsgsRunAt",
  ] as const;
  for (const k of keys) {
    if (body[k] !== undefined && typeof body[k] === "number") partial[k] = body[k];
  }
  await workerStateRepo.updateWorkerState(partial);
  return c.json({ ok: true });
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

api.get("/crisis/incidents", async (c) => {
  return c.json(await getCrisisIncidents());
});

api.get("/crisis/flood-alerts", async (c) => {
  const status = c.req.query("status");
  return c.json(await getFloodAlerts(status ?? undefined));
});

api.get("/politics/cabinet-events", async (c) => {
  const limit = Number(c.req.query("limit") ?? 10);
  return c.json(await getCabinetEvents(limit));
});

api.get("/politics/parliament-session", async (c) => {
  const session = await getParliamentSession();
  return c.json(session ?? null);
});

api.get("/world/articles", async (c) => {
  const panel = c.req.query("panel");
  const limit = Number(c.req.query("limit") ?? 20);
  return c.json(await getWorldArticles(panel ?? undefined, limit));
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

const WatchlistCreateSchema = z.object({
  label: z.string().min(1),
  type: WatchlistItemTypeSchema,
  value: z.string().min(1),
  threshold: z.number().optional(),
  telegramChatId: z.string().optional(),
  active: z.boolean().optional(),
});

api.get("/watchlist", async (c) => {
  return c.json(await getWatchlist());
});

api.post("/watchlist", async (c) => {
  const body = await c.req.json();
  const parsed = WatchlistCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid payload", issues: parsed.error.issues }, 400);
  }
  const item = await createWatchlistItem({
    ...parsed.data,
    active: parsed.data.active ?? true,
  });
  return c.json(item, 201);
});

api.delete("/watchlist/:id", async (c) => {
  const id = c.req.param("id");
  const deleted = await deleteWatchlistItem(id);
  return deleted ? c.json({ ok: true }) : c.json({ error: "Not found" }, 404);
});

api.patch("/watchlist/:id/toggle", async (c) => {
  const id = c.req.param("id");
  const item = await toggleWatchlistItemActive(id);
  return item ? c.json(item) : c.json({ error: "Not found" }, 404);
});

// ─── Ingest: watchlist triggered (worker calls after sending alert) ──────────

api.post("/ingest/watchlist/:id/triggered", async (c) => {
  const id = c.req.param("id");
  await updateWatchlistItemLastTriggered(id, new Date().toISOString());
  return c.json({ ok: true });
});

// ─── Reactions (likes) ───────────────────────────────────────────────────────

const ReactionCreateSchema = z.object({
  itemId: z.string().min(1),
  itemTitle: z.string().max(60),
  reaction: z.literal("like"),
  email: z.string().email().optional().nullable(),
  fingerprint: z.string().min(1),
});

const ReactionDeleteSchema = z.object({
  fingerprint: z.string().min(1),
});

const AssociateEmailSchema = z.object({
  fingerprint: z.string().min(1),
  email: z.string().email(),
});

api.post("/reactions", async (c) => {
  const body = await c.req.json();
  const parsed = ReactionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid payload", issues: parsed.error.issues }, 400);
  }
  const result = await addReaction({
    itemId: parsed.data.itemId,
    itemTitle: parsed.data.itemTitle,
    reaction: "like",
    email: parsed.data.email ?? null,
    fingerprint: parsed.data.fingerprint,
  });
  return c.json(result);
});

api.delete("/reactions/:itemId", async (c) => {
  const itemId = c.req.param("itemId");
  const body = await c.req.json().catch(() => ({}));
  const parsed = ReactionDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid payload", issues: parsed.error.issues }, 400);
  }
  const result = await removeReaction(itemId, parsed.data.fingerprint);
  return c.json(result);
});

// Must be before /reactions/:itemId or "batch" is matched as itemId
api.get("/reactions/batch", async (c) => {
  const idsParam = c.req.query("ids");
  const ids = idsParam ? idsParam.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const fp = c.req.query("fp");
  const result = await getReactionsBatch(ids, fp ?? undefined);
  return c.json(result);
});

api.get("/reactions/:itemId", async (c) => {
  const itemId = c.req.param("itemId");
  const fp = c.req.query("fp");
  const result = await getReactionStatus(itemId, fp ?? undefined);
  return c.json(result);
});

api.patch("/reactions/associate-email", async (c) => {
  const body = await c.req.json();
  const parsed = AssociateEmailSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid payload", issues: parsed.error.issues }, 400);
  }
  const updated = await associateEmailWithFingerprint(parsed.data.fingerprint, parsed.data.email);
  return c.json({ updated });
});

// ─── Intel Briefing ─────────────────────────────────────────────────────────

api.post("/intel/brief", async (c) => {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return c.json({ error: "Intel service not configured" }, 503);
  }
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const parsed = IntelBriefRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid payload", issues: parsed.error.issues }, 400);
  }
  const { type, query } = parsed.data;
  const cb = getCircuitBreaker("anthropic", 3);
  if (cb.isOpen()) {
    return c.json(
      { error: "Briefing service temporarily unavailable", detail: "Too many failures" },
      503
    );
  }
  try {
    const { userMessage, dataPoints } = await buildContextAndPrompt(type, query);
    const brief = await callAnthropic(userMessage);
    cb.recordSuccess();
    const response: BriefResponse = {
      type,
      brief,
      generatedAt: new Date().toISOString(),
      dataPoints,
    };
    return c.json(response);
  } catch (err) {
    cb.recordFailure();
    const message = err instanceof Error ? err.message : String(err);
    const isConfig = message.includes("not configured");
    if (isConfig) return c.json({ error: "Intel service not configured" }, 503);
    return c.json(
      { error: "Briefing generation failed", detail: message },
      502
    );
  }
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
    await addAnomaly(anomaly);
    broadcast({ type: "anomaly", data: anomaly });
  }

  await updateConstituencyResult(newResult);
  broadcast({ type: "snapshot", data: newResult });

  return c.json({ ok: true, anomalies: anomalies.length });
});

api.post("/ingest/summary", async (c) => {
  const body = await c.req.json();
  const parsed = NationalSummarySchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid payload", issues: parsed.error.issues }, 400);
  }

  await updateNationalSummary(parsed.data);
  broadcast({ type: "summary", data: parsed.data });

  return c.json({ ok: true });
});

api.post("/ingest/event", async (c) => {
  const body = await c.req.json();
  const parsed = SignalEventSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid payload", issues: parsed.error.issues }, 400);
  }

  await addSignalEvent(parsed.data);
  broadcast({ type: "event", data: parsed.data });

  return c.json({ ok: true });
});

api.post("/ingest/source-health", async (c) => {
  const body = await c.req.json();
  const parsed = SourceHealthSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid payload", issues: parsed.error.issues }, 400);
  }

  await updateSourceHealth(parsed.data);
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

api.post("/ingest/crisis/incidents", async (c) => {
  const body = await c.req.json();
  const parsed = CrisisIncidentSchema.array().safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid payload", issues: parsed.error.issues }, 400);
  }

  await replaceCrisisIncidents(parsed.data);
  return c.json({ ok: true, count: parsed.data.length });
});

api.post("/ingest/crisis/flood-alerts", async (c) => {
  const body = await c.req.json();
  const parsed = FloodAlertsPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid payload", issues: parsed.error.issues }, 400);
  }

  await setFloodAlerts({
    alerts: parsed.data.alerts,
    seasonInactive: parsed.data.seasonInactive,
    lastUpdated: parsed.data.lastUpdated,
    alertsSource: parsed.data.alertsSource,
  });
  return c.json({ ok: true, count: parsed.data.alerts.length });
});

api.post("/ingest/politics/cabinet-events", async (c) => {
  const body = await c.req.json();
  const parsed = CabinetEventSchema.array().safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid payload", issues: parsed.error.issues }, 400);
  }

  await setCabinetEvents(parsed.data);
  return c.json({ ok: true, count: parsed.data.length });
});

api.post("/ingest/politics/parliament-session", async (c) => {
  const body = await c.req.json();
  const parsed = ParliamentSessionSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid payload", issues: parsed.error.issues }, 400);
  }

  await setParliamentSession(parsed.data);
  return c.json({ ok: true });
});

api.post("/ingest/world/articles", async (c) => {
  const body = await c.req.json();
  const parsed = GeopoliticsArticleSchema.array().safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid payload", issues: parsed.error.issues }, 400);
  }

  await upsertWorldArticles(parsed.data);
  return c.json({ ok: true, count: parsed.data.length });
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

api.post("/admin/sources/:sourceId/reset", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const secret =
    body && typeof body === "object" && "secret" in body
      ? String((body as { secret?: string }).secret ?? "")
      : "";
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const sourceId = c.req.param("sourceId");
  pendingResets.add(sourceId);
  return c.json({ ok: true });
});
