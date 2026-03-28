CREATE TABLE IF NOT EXISTS "parties" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"ideology" text,
	"formed_year" integer,
	"chairperson" text,
	"parliamentary_leader" text,
	"official_website" text,
	"social_media" jsonb,
	"manifesto_url" text,
	"color_hex" text,
	"is_governing" boolean DEFAULT false NOT NULL,
	"seats_updated_at" text,
	"fptp_seats" integer DEFAULT 0 NOT NULL,
	"pr_seats" integer DEFAULT 0 NOT NULL,
	"total_seats" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mps" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"party_id" text NOT NULL REFERENCES parties("id") ON DELETE CASCADE,
	"ministry_role" text,
	"committee_assignments" jsonb,
	"bills_sponsored" integer DEFAULT 0 NOT NULL,
	"contact_email" text,
	"social_media" jsonb,
	"photo_url" text,
	"constituency" text,
	"election_type" text,
	"created_at" text DEFAULT (now() AT TIME ZONE 'utc')::text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mps_party_id" ON "mps" ("party_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "political_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"full_content" text,
	"source_name" text,
	"source_url" text,
	"party_ids" jsonb,
	"mp_ids" jsonb,
	"ministry" text,
	"bill_number" text,
	"bill_status" text,
	"tags" jsonb,
	"published_at" text NOT NULL,
	"fetched_at" text NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"importance_score" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_political_events_source_url" ON "political_events" ("source_url") WHERE "source_url" IS NOT NULL AND "source_url" != '';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_political_events_published_at" ON "political_events" ("published_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_political_events_event_type" ON "political_events" ("event_type");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "news_feed_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"rss_url" text NOT NULL,
	"website_url" text,
	"language" text DEFAULT 'en',
	"category" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_polled_at" text,
	"poll_interval_minutes" integer DEFAULT 30 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_news_feed_sources_rss_url" ON "news_feed_sources" ("rss_url");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "legislative_bills" (
	"id" text PRIMARY KEY NOT NULL,
	"bill_number" text NOT NULL,
	"title" text NOT NULL,
	"status" text NOT NULL,
	"introduced_by" text,
	"introduced_at" text,
	"updated_at" text NOT NULL,
	"source_url" text,
	"party_id" text REFERENCES parties("id") ON DELETE SET NULL,
	"raw_excerpt" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_legislative_bills_bill_number" ON "legislative_bills" ("bill_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_legislative_bills_status" ON "legislative_bills" ("status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "political_weekly_digest" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"period_start" text NOT NULL,
	"period_end" text NOT NULL,
	"generated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "worker_state" ADD COLUMN IF NOT EXISTS "last_political_rss_run_at" bigint;
--> statement-breakpoint
ALTER TABLE "worker_state" ADD COLUMN IF NOT EXISTS "last_parliament_bills_run_at" bigint;
--> statement-breakpoint
ALTER TABLE "worker_state" ADD COLUMN IF NOT EXISTS "last_gazette_run_at" bigint;
--> statement-breakpoint
ALTER TABLE "worker_state" ADD COLUMN IF NOT EXISTS "last_weekly_digest_run_at" bigint;
