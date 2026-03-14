import { runReplay } from "./replay";
import { env } from "./env";
import { fetchNewsRaw } from "./sources/news";
import {
  fetchGdeltNewsEvents,
  fetchGdeltSignalEvents,
} from "./sources/gdelt";
import { fetchTwitterEvents, type TwitterFeedConfig } from "./sources/twitter";
import { fetchRedditEvents, type RedditFeedConfig } from "./sources/reddit";
import { fetchNitterEvents, type NitterFeedConfig } from "./sources/nitter";
import {
  fetchEarthquakeIncidents,
  normalizeEarthquakesToSignals,
  summarizeEarthquakeIncidents,
} from "./sources/earthquake";
import {
  fetchForexRates,
  fetchMarketAssetQuotes,
  summarizeForexRates,
} from "./sources/economy";
import { normalizeNewsToEvents } from "./normalizers/news";
import {
  postSourceHealth,
  postEvent,
  postEarthquakeIncidents,
  postCrisisSummary,
  postCrisisIncidents,
  postFloodAlerts,
  postForexRates,
  postEconomySummary,
  postMarketAssetQuotes,
  postNepseSummary,
} from "./ingest-client";
import { fetchNepseSummary } from "./sources/nepse";
import { fetchFloodAlerts } from "./sources/flood";
import { fetchCabinetEvents } from "./sources/rss-nepal";
import { fetchParliamentSession } from "./sources/parliament";
import {
  postCabinetEvents,
  postParliamentSession,
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

type LiveWorkerState = {
  lastCycleCompletedAt?: string;
  lastNepseRunDate?: string;
  lastMarketAssetsFetchedAt?: string;
  lastMarketAssetQuotes?: Array<{
    assetCode: string;
    assetName: string;
    class: "metal" | "crypto";
    currency: string;
    price: number;
    previousPrice: number | null;
    change: number | null;
    changePercent: number | null;
    trend: "up" | "down" | "flat" | "new";
    timestamp: string;
  }>;
};

type ElectionDatasetMeta = {
  id: string;
  isCurrent: boolean;
  sourceId?: string;
};

async function readLiveWorkerState(): Promise<LiveWorkerState> {
  try {
    const file = Bun.file(env.LIVE_STATE_PATH);
    if (!(await file.exists())) return {};
    const parsed = (await file.json()) as LiveWorkerState;
    return parsed ?? {};
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[worker] Failed to read live worker state:", message);
    return {};
  }
}

async function writeLiveWorkerState(state: LiveWorkerState): Promise<void> {
  try {
    await Bun.write(env.LIVE_STATE_PATH, JSON.stringify(state, null, 2));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[worker] Failed to persist live worker state:", message);
  }
}

async function hasCurrentLiveElectionDataset(): Promise<boolean> {
  if (!env.ENABLE_SCRAPLING_ECN) return false;

  try {
    const res = await fetch(`${API_URL}/v1/election-datasets`);
    if (!res.ok) {
      throw new Error(`API responded ${res.status}`);
    }
    const datasets = (await res.json()) as ElectionDatasetMeta[];
    return datasets.some(
      (dataset) =>
        dataset.id.startsWith("ekantipur-") ||
        dataset.sourceId === "ekantipur"
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      "[worker] Failed to inspect election datasets; assuming bootstrap is needed:",
      message
    );
    return false;
  }
}

async function runLiveEcn(): Promise<void> {
  const sourceId = env.ENABLE_SCRAPLING_ECN ? "ekantipur" : "ecn";
  const sourceName = env.ENABLE_SCRAPLING_ECN
    ? "Ekantipur Election"
    : "Election Commission of Nepal";
  const now = new Date().toISOString();

  try {
    if (env.ENABLE_SCRAPLING_ECN) {
      const proc = Bun.spawn(
        ["python3", env.SCRAPLING_ECN_SCRIPT_PATH],
        {
          env: {
            ...process.env,
            API_URL,
            ECN_BASE_URL: env.ECN_BASE_URL,
            SCRAPLING_REQUEST_DELAY_MS: String(env.SCRAPLING_REQUEST_DELAY_MS),
          },
          stdout: "pipe",
          stderr: "pipe",
        }
      );
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]);
      if (exitCode !== 0) {
        throw new Error(stderr.trim() || stdout.trim() || `exit code ${exitCode}`);
      }
      console.log(`[live] Scrapling ECN ingest done: ${stdout.trim()}`);
      return;
    }
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

  if (env.ENABLE_GDELT) {
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
  } else {
    console.log("[live] GDELT news disabled (set ENABLE_GDELT=true to enable)");
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

  if (env.ENABLE_REDDIT) {
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
  } else {
    console.log("[live] Reddit ingest disabled (set ENABLE_REDDIT=true to enable)");
  }

  if (env.ENABLE_GDELT) {
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
  } else {
    await postSourceHealth(API_URL, {
      sourceId: "social",
      sourceName: "Social Aggregator",
      lastUpdate: now,
      errorRate: 0,
      status: "live",
      updateCount: totalPosted,
    });
    console.log("[live] GDELT social disabled (set ENABLE_GDELT=true to enable)");
  }
}

async function runLiveCrisis(): Promise<void> {
  const now = new Date().toISOString();
  let hadError = false;
  let updateCount = 0;

  try {
    const incidents = await fetchEarthquakeIncidents();
    const summary = summarizeEarthquakeIncidents(incidents, now);

    await postEarthquakeIncidents(API_URL, incidents);
    await postCrisisSummary(API_URL, summary);

    const signalEvents = normalizeEarthquakesToSignals(incidents);
    for (const event of signalEvents) {
      const ok = await postEvent(API_URL, event);
      if (ok) updateCount++;
    }

    await postSourceHealth(API_URL, {
      sourceId: "crisis:earthquakes",
      sourceName: "USGS Earthquake Hazards Program",
      lastUpdate: now,
      errorRate: 0,
      status: "live",
      updateCount: incidents.length,
    });
  } catch (err) {
    hadError = true;
    const message = err instanceof Error ? err.message : String(err);
    console.error("[live] Crisis ingest failed:", message);
    await postSourceHealth(API_URL, {
      sourceId: "crisis:earthquakes",
      sourceName: "USGS Earthquake Hazards Program",
      lastUpdate: now,
      errorRate: 1,
      status: "error",
      updateCount: 0,
    });
  }

  await postSourceHealth(API_URL, {
    sourceId: "crisis",
    sourceName: "Crisis Monitor",
    lastUpdate: now,
    errorRate: hadError ? 1 : 0,
    status: hadError ? "error" : "live",
    updateCount,
  });
}

const FLOOD_INTERVAL_MS = 3 * 60 * 60 * 1000;
let lastFloodRunAt: number | null = null;

async function runLiveFlood(): Promise<void> {
  const nowMs = Date.now();
  if (
    lastFloodRunAt !== null &&
    nowMs - lastFloodRunAt < FLOOD_INTERVAL_MS
  ) {
    return;
  }
  lastFloodRunAt = nowMs;
  const now = new Date().toISOString();
  try {
    const payload = await fetchFloodAlerts();
    await postFloodAlerts(API_URL, payload);
    await postSourceHealth(API_URL, {
      sourceId: "crisis:flood",
      sourceName: "DHM Nepal — Flood / Landslide",
      lastUpdate: now,
      errorRate: 0,
      status: "live",
      updateCount: payload.alerts.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[live] Flood alerts ingest failed:", message);
    await postSourceHealth(API_URL, {
      sourceId: "crisis:flood",
      sourceName: "DHM Nepal — Flood / Landslide",
      lastUpdate: now,
      errorRate: 1,
      status: "error",
      updateCount: 0,
    });
  }
}

async function runLiveCabinet(): Promise<void> {
  try {
    const events = await fetchCabinetEvents();
    if (events.length > 0) {
      await postCabinetEvents(API_URL, events);
      console.log(`[live] Cabinet events ingest: ${events.length} items`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[live] Cabinet events ingest failed:", message);
  }
}

const PARLIAMENT_DAILY_MS = 24 * 60 * 60 * 1000;
let lastParliamentRunAt: number | null = null;

async function runLiveParliament(): Promise<void> {
  const nowMs = Date.now();
  if (
    lastParliamentRunAt !== null &&
    nowMs - lastParliamentRunAt < PARLIAMENT_DAILY_MS
  ) {
    return;
  }
  lastParliamentRunAt = nowMs;
  try {
    const session = await fetchParliamentSession();
    if (session) {
      await postParliamentSession(API_URL, session);
      console.log("[live] Parliament session ingest done");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[live] Parliament session ingest failed:", message);
  }
}

async function runLiveEconomy(state: LiveWorkerState): Promise<void> {
  const now = new Date().toISOString();
  const assetIntervalMs = env.MARKET_ASSET_MINUTES * 60 * 1000;

  try {
    const rates = await fetchForexRates();
    const summary = summarizeForexRates(rates, now);
    const lastMarketAssetsFetchedAt = state.lastMarketAssetsFetchedAt
      ? new Date(state.lastMarketAssetsFetchedAt).getTime()
      : null;
    const shouldRefreshMarketAssets =
      !lastMarketAssetsFetchedAt ||
      Number.isNaN(lastMarketAssetsFetchedAt) ||
      Date.now() - lastMarketAssetsFetchedAt >= assetIntervalMs;
    const marketAssetQuotes = shouldRefreshMarketAssets
      ? await fetchMarketAssetQuotes(state.lastMarketAssetQuotes ?? [])
      : (state.lastMarketAssetQuotes ?? []);

    await postForexRates(API_URL, rates);
    await postEconomySummary(API_URL, summary);
    if (shouldRefreshMarketAssets) {
      await postMarketAssetQuotes(API_URL, marketAssetQuotes);
    }

    await postSourceHealth(API_URL, {
      sourceId: "economy:forex",
      sourceName: "Nepal Rastra Bank Forex",
      lastUpdate: now,
      errorRate: 0,
      status: "live",
      updateCount: rates.length,
    });

    await postSourceHealth(API_URL, {
      sourceId: "economy",
      sourceName: "Economy Monitor",
      lastUpdate: now,
      errorRate: 0,
      status: "live",
      updateCount: rates.length + marketAssetQuotes.length,
    });

    if (shouldRefreshMarketAssets) {
      state.lastMarketAssetQuotes = marketAssetQuotes;
      state.lastMarketAssetsFetchedAt = now;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[live] Economy ingest failed:", message);

    await postSourceHealth(API_URL, {
      sourceId: "economy:forex",
      sourceName: "Nepal Rastra Bank Forex",
      lastUpdate: now,
      errorRate: 1,
      status: "error",
      updateCount: 0,
    });

    await postSourceHealth(API_URL, {
      sourceId: "economy",
      sourceName: "Economy Monitor",
      lastUpdate: now,
      errorRate: 1,
      status: "error",
      updateCount: 0,
    });
  }
}

async function runLiveNepse(): Promise<void> {
  const now = new Date().toISOString();
  try {
    const summary = await fetchNepseSummary();
    await postNepseSummary(API_URL, summary);
    await postSourceHealth(API_URL, {
      sourceId: "economy:nepse",
      sourceName: summary.sourceName,
      lastUpdate: now,
      errorRate: 0,
      status: "live",
      updateCount: 1,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[live] NEPSE ingest failed:", message);
    await postSourceHealth(API_URL, {
      sourceId: "economy:nepse",
      sourceName: "NEPSE",
      lastUpdate: now,
      errorRate: 1,
      status: "error",
      updateCount: 0,
    });
  }
}

function shouldRunNepseToday(state: LiveWorkerState): boolean {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const today = now.toISOString().slice(0, 10);
  if (state.lastNepseRunDate === today) return false;
  return utcHour > 9 || (utcHour === 9 && utcMin >= 30);
}

async function runLiveCycle(): Promise<void> {
  const state = await readLiveWorkerState();
  const runNepse = shouldRunNepseToday(state);
  await Promise.allSettled([
    runLiveEcn(),
    runLiveNews(),
    runLiveSocial(),
    runLiveCrisis(),
    runLiveFlood(),
    runLiveCabinet(),
    runLiveParliament(),
    runLiveEconomy(state),
    ...(runNepse ? [runLiveNepse()] : []),
  ]);
  const nextState: LiveWorkerState = {
    lastCycleCompletedAt: new Date().toISOString(),
    lastNepseRunDate: runNepse ? new Date().toISOString().slice(0, 10) : state.lastNepseRunDate,
    lastMarketAssetQuotes: state.lastMarketAssetQuotes,
    lastMarketAssetsFetchedAt: state.lastMarketAssetsFetchedAt,
  };
  await writeLiveWorkerState(nextState);
}

async function startLiveScheduler(intervalMs: number): Promise<void> {
  const state = await readLiveWorkerState();
  const hasLiveDataset = await hasCurrentLiveElectionDataset();
  const lastCompletedAt = state.lastCycleCompletedAt
    ? new Date(state.lastCycleCompletedAt).getTime()
    : null;
  const now = Date.now();
  const initialDelayMs =
    hasLiveDataset && lastCompletedAt && !Number.isNaN(lastCompletedAt)
      ? Math.max(0, intervalMs - (now - lastCompletedAt))
      : 0;

  if (!hasLiveDataset) {
    console.log(
      "[worker] No live Ekantipur dataset found in the API; bootstrapping immediately"
    );
  } else if (initialDelayMs > 0) {
    const nextAt = new Date(now + initialDelayMs).toISOString();
    console.log(
      `[worker] Last live cycle completed at ${state.lastCycleCompletedAt}; next cycle at ${nextAt}`
    );
  } else {
    console.log("[worker] No recent live cycle found; starting immediately");
  }

  const scheduleNext = (delayMs: number) => {
    setTimeout(async () => {
      await runLiveCycle();
      scheduleNext(intervalMs);
    }, delayMs);
  };

  scheduleNext(initialDelayMs);
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
} else {
  console.log(
    `  ECN     : ${
      env.ENABLE_SCRAPLING_ECN ? "Scrapling/Ekantipur" : "Legacy HTTP parser"
    }`
  );
  if (env.ENABLE_SCRAPLING_ECN) {
    console.log(`  Delay   : ${env.SCRAPLING_REQUEST_DELAY_MS}ms/request`);
  }
}
console.log("──────────────────────────────────────────");

if (MODE === "live") {
  const cronMinutes = Math.max(1, env.CRON_ECN_MINUTES);
  if (env.CRON_ECN_MINUTES < 1) {
    console.warn(
      "[worker] CRON_ECN_MINUTES < 1 is invalid; using 1 min to avoid overlap"
    );
  }
  if (cronMinutes > 0) {
    const intervalMs = cronMinutes * 60 * 1000;
    console.log(`  ECN + News + Social job every ${cronMinutes} min`);
    startLiveScheduler(intervalMs).catch((err) => {
      console.error("[worker] Scheduler error:", err);
      process.exit(1);
    });
  } else {
    runLiveCycle().finally(() => process.exit(0));
  }
} else {
  runReplay({ apiUrl: API_URL, speed: REPLAY_SPEED }).catch((err) => {
    console.error("[worker] Fatal error:", err);
    process.exit(1);
  });
}
