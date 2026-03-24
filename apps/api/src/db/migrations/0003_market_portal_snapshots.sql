CREATE TABLE "market_portal_snapshots" (
  "id" text PRIMARY KEY NOT NULL,
  "scraped_at" text NOT NULL,
  "data" jsonb NOT NULL,
  "ingested_at" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_market_portal_scraped_at" ON "market_portal_snapshots" USING btree ("scraped_at");
