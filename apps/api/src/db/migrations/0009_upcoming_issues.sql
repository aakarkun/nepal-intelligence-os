CREATE TABLE IF NOT EXISTS "economy_upcoming_issues" (
	"id" text PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"sn" integer NOT NULL,
	"symbol" text NOT NULL,
	"company" text NOT NULL,
	"units" double precision NOT NULL,
	"sector" text NOT NULL,
	"remark" text NOT NULL,
	"source_url" text,
	"fetched_at" text DEFAULT (now() AT TIME ZONE 'utc')::text NOT NULL,
	"updated_at" text DEFAULT (now() AT TIME ZONE 'utc')::text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_economy_upcoming_issues_cat_symbol_company" ON "economy_upcoming_issues" ("category","symbol","company");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_economy_upcoming_issues_category" ON "economy_upcoming_issues" ("category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_economy_upcoming_issues_updated_at" ON "economy_upcoming_issues" ("updated_at");
--> statement-breakpoint
ALTER TABLE "worker_state" ADD COLUMN IF NOT EXISTS "last_upcoming_issues_run_at" bigint;

