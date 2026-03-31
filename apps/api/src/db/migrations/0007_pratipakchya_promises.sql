CREATE TABLE IF NOT EXISTS "pratipakchya_promises" (
	"id" integer PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"category_ne" text,
	"category_en" text,
	"title_ne" text,
	"title_en" text,
	"deadline" text,
	"deadline_date" date,
	"status" text NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"last_updated" date,
	"evidence" text,
	"notes" text,
	"payload" jsonb NOT NULL,
	"fetched_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pratipakchya_status" ON "pratipakchya_promises" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pratipakchya_category" ON "pratipakchya_promises" ("category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pratipakchya_deadline_date" ON "pratipakchya_promises" ("deadline_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pratipakchya_updated_at" ON "pratipakchya_promises" ("updated_at");
--> statement-breakpoint
ALTER TABLE "worker_state" ADD COLUMN IF NOT EXISTS "last_pratipakchya_promises_run_at" bigint;

