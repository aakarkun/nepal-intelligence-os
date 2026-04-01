CREATE TABLE IF NOT EXISTS "remittance_providers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"website_url" text,
	"logo_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (now() AT TIME ZONE 'utc')::text NOT NULL,
	"updated_at" text DEFAULT (now() AT TIME ZONE 'utc')::text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_remittance_providers_name" ON "remittance_providers" ("name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_remittance_providers_active" ON "remittance_providers" ("is_active");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "remittance_quote_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL REFERENCES remittance_providers("id") ON DELETE CASCADE,
	"corridor_send_currency" text NOT NULL,
	"corridor_receive_currency" text NOT NULL,
	"send_amount" double precision NOT NULL,
	"fee_amount" double precision,
	"fee_currency" text,
	"receive_amount" double precision,
	"rate" double precision,
	"payment_method" text,
	"payout_method" text,
	"speed_tier" text,
	"collected_at" text NOT NULL,
	"raw_payload" jsonb,
	"raw_hash" text,
	"notes" text,
	"created_at" text DEFAULT (now() AT TIME ZONE 'utc')::text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_remittance_quotes_provider" ON "remittance_quote_snapshots" ("provider_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_remittance_quotes_collected_at" ON "remittance_quote_snapshots" ("collected_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_remittance_quotes_corridor" ON "remittance_quote_snapshots" ("corridor_send_currency","corridor_receive_currency");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_remittance_quotes_provider_corridor" ON "remittance_quote_snapshots" ("provider_id","corridor_send_currency","corridor_receive_currency");

