/**
 * Worker environment configuration.
 * Mirrors .env.example at repo root; update both when adding new vars.
 */

import path from "node:path";

function numberFromEnv(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  API_URL: process.env.API_URL ?? "http://localhost:3001",
  REPLAY_SPEED: numberFromEnv(process.env.REPLAY_SPEED, 10),
  MODE: (process.env.MODE ?? "live") as "replay" | "live",
  CRON_ECN_MINUTES: numberFromEnv(process.env.CRON_ECN_MINUTES, 30),
  ENABLE_GDELT: process.env.ENABLE_GDELT === "true",
  ENABLE_REDDIT: process.env.ENABLE_REDDIT === "true",
  ENABLE_SCRAPLING_ECN: process.env.ENABLE_SCRAPLING_ECN !== "false",
  /** When false (default), election scrape is disabled — data is finalized. Set to "true" to re-enable scraping. */
  SCRAPE_ELECTION: process.env.SCRAPE_ELECTION === "true",
  ECN_BASE_URL:
    process.env.ECN_BASE_URL ?? "https://election.ekantipur.com/?lng=eng",
  SCRAPLING_ECN_SCRIPT_PATH:
    process.env.SCRAPLING_ECN_SCRIPT_PATH ??
    path.resolve(import.meta.dir, "../../scrapling/run_ecn.py"),
  LIVE_STATE_PATH:
    path.resolve(
      import.meta.dir,
      "..",
      process.env.LIVE_STATE_PATH ?? ".live-worker-state.json"
    ),
  SCRAPLING_REQUEST_DELAY_MS:
    numberFromEnv(process.env.SCRAPLING_REQUEST_DELAY_MS, 1000),
  MARKET_ASSET_MINUTES: numberFromEnv(process.env.MARKET_ASSET_MINUTES, 360),
  NEWS_FEEDS: process.env.NEWS_FEEDS ?? undefined,
  NEWS_FEED_URL: process.env.NEWS_FEED_URL ?? "https://english.onlinekhabar.com/feed",
  NEWS_SOURCE_NAME: process.env.NEWS_SOURCE_NAME ?? "Primary News Feed",
  DEBUG_NEWS_TIMES: process.env.DEBUG_NEWS_TIMES === "true",
  NEWS_FEEDS_PATH:
    process.env.NEWS_FEEDS_PATH ??
    path.resolve(import.meta.dir, "../config/news-feeds.json"),
  SOCIAL_FEEDS_PATH:
    process.env.SOCIAL_FEEDS_PATH ??
    path.resolve(import.meta.dir, "../config/social-feeds.json"),
  // Reddit: proxy and pacing to avoid IP blocks (optional)
  REDDIT_PROXY: process.env.REDDIT_PROXY ?? process.env.HTTP_PROXY ?? undefined,
  REDDIT_DELAY_MS: numberFromEnv(process.env.REDDIT_DELAY_MS, 5000),
  REDDIT_MAX_RETRIES: numberFromEnv(process.env.REDDIT_MAX_RETRIES, 2),
  // Nitter: X/Twitter RSS without API key (optional; Nitter instances can be unstable)
  NITTER_BASE_URL:
    process.env.NITTER_BASE_URL ?? "https://nitter.poast.org",
  ADMIN_SECRET: process.env.ADMIN_SECRET ?? undefined,
  /** Shared with API for GET/PATCH /v1/worker-state */
  WORKER_SECRET: process.env.WORKER_SECRET ?? undefined,
  /** Optional: for watchlist alerts to Telegram */
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ?? undefined,
  /** Optional: Upcoming Issues scrape source (HTML page). When unset, worker skips the job. */
  UPCOMING_ISSUES_SOURCE_URL: process.env.UPCOMING_ISSUES_SOURCE_URL ?? undefined,
  /** Optional: throttle upcoming issues scrape (minutes). Default: 720 (12h). */
  UPCOMING_ISSUES_MINUTES: numberFromEnv(process.env.UPCOMING_ISSUES_MINUTES, 720),
} as const;
