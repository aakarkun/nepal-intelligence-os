CREATE TABLE IF NOT EXISTS "national_summaries" (
	"dataset_id" text PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"updated_at" text NOT NULL
);
