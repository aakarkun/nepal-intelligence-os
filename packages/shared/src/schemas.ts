import { z } from "zod";

// ─── Geography ───────────────────────────────────────────────────────────────

export const ProvinceSchema = z.object({
  id: z.number().int().min(1).max(7),
  name: z.string(),
});

export const DistrictSchema = z.object({
  id: z.number().int(),
  code: z.string(),
  name: z.string(),
  provinceId: z.number().int().min(1).max(7),
  centroid: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
});

export const ConstituencySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  districtId: z.number().int(),
  districtName: z.string(),
  provinceId: z.number().int().min(1).max(7),
  type: z.enum(["HoR", "PA"]),
});

// ─── Political Entities ──────────────────────────────────────────────────────

export const PartySchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string(),
  color: z.string(),
  logoUrl: z.string().optional(),
});

export const CandidateSchema = z.object({
  id: z.string(),
  name: z.string(),
  partyId: z.string(),
  constituencyId: z.string(),
  photoUrl: z.string().optional(),
});

// ─── Election Data ───────────────────────────────────────────────────────────

export const VoteSnapshotSchema = z.object({
  constituencyId: z.string(),
  candidateId: z.string(),
  votes: z.number().int().min(0),
  timestamp: z.string().datetime(),
  source: z.string(),
});

export const ConstituencyResultSchema = z.object({
  constituencyId: z.string(),
  constituencyName: z.string(),
  districtName: z.string(),
  provinceId: z.number().int(),
  status: z.enum(["counting", "final", "stale", "error"]),
  totalVotes: z.number().int().min(0),
  lastUpdate: z.string().datetime(),
  candidates: z.array(
    z.object({
      candidateId: z.string(),
      candidateName: z.string(),
      partyId: z.string(),
      partyName: z.string(),
      partyColor: z.string(),
      votes: z.number().int().min(0),
    })
  ),
  sourceId: z.string().optional(),
  sourceName: z.string().optional(),
  sourceFetchedAt: z.string().datetime().optional(),
});

export const PartyResultSchema = z.object({
  partyId: z.string(),
  partyName: z.string(),
  partyShortName: z.string(),
  partyColor: z.string(),
  seatsWon: z.number().int().min(0),
  seatsLeading: z.number().int().min(0),
  totalVotes: z.number().int().min(0),
});

export const NationalSummarySchema = z.object({
  totalSeats: z.number().int(),
  totalConstituencies: z.number().int(),
  countedConstituencies: z.number().int(),
  totalVotesCast: z.number().int().min(0),
  timestamp: z.string().datetime(),
  partyResults: z.array(PartyResultSchema),
  sourceId: z.string().optional(),
  sourceName: z.string().optional(),
  sourceFetchedAt: z.string().datetime().optional(),
});

// ─── Signals & Anomalies ────────────────────────────────────────────────────

export const SignalEventTypeSchema = z.enum([
  "official",
  "ingest",
  "anomaly",
  "note",
  "news",
]);

export const SignalSeveritySchema = z.enum([
  "info",
  "warning",
  "critical",
]);

export const SignalEventSchema = z.object({
  id: z.string(),
  type: SignalEventTypeSchema,
  severity: SignalSeveritySchema,
  title: z.string(),
  body: z.string(),
  timestamp: z.string().datetime(),
  constituencyId: z.string().optional(),
  districtId: z.number().int().optional(),
  source: z.string().optional(),
  url: z.string().url().optional(),
});

export const AnomalyTypeSchema = z.enum([
  "vote_drop",
  "sudden_jump",
  "stale_feed",
  "count_mismatch",
  "duplicate_candidate",
  "missing_constituency",
]);

export const AnomalySchema = z.object({
  id: z.string(),
  type: AnomalyTypeSchema,
  severity: SignalSeveritySchema,
  constituencyId: z.string().optional(),
  details: z.string(),
  timestamp: z.string().datetime(),
  resolved: z.boolean().default(false),
});

// ─── Source Health ────────────────────────────────────────────────────────────

export const SourceStatusSchema = z.enum(["live", "stale", "error"]);

export const SourceHealthSchema = z.object({
  sourceId: z.string(),
  sourceName: z.string(),
  lastUpdate: z.string().datetime(),
  errorRate: z.number().min(0).max(1),
  status: SourceStatusSchema,
  updateCount: z.number().int().min(0),
});

// ─── Crisis Intelligence ─────────────────────────────────────────────────────

export const EarthquakeIncidentSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  sourceName: z.string(),
  timestamp: z.string().datetime(),
  title: z.string(),
  place: z.string(),
  magnitude: z.number(),
  depthKm: z.number().min(0),
  latitude: z.number(),
  longitude: z.number(),
  feltReports: z.number().int().min(0).optional(),
  tsunami: z.boolean().default(false),
  alert: z.enum(["green", "yellow", "orange", "red"]).nullable().optional(),
  significance: z.number().int().min(0),
  url: z.string().url(),
});

export const CrisisSummarySchema = z.object({
  sourceId: z.string(),
  sourceName: z.string(),
  timestamp: z.string().datetime(),
  totalIncidents: z.number().int().min(0),
  last24h: z.number().int().min(0),
  maxMagnitude: z.number().min(0),
  averageDepthKm: z.number().min(0),
  incidentsBySeverity: z.object({
    minor: z.number().int().min(0),
    light: z.number().int().min(0),
    moderate: z.number().int().min(0),
    strongPlus: z.number().int().min(0),
  }),
});

export const CrisisIncidentSchema = z.object({
  id: z.string(),
  type: z.enum(["flood", "protest", "fire"]),
  title: z.string(),
  place: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  timestamp: z.string().datetime(),
  sourceId: z.string(),
  url: z.string().url().optional(),
});

export const FloodAlertStatusSchema = z.enum([
  "normal",
  "warning",
  "danger",
  "extreme_danger",
]);
export const FloodAlertTrendSchema = z.enum(["rising", "falling", "stable"]);

export const FloodAlertSchema = z.object({
  id: z.string(),
  stationName: z.string(),
  river: z.string(),
  district: z.string(),
  province: z.number().int().min(1).max(7),
  waterLevel: z.number(),
  normalLevel: z.number(),
  warningLevel: z.number(),
  dangerLevel: z.number(),
  status: FloodAlertStatusSchema,
  trend: FloodAlertTrendSchema.optional(),
  observedAt: z.string().datetime(),
  source: z.literal("DHM"),
});

export const FloodAlertsPayloadSchema = z.object({
  alerts: z.array(FloodAlertSchema),
  seasonInactive: z.boolean().optional(),
  lastUpdated: z.string().datetime(),
});

// ─── Economy Intelligence ───────────────────────────────────────────────────

export const ForexRateSchema = z.object({
  currencyCode: z.string(),
  currencyName: z.string(),
  unit: z.number().positive(),
  buy: z.number(),
  sell: z.number(),
  previousBuy: z.number().nullable(),
  previousSell: z.number().nullable(),
  changeBuy: z.number().nullable(),
  changeSell: z.number().nullable(),
  trend: z.enum(["up", "down", "flat", "new"]),
  date: z.string(),
  publishedOn: z.string().datetime().optional(),
});

export const EconomySummarySchema = z.object({
  sourceId: z.string(),
  sourceName: z.string(),
  timestamp: z.string().datetime(),
  baseCurrency: z.string(),
  trackedRates: z.number().int().min(0),
  advancingRates: z.number().int().min(0),
  decliningRates: z.number().int().min(0),
  unchangedRates: z.number().int().min(0),
  usdBuy: z.number().nullable(),
  eurBuy: z.number().nullable(),
  gbpBuy: z.number().nullable(),
  inrBuy: z.number().nullable(),
  topMovers: z.array(
    z.object({
      currencyCode: z.string(),
      currencyName: z.string(),
      unit: z.number().positive(),
      buy: z.number(),
      sell: z.number(),
      changeBuy: z.number(),
      trend: z.enum(["up", "down", "flat"]),
    })
  ),
});

export const MarketAssetQuoteSchema = z.object({
  assetCode: z.string(),
  assetName: z.string(),
  class: z.enum(["metal", "crypto"]),
  currency: z.string(),
  price: z.number(),
  previousPrice: z.number().nullable(),
  change: z.number().nullable(),
  changePercent: z.number().nullable(),
  trend: z.enum(["up", "down", "flat", "new"]),
  timestamp: z.string().datetime(),
});

export const NepseMarketStatusSchema = z.enum(["open", "closed"]);

export const NepseMoverSchema = z.object({
  symbol: z.string(),
  price: z.number(),
  changePercent: z.number(),
});
export type NepseMover = z.infer<typeof NepseMoverSchema>;

export const NepseSummarySchema = z.object({
  sourceId: z.string(),
  sourceName: z.string(),
  timestamp: z.string().datetime(),
  index: z.number().min(0),
  change: z.number().nullable(),
  changePercent: z.number().nullable(),
  totalTurnover: z.number().min(0).optional(),
  marketStatus: NepseMarketStatusSchema.optional(),
  topGainers: z.array(NepseMoverSchema).max(5).optional(),
  topLosers: z.array(NepseMoverSchema).max(5).optional(),
});

// ─── SSE Messages ────────────────────────────────────────────────────────────

export const SSEMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("snapshot"),
    data: ConstituencyResultSchema,
  }),
  z.object({
    type: z.literal("summary"),
    data: NationalSummarySchema,
  }),
  z.object({
    type: z.literal("anomaly"),
    data: AnomalySchema,
  }),
  z.object({
    type: z.literal("event"),
    data: SignalEventSchema,
  }),
  z.object({
    type: z.literal("heartbeat"),
    data: z.object({
      timestamp: z.string().datetime(),
      serverTime: z.string(),
    }),
  }),
]);

// ─── Type Exports ────────────────────────────────────────────────────────────

export type Province = z.infer<typeof ProvinceSchema>;
export type District = z.infer<typeof DistrictSchema>;
export type Constituency = z.infer<typeof ConstituencySchema>;
export type Party = z.infer<typeof PartySchema>;
export type Candidate = z.infer<typeof CandidateSchema>;
export type VoteSnapshot = z.infer<typeof VoteSnapshotSchema>;
export type ConstituencyResult = z.infer<typeof ConstituencyResultSchema>;
export type PartyResult = z.infer<typeof PartyResultSchema>;
export type NationalSummary = z.infer<typeof NationalSummarySchema>;
export type SignalEventType = z.infer<typeof SignalEventTypeSchema>;
export type SignalSeverity = z.infer<typeof SignalSeveritySchema>;
export type SignalEvent = z.infer<typeof SignalEventSchema>;
export type AnomalyType = z.infer<typeof AnomalyTypeSchema>;
export type Anomaly = z.infer<typeof AnomalySchema>;
export type SourceStatus = z.infer<typeof SourceStatusSchema>;
export type SourceHealth = z.infer<typeof SourceHealthSchema>;
export type EarthquakeIncident = z.infer<typeof EarthquakeIncidentSchema>;
export type CrisisSummary = z.infer<typeof CrisisSummarySchema>;
export type CrisisIncident = z.infer<typeof CrisisIncidentSchema>;
export type FloodAlert = z.infer<typeof FloodAlertSchema>;
export type FloodAlertsPayload = z.infer<typeof FloodAlertsPayloadSchema>;
export type ForexRate = z.infer<typeof ForexRateSchema>;
export type EconomySummary = z.infer<typeof EconomySummarySchema>;
export type MarketAssetQuote = z.infer<typeof MarketAssetQuoteSchema>;
export type NepseMarketStatus = z.infer<typeof NepseMarketStatusSchema>;
export type NepseSummary = z.infer<typeof NepseSummarySchema>;
export type SSEMessage = z.infer<typeof SSEMessageSchema>;
