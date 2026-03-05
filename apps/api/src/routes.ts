import { Hono } from "hono";
import {
  ConstituencyResultSchema,
  NationalSummarySchema,
  SignalEventSchema,
  SourceHealthSchema,
} from "@repo/shared";
import {
  getNationalSummary,
  getConstituencyResults,
  getConstituencyResult,
  getSignalEvents,
  getAnomalies,
  getSourceHealth,
  updateNationalSummary,
  updateConstituencyResult,
  addSignalEvent,
  addAnomaly,
  updateSourceHealth,
} from "./store";
import { broadcast } from "./sse";
import { detectAnomalies } from "./anomaly";

export const api = new Hono().basePath("/v1");

// ─── GET Routes ──────────────────────────────────────────────────────────────

api.get("/national-summary", (c) => {
  return c.json(getNationalSummary());
});

api.get("/constituencies", (c) => {
  const status = c.req.query("status");
  const province = c.req.query("province");

  let results = getConstituencyResults();

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
  const result = getConstituencyResult(c.req.param("id"));
  if (!result) {
    return c.json({ error: "Constituency not found" }, 404);
  }
  return c.json(result);
});

api.get("/districts", (c) => {
  const results = getConstituencyResults();
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
  const districtName = decodeURIComponent(c.req.param("id"));
  const results = getConstituencyResults().filter(
    (r) => r.districtName === districtName
  );

  if (results.length === 0) {
    return c.json({ error: "District not found" }, 404);
  }

  const aggregate = {
    districtName,
    provinceId: results[0].provinceId,
    constituencies: results.length,
    totalVotes: results.reduce((sum, r) => sum + r.totalVotes, 0),
    counted: results.filter((r) => r.status === "final").length,
    results,
  };

  return c.json(aggregate);
});

api.get("/feed", (c) => {
  const limit = Number(c.req.query("limit") ?? 20);
  const offset = Number(c.req.query("offset") ?? 0);
  return c.json(getSignalEvents(limit, offset));
});

api.get("/anomalies", (c) => {
  return c.json(getAnomalies());
});

api.get("/sources/health", (c) => {
  return c.json(getSourceHealth());
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
