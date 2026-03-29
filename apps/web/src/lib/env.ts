/**
 * Frontend environment configuration.
 * Only NEXT_PUBLIC_* vars are available at build/runtime in the browser.
 * Mirrors .env.example at repo root.
 */

export const env = {
  NEXT_PUBLIC_API_URL:
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "",
  NEXT_PUBLIC_ENABLE_WAR_ROOM:
    process.env.NEXT_PUBLIC_ENABLE_WAR_ROOM === "true",
  NEXT_PUBLIC_CRON_ECN_MINUTES: Number.parseInt(
    process.env.NEXT_PUBLIC_CRON_ECN_MINUTES ?? "30",
    10
  ),
  /** Seconds without heartbeat before status becomes stale; then error after 5× this. Default 90. */
  NEXT_PUBLIC_SSE_STALE_SECONDS: Number.parseInt(
    process.env.NEXT_PUBLIC_SSE_STALE_SECONDS ?? "90",
    10
  ) || 90,
  /** Dev-only: show sample World desk rows without worker/GDELT ingest. */
  NEXT_PUBLIC_WORLD_ARTICLE_FIXTURE:
    process.env.NEXT_PUBLIC_WORLD_ARTICLE_FIXTURE === "true",
} as const;
