CREATE TABLE "anomalies" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"source" text,
	"severity" text DEFAULT 'warning' NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"detected_at" text NOT NULL,
	"resolved_at" text
);
--> statement-breakpoint
CREATE TABLE "cabinet_events" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"source" text,
	"type" text DEFAULT 'other' NOT NULL,
	"keywords" jsonb,
	"published_at" text NOT NULL,
	"ingested_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "constituency_results" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"district" text,
	"province" integer,
	"leading_candidate" text,
	"party" text,
	"margin" integer,
	"total_votes" integer,
	"percent_reported" double precision,
	"status" text,
	"dataset" text DEFAULT 'current' NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crisis_incidents" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"district" text,
	"province" integer,
	"lat" double precision,
	"lng" double precision,
	"source" text,
	"url" text,
	"reported_at" text NOT NULL,
	"ingested_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flood_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"station_name" text NOT NULL,
	"river" text,
	"district" text,
	"province" integer,
	"water_level" double precision,
	"normal_level" double precision,
	"warning_level" double precision,
	"danger_level" double precision,
	"status" text DEFAULT 'normal' NOT NULL,
	"trend" text,
	"source" text DEFAULT 'DHM' NOT NULL,
	"season_inactive" boolean DEFAULT false NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"observed_at" text NOT NULL,
	"ingested_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nepse_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"index_value" double precision,
	"change" double precision,
	"change_percent" double precision,
	"turnover" double precision,
	"market_status" text,
	"top_gainers" jsonb,
	"top_losers" jsonb,
	"scraped_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_articles" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"source" text,
	"url" text,
	"severity" text DEFAULT 'info' NOT NULL,
	"type" text DEFAULT 'news' NOT NULL,
	"entities" jsonb,
	"published_at" text NOT NULL,
	"ingested_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parliament_sessions" (
	"id" text PRIMARY KEY DEFAULT 'current' NOT NULL,
	"session_name" text,
	"session_start" date,
	"next_sitting_date" date,
	"pending_bills" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"scraped_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"item_title" text NOT NULL,
	"reaction" text DEFAULT 'like' NOT NULL,
	"email" text,
	"fingerprint" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seismic_events" (
	"id" text PRIMARY KEY NOT NULL,
	"magnitude" double precision NOT NULL,
	"place" text,
	"depth" double precision,
	"lat" double precision,
	"lng" double precision,
	"usgs_url" text,
	"sig" integer,
	"occurred_at" text NOT NULL,
	"ingested_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signal_events" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"source" text,
	"url" text,
	"type" text DEFAULT 'news' NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"entities" jsonb,
	"district" text,
	"province" integer,
	"lat" double precision,
	"lng" double precision,
	"published_at" text NOT NULL,
	"ingested_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snapshots" (
	"slug" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" text NOT NULL,
	"expires_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_signal_events" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"source" text,
	"url" text,
	"type" text DEFAULT 'news' NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"entities" jsonb,
	"published_at" text NOT NULL,
	"ingested_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_health" (
	"source_id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"last_success_at" text,
	"last_error_at" text,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"total_updates" integer DEFAULT 0 NOT NULL,
	"error_rate" double precision DEFAULT 0 NOT NULL,
	"circuit_open" boolean DEFAULT false NOT NULL,
	"interval_label" text,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watchlist_items" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"type" text NOT NULL,
	"value" text NOT NULL,
	"threshold" double precision,
	"telegram_chat_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" text NOT NULL,
	"last_triggered_at" text,
	"last_triggered_signal_id" text
);
--> statement-breakpoint
CREATE TABLE "worker_state" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"last_nepse_run_at" bigint,
	"last_coingecko_run_at" bigint,
	"last_metals_run_at" bigint,
	"last_nrb_run_at" bigint,
	"last_news_run_at" bigint,
	"last_rss_nepal_run_at" bigint,
	"last_parliament_run_at" bigint,
	"last_dhm_run_at" bigint,
	"last_gdacs_run_at" bigint,
	"last_gdelt_run_at" bigint,
	"last_un_rss_run_at" bigint,
	"last_usgs_run_at" bigint,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_articles" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"source" text,
	"panel" text,
	"tone" double precision,
	"language" text,
	"image_url" text,
	"published_at" text NOT NULL,
	"fetched_at" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_anomalies_resolved" ON "anomalies" USING btree ("resolved");--> statement-breakpoint
CREATE INDEX "idx_anomalies_detected_at" ON "anomalies" USING btree ("detected_at");--> statement-breakpoint
CREATE INDEX "idx_cabinet_published_at" ON "cabinet_events" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "idx_constituency_district" ON "constituency_results" USING btree ("district");--> statement-breakpoint
CREATE INDEX "idx_constituency_party" ON "constituency_results" USING btree ("party");--> statement-breakpoint
CREATE INDEX "idx_constituency_dataset" ON "constituency_results" USING btree ("dataset");--> statement-breakpoint
CREATE INDEX "idx_crisis_type" ON "crisis_incidents" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_crisis_severity" ON "crisis_incidents" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_crisis_reported_at" ON "crisis_incidents" USING btree ("reported_at");--> statement-breakpoint
CREATE INDEX "idx_flood_status" ON "flood_alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_flood_observed_at" ON "flood_alerts" USING btree ("observed_at");--> statement-breakpoint
CREATE INDEX "idx_nepse_scraped_at" ON "nepse_snapshots" USING btree ("scraped_at");--> statement-breakpoint
CREATE INDEX "idx_news_published_at" ON "news_articles" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "idx_news_severity" ON "news_articles" USING btree ("severity");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_reactions_fp_item" ON "reactions" USING btree ("fingerprint","item_id");--> statement-breakpoint
CREATE INDEX "idx_reactions_item_id" ON "reactions" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_reactions_fingerprint" ON "reactions" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "idx_seismic_occurred_at" ON "seismic_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "idx_seismic_magnitude" ON "seismic_events" USING btree ("magnitude");--> statement-breakpoint
CREATE INDEX "idx_signal_events_type" ON "signal_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_signal_events_severity" ON "signal_events" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_signal_events_published_at" ON "signal_events" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "idx_snapshots_expires_at" ON "snapshots" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_social_published_at" ON "social_signal_events" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "idx_world_panel" ON "world_articles" USING btree ("panel");--> statement-breakpoint
CREATE INDEX "idx_world_published_at" ON "world_articles" USING btree ("published_at");--> statement-breakpoint
INSERT INTO "worker_state" ("id") VALUES ('singleton') ON CONFLICT ("id") DO NOTHING;