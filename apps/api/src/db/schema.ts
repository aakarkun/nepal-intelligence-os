import {
  pgTable,
  text,
  integer,
  doublePrecision,
  boolean,
  jsonb,
  bigint,
  date,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const signalEvents = pgTable(
  "signal_events",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    body: text("body"),
    source: text("source"),
    url: text("url"),
    type: text("type").notNull().default("news"),
    severity: text("severity").notNull().default("info"),
    entities: jsonb("entities"),
    district: text("district"),
    province: integer("province"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    publishedAt: text("published_at").notNull(), // stored as TIMESTAMPTZ in migration
    ingestedAt: text("ingested_at").notNull(),
  },
  (t) => [
    index("idx_signal_events_type").on(t.type),
    index("idx_signal_events_severity").on(t.severity),
    index("idx_signal_events_published_at").on(t.publishedAt),
  ]
);

export const socialSignalEvents = pgTable(
  "social_signal_events",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    body: text("body"),
    source: text("source"),
    url: text("url"),
    type: text("type").notNull().default("news"),
    severity: text("severity").notNull().default("info"),
    entities: jsonb("entities"),
    publishedAt: text("published_at").notNull(),
    ingestedAt: text("ingested_at").notNull(),
  },
  (t) => [index("idx_social_published_at").on(t.publishedAt)]
);

export const worldArticles = pgTable(
  "world_articles",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    url: text("url"),
    source: text("source"),
    panel: text("panel"),
    tone: doublePrecision("tone"),
    language: text("language"),
    imageUrl: text("image_url"),
    publishedAt: text("published_at").notNull(),
    fetchedAt: text("fetched_at").notNull(),
  },
  (t) => [
    index("idx_world_panel").on(t.panel),
    index("idx_world_published_at").on(t.publishedAt),
  ]
);

export const newsArticles = pgTable(
  "news_articles",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    body: text("body"),
    source: text("source"),
    url: text("url"),
    severity: text("severity").notNull().default("info"),
    type: text("type").notNull().default("news"),
    entities: jsonb("entities"),
    publishedAt: text("published_at").notNull(),
    ingestedAt: text("ingested_at").notNull(),
  },
  (t) => [
    index("idx_news_published_at").on(t.publishedAt),
    index("idx_news_severity").on(t.severity),
  ]
);

export const watchlistItems = pgTable("watchlist_items", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  type: text("type").notNull(),
  value: text("value").notNull(),
  threshold: doublePrecision("threshold"),
  telegramChatId: text("telegram_chat_id"),
  active: boolean("active").notNull().default(true),
  createdAt: text("created_at").notNull(),
  lastTriggeredAt: text("last_triggered_at"),
  lastTriggeredSignalId: text("last_triggered_signal_id"),
});

export const reactions = pgTable(
  "reactions",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id").notNull(),
    itemTitle: text("item_title").notNull(),
    reaction: text("reaction").notNull().default("like"),
    email: text("email"),
    fingerprint: text("fingerprint").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("idx_reactions_fp_item").on(t.fingerprint, t.itemId),
    index("idx_reactions_item_id").on(t.itemId),
    index("idx_reactions_fingerprint").on(t.fingerprint),
  ]
);

export const cabinetEvents = pgTable(
  "cabinet_events",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    summary: text("summary"),
    source: text("source"),
    type: text("type").notNull().default("other"),
    keywords: jsonb("keywords"),
    publishedAt: text("published_at").notNull(),
    ingestedAt: text("ingested_at").notNull(),
  },
  (t) => [index("idx_cabinet_published_at").on(t.publishedAt)]
);

export const parliamentSessions = pgTable("parliament_sessions", {
  id: text("id").primaryKey().default("current"),
  sessionName: text("session_name"),
  sessionStart: date("session_start"),
  nextSittingDate: date("next_sitting_date"),
  pendingBills: integer("pending_bills"),
  status: text("status").notNull().default("active"),
  scrapedAt: text("scraped_at").notNull(),
});

export const nepseSnapshots = pgTable(
  "nepse_snapshots",
  {
    id: text("id").primaryKey(),
    indexValue: doublePrecision("index_value"),
    change: doublePrecision("change"),
    changePercent: doublePrecision("change_percent"),
    turnover: doublePrecision("turnover"),
    marketStatus: text("market_status"),
    topGainers: jsonb("top_gainers"),
    topLosers: jsonb("top_losers"),
    scrapedAt: text("scraped_at").notNull(),
  },
  (t) => [index("idx_nepse_scraped_at").on(t.scrapedAt)]
);

export const floodAlerts = pgTable(
  "flood_alerts",
  {
    id: text("id").primaryKey(),
    stationName: text("station_name").notNull(),
    river: text("river"),
    district: text("district"),
    province: integer("province"),
    waterLevel: doublePrecision("water_level"),
    normalLevel: doublePrecision("normal_level"),
    warningLevel: doublePrecision("warning_level"),
    dangerLevel: doublePrecision("danger_level"),
    status: text("status").notNull().default("normal"),
    trend: text("trend"),
    source: text("source").notNull().default("DHM"),
    seasonInactive: boolean("season_inactive").notNull().default(false),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    observedAt: text("observed_at").notNull(),
    ingestedAt: text("ingested_at").notNull(),
  },
  (t) => [
    index("idx_flood_status").on(t.status),
    index("idx_flood_observed_at").on(t.observedAt),
  ]
);

export const crisisIncidents = pgTable(
  "crisis_incidents",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    type: text("type").notNull(),
    severity: text("severity").notNull().default("info"),
    district: text("district"),
    province: integer("province"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    source: text("source"),
    url: text("url"),
    reportedAt: text("reported_at").notNull(),
    ingestedAt: text("ingested_at").notNull(),
  },
  (t) => [
    index("idx_crisis_type").on(t.type),
    index("idx_crisis_severity").on(t.severity),
    index("idx_crisis_reported_at").on(t.reportedAt),
  ]
);

export const seismicEvents = pgTable(
  "seismic_events",
  {
    id: text("id").primaryKey(),
    magnitude: doublePrecision("magnitude").notNull(),
    place: text("place"),
    depth: doublePrecision("depth"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    usgsUrl: text("usgs_url"),
    sig: integer("sig"),
    occurredAt: text("occurred_at").notNull(),
    ingestedAt: text("ingested_at").notNull(),
  },
  (t) => [
    index("idx_seismic_occurred_at").on(t.occurredAt),
    index("idx_seismic_magnitude").on(t.magnitude),
  ]
);

export const constituencyResults = pgTable(
  "constituency_results",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    district: text("district"),
    province: integer("province"),
    leadingCandidate: text("leading_candidate"),
    party: text("party"),
    margin: integer("margin"),
    totalVotes: integer("total_votes"),
    percentReported: doublePrecision("percent_reported"),
    status: text("status"),
    dataset: text("dataset").notNull().default("current"),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("idx_constituency_district").on(t.district),
    index("idx_constituency_party").on(t.party),
    index("idx_constituency_dataset").on(t.dataset),
  ]
);

export const nationalSummaries = pgTable("national_summaries", {
  datasetId: text("dataset_id").primaryKey(),
  payload: jsonb("payload").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const sourceHealth = pgTable("source_health", {
  sourceId: text("source_id").primaryKey(),
  label: text("label").notNull(),
  lastSuccessAt: text("last_success_at"),
  lastErrorAt: text("last_error_at"),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  totalUpdates: integer("total_updates").notNull().default(0),
  errorRate: doublePrecision("error_rate").notNull().default(0),
  circuitOpen: boolean("circuit_open").notNull().default(false),
  intervalLabel: text("interval_label"),
  updatedAt: text("updated_at").notNull(),
});

export const anomalies = pgTable(
  "anomalies",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    description: text("description").notNull(),
    source: text("source"),
    severity: text("severity").notNull().default("warning"),
    resolved: boolean("resolved").notNull().default(false),
    detectedAt: text("detected_at").notNull(),
    resolvedAt: text("resolved_at"),
  },
  (t) => [
    index("idx_anomalies_resolved").on(t.resolved),
    index("idx_anomalies_detected_at").on(t.detectedAt),
  ]
);

export const workerState = pgTable("worker_state", {
  id: text("id").primaryKey().default("singleton"),
  lastNepseRunAt: bigint("last_nepse_run_at", { mode: "number" }),
  lastCoingeckoRunAt: bigint("last_coingecko_run_at", { mode: "number" }),
  lastMetalsRunAt: bigint("last_metals_run_at", { mode: "number" }),
  lastNrbRunAt: bigint("last_nrb_run_at", { mode: "number" }),
  lastNewsRunAt: bigint("last_news_run_at", { mode: "number" }),
  lastRssNepalRunAt: bigint("last_rss_nepal_run_at", { mode: "number" }),
  lastParliamentRunAt: bigint("last_parliament_run_at", { mode: "number" }),
  lastDhmRunAt: bigint("last_dhm_run_at", { mode: "number" }),
  lastGdacsRunAt: bigint("last_gdacs_run_at", { mode: "number" }),
  lastGdeltRunAt: bigint("last_gdelt_run_at", { mode: "number" }),
  lastUnRssRunAt: bigint("last_un_rss_run_at", { mode: "number" }),
  lastUsgsRunAt: bigint("last_usgs_run_at", { mode: "number" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Append-only ingest history for market portal (never deleted; retention is manual if ever needed). */
export const marketPortalSnapshots = pgTable(
  "market_portal_snapshots",
  {
    id: text("id").primaryKey(),
    scrapedAt: text("scraped_at").notNull(),
    data: jsonb("data").notNull(),
    ingestedAt: text("ingested_at").notNull(),
  },
  (t) => [index("idx_market_portal_scraped_at").on(t.scrapedAt)]
);

export const snapshots = pgTable(
  "snapshots",
  {
    slug: text("slug").primaryKey(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    data: jsonb("data").notNull(),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at").notNull(),
  },
  (t) => [index("idx_snapshots_expires_at").on(t.expiresAt)]
);
