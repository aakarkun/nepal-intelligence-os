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
  /** FPTP (constituency) seats when HoR breakdown is available. */
  fptpSeats: z.number().int().min(0).optional(),
  /** Proportional representation seats when HoR breakdown is available. */
  prSeats: z.number().int().min(0).optional(),
  /** HoR proportional (PR) ballot votes when published (distinct from FPTP totals). */
  prVotes: z.number().int().min(0).optional(),
});

/** Aggregate PR ballot metadata (stored in national_summary JSON with party-level prVotes). */
export const HorProportionalMetaSchema = z.object({
  totalVotesCast: z.number().int().min(0),
  prSeatCap: z.number().int().min(0),
  partiesInTally: z.number().int().min(0).optional(),
  /** National threshold for PR seat allocation (percent of valid PR votes). */
  thresholdPercent: z.number().min(0).max(100).optional(),
  /** Combined PR votes for parties not listed individually in partyResults. */
  otherPartiesVotes: z.number().int().min(0).optional(),
  lastUpdated: z.string().optional(),
  countingStatus: z.enum(["in_progress", "completed"]).optional(),
});

export type HorProportionalMeta = z.infer<typeof HorProportionalMetaSchema>;

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
  /** Present when party results include stored FPTP + PR (e.g. final HoR 2082). */
  horBreakdown: z.enum(["2082"]).optional(),
  /** HoR proportional ballot totals and caps when PR vote data is available. */
  horProportional: HorProportionalMetaSchema.optional(),
});

export const CabinetEventTypeSchema = z.enum([
  "meeting",
  "appointment",
  "reshuffle",
  "other",
]);
export const CabinetEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  publishedAt: z.string().datetime(),
  source: z.literal("RSS Nepal"),
  type: CabinetEventTypeSchema,
  keywords: z.array(z.string()),
  url: z.string().url().optional(),
});
export type CabinetEvent = z.infer<typeof CabinetEventSchema>;

export const ParliamentSessionStatusSchema = z.enum([
  "active",
  "recess",
  "prorogued",
]);
export const ParliamentSessionSchema = z.object({
  sessionName: z.string(),
  sessionStart: z.string(),
  nextSittingDate: z.string().nullable(),
  pendingBills: z.number().int().min(0).nullable(),
  status: ParliamentSessionStatusSchema,
  scrapedAt: z.string().datetime(),
});
export type ParliamentSession = z.infer<typeof ParliamentSessionSchema>;

export const GeopoliticsPanelSchema = z.enum([
  "south_asia",
  "diplomatic",
  "remittance",
  "un",
]);
export const GeopoliticsArticleSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  source: z.string(),
  panel: GeopoliticsPanelSchema,
  tone: z.number().nullable(),
  publishedAt: z.string().datetime(),
  language: z.string(),
  imageUrl: z.string().url().nullable(),
  fetchedAt: z.string().datetime(),
});
export type GeopoliticsArticle = z.infer<typeof GeopoliticsArticleSchema>;

// ─── Signals & Anomalies ────────────────────────────────────────────────────

export const SignalEventTypeSchema = z.enum([
  "official",
  "ingest",
  "anomaly",
  "note",
  "news",
  "political",
  "security",
  "economic",
  "disaster",
  "diplomatic",
  "health",
]);

export const SignalSeveritySchema = z.enum([
  "info",
  "warning",
  "critical",
]);

export const SignalEventEntitiesSchema = z.object({
  people: z.array(z.string()).optional(),
  parties: z.array(z.string()).optional(),
  districts: z.array(z.string()).optional(),
});

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
  entities: SignalEventEntitiesSchema.optional(),
});

export const AnomalyTypeSchema = z.enum([
  "vote_drop",
  "sudden_jump",
  "stale_feed",
  "count_mismatch",
  "duplicate_candidate",
  "missing_constituency",
  "source_stale",
  "source_error",
]);

export const AnomalyContextSchema = z.enum(["election", "operational"]);

export const AnomalySchema = z.object({
  id: z.string(),
  type: AnomalyTypeSchema,
  severity: SignalSeveritySchema,
  constituencyId: z.string().optional(),
  details: z.string(),
  timestamp: z.string().datetime(),
  resolved: z.boolean().default(false),
  context: AnomalyContextSchema.optional(),
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
  suspended: z.boolean().optional(),
  suspendedAt: z.string().datetime().optional(),
  failureCount: z.number().int().min(0).optional(),
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
  source: z.enum(["DHM", "GDACS"]),
});

export const FloodAlertsPayloadSchema = z.object({
  alerts: z.array(FloodAlertSchema),
  seasonInactive: z.boolean().optional(),
  lastUpdated: z.string().datetime(),
  /** When "gdacs", UI should show disclaimer: station-level DHM data pending access. */
  alertsSource: z.enum(["dhm", "gdacs"]).optional(),
});

// ─── Reactions (likes on feed items) ────────────────────────────────────────

export const ReactionSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  itemTitle: z.string().max(60),
  reaction: z.literal("like"),
  email: z.string().email().nullable(),
  fingerprint: z.string(),
  createdAt: z.string().datetime(),
});
export type Reaction = z.infer<typeof ReactionSchema>;

// ─── Watchlist (alerts / Telegram) ───────────────────────────────────────────

export const WatchlistItemTypeSchema = z.enum([
  "keyword",
  "constituency",
  "district",
  "price_threshold",
  "crisis_severity",
]);

export const WatchlistItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: WatchlistItemTypeSchema,
  value: z.string(),
  threshold: z.number().optional(),
  telegramChatId: z.string().optional(),
  createdAt: z.string().datetime(),
  lastTriggeredAt: z.string().datetime().optional(),
  active: z.boolean(),
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
  /** Trading session date from the source (YYYY-MM-DD), when available. */
  dataAsOf: z.string().optional(),
  /** End of session / as-of instant (ISO-8601 with offset), for freshness comparison. */
  sessionEnd: z.string().optional(),
  index: z.number().min(0),
  change: z.number().nullable(),
  changePercent: z.number().nullable(),
  totalTurnover: z.number().min(0).optional(),
  tradedShares: z.number().min(0).optional(),
  advancingIssues: z.number().int().min(0).optional(),
  decliningIssues: z.number().int().min(0).optional(),
  unchangedIssues: z.number().int().min(0).optional(),
  marketStatus: NepseMarketStatusSchema.optional(),
  topGainers: z.array(NepseMoverSchema).max(5).optional(),
  topLosers: z.array(NepseMoverSchema).max(5).optional(),
});

/** Aggregated market portal board (worker-scraped from public portal HTML). */
export const MarketPortalSubIndexRowSchema = z.object({
  name: z.string(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  turnover: z.number(),
  pointChange: z.number(),
  changePercent: z.number(),
  week52High: z.number(),
  week52Low: z.number(),
});

export const MarketPortalMainIndexRowSchema = z.object({
  name: z.string(),
  close: z.number(),
  pointChange: z.number().nullable(),
});

export const MarketPortalForexRowSchema = z.object({
  currencyCode: z.string(),
  buy: z.number(),
  sell: z.number(),
});

export const MarketPortalMetalRowSchema = z.object({
  name: z.string(),
  price: z.number(),
  changeRs: z.number(),
});

export const MarketPortalOilRowSchema = z.object({
  name: z.string(),
  priceText: z.string(),
});

export const MarketPortalSnapshotSchema = z.object({
  sourceId: z.string(),
  sourceName: z.string(),
  timestamp: z.string(),
  subIndicesAsOf: z.string().optional(),
  subIndices: z.array(MarketPortalSubIndexRowSchema),
  mainIndicesAsOf: z.string().optional(),
  mainIndices: z.array(MarketPortalMainIndexRowSchema),
  mainIndicesTurnoverNpr: z.number().optional(),
  nepseConfidence: z.number().nullable().optional(),
  nepseConfidenceChange: z.number().nullable().optional(),
  forexAsOf: z.string().optional(),
  forex: z.array(MarketPortalForexRowSchema),
  metalsAsOf: z.string().optional(),
  metals: z.array(MarketPortalMetalRowSchema),
  oilAsOf: z.string().optional(),
  oil: z.array(MarketPortalOilRowSchema),
});
export type MarketPortalSnapshot = z.infer<typeof MarketPortalSnapshotSchema>;

// ─── SSE Messages ────────────────────────────────────────────────────────────

// ─── Political Pulse (governance intelligence) ───────────────────────────────

export const PoliticalEventTypeSchema = z.enum([
  "bill_registered",
  "bill_passed",
  "bill_rejected",
  "cabinet_decision",
  "parliament_sitting",
  "policy_announcement",
  "appointment",
  "news",
  "law_enacted",
]);

export const LegislativeBillStatusSchema = z.enum([
  "registered",
  "committee",
  "passed_hor",
  "passed_na",
  "enacted",
  "rejected",
]);

export const PoliticalPulseEventSchema = z.object({
  id: z.string(),
  eventType: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  fullContent: z.string().nullable(),
  sourceName: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  partyIds: z.array(z.string()),
  mpIds: z.array(z.string()),
  ministry: z.string().nullable(),
  billNumber: z.string().nullable(),
  billStatus: z.string().nullable(),
  tags: z.array(z.string()),
  publishedAt: z.string(),
  fetchedAt: z.string(),
  isVerified: z.boolean(),
  importanceScore: z.number().int(),
});

export const LegislativeBillRowSchema = z.object({
  id: z.string(),
  billNumber: z.string(),
  title: z.string(),
  status: z.string(),
  introducedBy: z.string().nullable(),
  introducedAt: z.string().nullable(),
  updatedAt: z.string(),
  sourceUrl: z.string().nullable(),
  partyId: z.string().nullable(),
  rawExcerpt: z.string().nullable(),
});

export const PartyIntelRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string(),
  ideology: z.string().nullable(),
  formedYear: z.number().nullable(),
  chairperson: z.string().nullable(),
  parliamentaryLeader: z.string().nullable(),
  officialWebsite: z.string().nullable(),
  socialMedia: z.record(z.string()).nullable().optional(),
  manifestoUrl: z.string().nullable(),
  colorHex: z.string().nullable(),
  isGoverning: z.boolean(),
  seatsUpdatedAt: z.string().nullable(),
  fptpSeats: z.number().int(),
  prSeats: z.number().int(),
  totalSeats: z.number().int(),
});

export const MpIntelRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  partyId: z.string(),
  ministryRole: z.string().nullable(),
  committeeAssignments: z.array(z.string()),
  billsSponsored: z.number().int(),
  contactEmail: z.string().nullable(),
  socialMedia: z.record(z.string()).nullable().optional(),
  photoUrl: z.string().nullable(),
  constituency: z.string().nullable(),
  electionType: z.string().nullable(),
});

export const PoliticalWeeklyDigestSchema = z.object({
  content: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  generatedAt: z.string(),
});

export const PoliticalPulseStatsSchema = z.object({
  totalBillsTracked: z.number().int(),
  lawsEnacted: z.number().int(),
  cabinetDecisions: z.number().int(),
  newsItems: z.number().int(),
  billsPassedThisMonth: z.number().int(),
  lastEventAt: z.string().nullable(),
});

export const PartyActivitySchema = z.object({
  party: PartyIntelRowSchema,
  billsSponsoredSession: z.number().int(),
  lastMajorAction: z.string().nullable(),
  lastMajorActionAt: z.string().nullable(),
  activeMpsThisWeek: z.array(
    z.object({ mpId: z.string(), name: z.string(), mentionCount: z.number().int() })
  ),
});

export const CabinetMinisterWatchSchema = z.object({
  mp: MpIntelRowSchema,
  ministryLabel: z.string(),
  latestDecisions: z.array(
    z.object({ title: z.string(), publishedAt: z.string(), sourceUrl: z.string().nullable() })
  ),
  billsUnderMinistry: z.number().int(),
  daysSinceLastAnnouncement: z.number().int().nullable(),
});

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
export type SignalEventEntities = z.infer<typeof SignalEventEntitiesSchema>;
export type SignalEvent = z.infer<typeof SignalEventSchema>;
export type AnomalyType = z.infer<typeof AnomalyTypeSchema>;
export type AnomalyContext = z.infer<typeof AnomalyContextSchema>;
export type Anomaly = z.infer<typeof AnomalySchema>;
export type SourceStatus = z.infer<typeof SourceStatusSchema>;
export type SourceHealth = z.infer<typeof SourceHealthSchema>;
export type EarthquakeIncident = z.infer<typeof EarthquakeIncidentSchema>;
export type CrisisSummary = z.infer<typeof CrisisSummarySchema>;
export type CrisisIncident = z.infer<typeof CrisisIncidentSchema>;
export type FloodAlert = z.infer<typeof FloodAlertSchema>;
export type FloodAlertsPayload = z.infer<typeof FloodAlertsPayloadSchema>;
export type WatchlistItemType = z.infer<typeof WatchlistItemTypeSchema>;
export type WatchlistItem = z.infer<typeof WatchlistItemSchema>;
export type ForexRate = z.infer<typeof ForexRateSchema>;
export type EconomySummary = z.infer<typeof EconomySummarySchema>;
export type MarketAssetQuote = z.infer<typeof MarketAssetQuoteSchema>;
export type NepseMarketStatus = z.infer<typeof NepseMarketStatusSchema>;
export type NepseSummary = z.infer<typeof NepseSummarySchema>;
export type SSEMessage = z.infer<typeof SSEMessageSchema>;
export type PoliticalPulseEvent = z.infer<typeof PoliticalPulseEventSchema>;
export type LegislativeBillRow = z.infer<typeof LegislativeBillRowSchema>;
export type PartyIntelRow = z.infer<typeof PartyIntelRowSchema>;
export type MpIntelRow = z.infer<typeof MpIntelRowSchema>;
export type PoliticalWeeklyDigest = z.infer<typeof PoliticalWeeklyDigestSchema>;
export type PoliticalPulseStats = z.infer<typeof PoliticalPulseStatsSchema>;
export type PartyActivity = z.infer<typeof PartyActivitySchema>;
export type CabinetMinisterWatch = z.infer<typeof CabinetMinisterWatchSchema>;
