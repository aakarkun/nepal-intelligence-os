import { runReplay } from "./replay";
import { env } from "./env";
import { fetchEcnRaw, parseEcnRaw } from "./sources/ecn";
import { fetchNewsRaw } from "./sources/news";
import {
  fetchGdeltNewsEvents,
  fetchGdeltSignalEvents,
  fetchGdeltRedditEvents,
} from "./sources/gdelt";
import { fetchTwitterEvents, type TwitterFeedConfig } from "./sources/twitter";
import { fetchRedditEvents, type RedditFeedConfig } from "./sources/reddit";
import { fetchNitterEvents, type NitterFeedConfig } from "./sources/nitter";
import {
  normalizeEcnToSummary,
  normalizeEcnToConstituencies,
} from "./normalizers/ecn";
import { normalizeNewsToEvents } from "./normalizers/news";
import {
  runEcnIngest,
  postSourceHealth,
  postEvent,
} from "./ingest-client";
import type { SourceHealth } from "@repo/shared";

const { API_URL, REPLAY_SPEED, MODE, NEWS_FEEDS_PATH, SOCIAL_FEEDS_PATH } = env;

// GDELT is rate-limited fairly aggressively, so we only poll it at most
// once every 15 minutes, regardless of the main cron frequency.
const GDELT_MIN_INTERVAL_MS = 15 * 60 * 1000;

// Reddit: delay between subreddit requests to avoid 403 (env REDDIT_DELAY_MS, default 5s).
const REDDIT_DELAY_BETWEEN_FEEDS_MS = env.REDDIT_DELAY_MS;
let lastGdeltNewsRun: number | null = null;
let lastGdeltSignalRun: number | null = null;

async function runLiveEcn(): Promise<void> {
  const sourceId = "ecn";
  const sourceName = "Election Commission of Nepal";
  const now = new Date().toISOString();

  try {
    const { html } = await fetchEcnRaw({ baseUrl: env.ECN_BASE_URL });
    const raw = parseEcnRaw(html);
    const summary = normalizeEcnToSummary(raw, sourceId, sourceName);
    const constituencies = normalizeEcnToConstituencies(raw, sourceId, sourceName);

    await runEcnIngest(API_URL, { summary, constituencies });
    console.log(
      `[live] ECN ingest done: summary=${summary ? "yes" : "no"}, constituencies=${constituencies.length}`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[live] ECN fetch/parse failed:", message);
    const health: SourceHealth = {
      sourceId,
      sourceName,
      lastUpdate: now,
      errorRate: 1,
      status: "error",
      updateCount: 0,
    };
    await postSourceHealth(API_URL, health);
  }
}

async function runLiveNews(): Promise<void> {
  const sourceId = "news";
  const now = new Date().toISOString();

  const feeds: Array<{ feedUrl: string; sourceName: string }> = [];

  // Preferred: load from committed JSON config file so feeds are
  // versioned and easy to review in git.
  try {
    const file = Bun.file(NEWS_FEEDS_PATH);
    if (await file.exists()) {
      const parsed = (await file.json()) as Array<{
        name?: string;
        url?: string;
      }>;
      for (const entry of parsed) {
        if (!entry?.url) continue;
        feeds.push({
          feedUrl: entry.url,
          sourceName: entry.name ?? "News Feed",
        });
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      "[live] Failed to load news-feeds config from",
      NEWS_FEEDS_PATH,
      ":",
      message
    );
  }

  // Optional override/extension: semicolon-separated "Name|URL" pairs
  // from NEWS_FEEDS env, e.g.
  // NEWS_FEEDS=Google News — Nepal Election|https://...;Online Khabar|https://...
  const feedsVar = env.NEWS_FEEDS;
  if (feedsVar) {
    const entries = feedsVar.split(";").map((p) => p.trim());
    for (const entry of entries) {
      if (!entry) continue;
      const [nameRaw, urlRaw] = entry.split("|");
      const url = urlRaw?.trim();
      if (!url) continue;
      const name = nameRaw?.trim() || "News Feed";
      feeds.push({ feedUrl: url, sourceName: name });
    }
  }

  // Backwards compatibility: single NEWS_FEED_URL/NEWS_SOURCE_NAME envs
  if (feeds.length === 0) {
    feeds.push({
      feedUrl: env.NEWS_FEED_URL,
      sourceName: env.NEWS_SOURCE_NAME,
    });
  }

  if (feeds.length === 0) {
    console.warn("[live] No RSS news feeds configured, continuing with GDELT");
  }

  let totalPosted = 0;
  let hadError = false;

  for (const feed of feeds) {
    const feedIdSuffix = feed.sourceName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const feedSourceId =
      feedIdSuffix.length > 0 ? `news:${feedIdSuffix}` : "news:feed";

    let feedHadError = false;
    let feedPosted = 0;

    try {
      const { items } = await fetchNewsRaw({ feedUrl: feed.feedUrl });
      const events = normalizeNewsToEvents(items, sourceId, feed.sourceName);
      for (const event of events.slice(0, 20)) {
        const ok = await postEvent(API_URL, event);
        if (ok) feedPosted++;
      }
      totalPosted += feedPosted;
      console.log(
        `[live] News ingest done from ${feed.sourceName}: ${feedPosted} events`
      );
    } catch (err) {
      hadError = true;
      feedHadError = true;
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[live] News fetch failed for ${feed.sourceName}:`,
        message
      );
    }

    // Per-feed source health
    await postSourceHealth(API_URL, {
      sourceId: feedSourceId,
      sourceName: feed.sourceName,
      lastUpdate: now,
      errorRate: feedHadError ? 1 : 0,
      status: feedHadError ? "error" : "live",
      updateCount: feedPosted,
    });
  }

  // ─── GDELT Articles (15 min interval) ───────────────────────────────────────

  const nowMs = Date.now();
  const shouldRunGdeltNews =
    lastGdeltNewsRun === null ||
    nowMs - lastGdeltNewsRun >= GDELT_MIN_INTERVAL_MS;

  if (shouldRunGdeltNews) {
    let gdeltPosted = 0;
    let gdeltHadError = false;
    try {
      const gdeltEvents = await fetchGdeltNewsEvents();
      for (const event of gdeltEvents.slice(0, 100)) {
        const ok = await postEvent(API_URL, event);
        if (ok) {
          gdeltPosted++;
          totalPosted++;
        }
      }
      if (gdeltEvents.length > 0) {
        console.log(
          `[live] GDELT news ingest done: ${gdeltEvents.length} events (posted ${gdeltPosted})`
        );
      }
      lastGdeltNewsRun = nowMs;
    } catch (err) {
      gdeltHadError = true;
      hadError = true;
      const message = err instanceof Error ? err.message : String(err);
      console.error("[live] GDELT news ingest failed:", message);
    }

    if (gdeltPosted > 0 || gdeltHadError) {
      await postSourceHealth(API_URL, {
        sourceId: "news:gdelt",
        sourceName: "GDELT — Nepal latest articles",
        lastUpdate: now,
        errorRate: gdeltHadError ? 1 : 0,
        status: gdeltHadError ? "error" : "live",
        updateCount: gdeltPosted,
      });
    }
  } else {
    console.log("[live] Skipping GDELT news (within 15 min window)");
  }

  // Aggregated health for the entire news ingest pipeline
  await postSourceHealth(API_URL, {
    sourceId,
    sourceName: "News Aggregator",
    lastUpdate: now,
    errorRate: hadError ? 1 : 0,
    status: hadError ? "error" : "live",
    updateCount: totalPosted,
  });
}

async function runLiveSocial(): Promise<void> {
  const now = new Date().toISOString();
  let totalPosted = 0;

  type SocialConfig = {
    twitter?: TwitterFeedConfig[];
    reddit?: RedditFeedConfig[];
    nitter?: NitterFeedConfig[];
  };

  let cfg: SocialConfig = {};
  try {
    const file = Bun.file(SOCIAL_FEEDS_PATH);
    if (await file.exists()) {
      cfg = (await file.json()) as SocialConfig;
    } else {
      console.warn(
        "[live] No social-feeds.json config found at",
        SOCIAL_FEEDS_PATH
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      "[live] Failed to load social-feeds config from",
      SOCIAL_FEEDS_PATH,
      ":",
      message
    );
  }

  const twitterFeeds = cfg.twitter ?? [];
  for (const feed of twitterFeeds) {
    try {
      const events = await fetchTwitterEvents(feed);
      for (const event of events) {
        const ok = await postEvent(API_URL, event);
        if (ok) totalPosted++;
      }
      if (events.length > 0) {
        console.log(
          `[live] Twitter ingest done from "${feed.name}": ${events.length} events`
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[live] Twitter ingest failed for "${feed.name}":`,
        message
      );
    }
  }

  // Nitter: X/Twitter via RSS (no API key, avoids direct X requests)
  const nitterFeeds = cfg.nitter ?? [];
  for (const feed of nitterFeeds) {
    try {
      const events = await fetchNitterEvents(feed);
      for (const event of events) {
        const ok = await postEvent(API_URL, event);
        if (ok) totalPosted++;
      }
      if (events.length > 0) {
        console.log(
          `[live] Nitter ingest done from "${feed.name}": ${events.length} events`
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[live] Nitter ingest failed for "${feed.name}":`,
        message
      );
    }
  }

  const redditFeeds = cfg.reddit ?? [];
  for (let i = 0; i < redditFeeds.length; i++) {
    if (i > 0) {
      await new Promise((r) =>
        setTimeout(r, REDDIT_DELAY_BETWEEN_FEEDS_MS)
      );
    }
    const feed = redditFeeds[i];
    try {
      const events = await fetchRedditEvents(feed);
      for (const event of events) {
        const ok = await postEvent(API_URL, event);
        if (ok) totalPosted++;
      }
      if (events.length > 0) {
        console.log(
          `[live] Reddit ingest done from "${feed.name}": ${events.length} events`
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[live] Reddit ingest failed for "${feed.name}":`,
        message
      );
    }
  }

  // ─── GDELT Reddit (no direct Reddit requests — avoids IP block) ───────────────
  try {
    const gdeltRedditEvents = await fetchGdeltRedditEvents();
    for (const event of gdeltRedditEvents) {
      const ok = await postEvent(API_URL, event);
      if (ok) totalPosted++;
    }
    if (gdeltRedditEvents.length > 0) {
      console.log(
        `[live] GDELT Reddit ingest done: ${gdeltRedditEvents.length} events`
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[live] GDELT Reddit ingest failed:", message);
  }

  // ─── GDELT Signals (15 min interval) ────────────────────────────────────────

  const nowMs = Date.now();
  const shouldRunGdeltSignals =
    lastGdeltSignalRun === null ||
    nowMs - lastGdeltSignalRun >= GDELT_MIN_INTERVAL_MS;

  if (shouldRunGdeltSignals) {
    let gdeltPosted = 0;
    let gdeltHadError = false;
    try {
      const gdeltEvents = await fetchGdeltSignalEvents();
      for (const event of gdeltEvents) {
        const ok = await postEvent(API_URL, event);
        if (ok) {
          gdeltPosted++;
          totalPosted++;
        }
      }
      if (gdeltEvents.length > 0) {
        console.log(
          `[live] GDELT social ingest done: ${gdeltEvents.length} events (posted ${gdeltPosted})`
        );
      }
      lastGdeltSignalRun = nowMs;
    } catch (err) {
      gdeltHadError = true;
      const message = err instanceof Error ? err.message : String(err);
      console.error("[live] GDELT social ingest failed:", message);
    }

    if (totalPosted > 0 || gdeltHadError) {
      await postSourceHealth(API_URL, {
        sourceId: "social",
        sourceName: "Social Aggregator",
        lastUpdate: now,
        errorRate: gdeltHadError ? 1 : 0,
        status: gdeltHadError ? "error" : "live",
        updateCount: totalPosted,
      });
    }
  } else {
    await postSourceHealth(API_URL, {
      sourceId: "social",
      sourceName: "Social Aggregator",
      lastUpdate: now,
      errorRate: 0,
      status: "live",
      updateCount: totalPosted,
    });
    console.log("[live] Skipping GDELT social (within 15 min window)");
  }
}

console.log("──────────────────────────────────────────");
console.log(
  MODE === "live"
    ? "  Nepal Intelligence OS — Live Worker"
    : "  Nepal Intelligence OS — Replay Worker"
);
console.log("──────────────────────────────────────────");
console.log(`  API URL : ${API_URL}`);
console.log(`  Mode    : ${MODE}`);
if (MODE === "replay") {
  console.log(`  Speed   : ${REPLAY_SPEED}x`);
}
console.log("──────────────────────────────────────────");

if (MODE === "live") {
  const cronMinutes = env.CRON_ECN_MINUTES;
  if (cronMinutes > 0) {
    const intervalMs = cronMinutes * 60 * 1000;
    const runCycle = () => {
      runLiveEcn().catch((err) => console.error("[worker] ECN run error:", err));
      runLiveNews().catch((err) => console.error("[worker] News run error:", err));
      runLiveSocial().catch((err) =>
        console.error("[worker] Social run error:", err)
      );
    };
    runCycle();
    setInterval(runCycle, intervalMs);
    console.log(`  ECN + News + Social job every ${cronMinutes} min`);
  } else {
    Promise.all([
      runLiveEcn().catch((err) => {
        console.error("[worker] ECN error:", err);
      }),
      runLiveNews().catch((err) => {
        console.error("[worker] News error:", err);
      }),
      runLiveSocial().catch((err) => {
        console.error("[worker] Social error:", err);
      }),
    ]).finally(() => process.exit(0));
  }
} else {
  runReplay({ apiUrl: API_URL, speed: REPLAY_SPEED }).catch((err) => {
    console.error("[worker] Fatal error:", err);
    process.exit(1);
  });
}
