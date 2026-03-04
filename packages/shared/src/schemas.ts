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
});

// ─── Signals & Anomalies ────────────────────────────────────────────────────

export const SignalEventTypeSchema = z.enum([
  "official",
  "ingest",
  "anomaly",
  "note",
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
export type SSEMessage = z.infer<typeof SSEMessageSchema>;
