import { runReplay } from "./replay";
import { fetchEcnRaw, parseEcnRaw } from "./sources/ecn";
import { fetchNewsRaw } from "./sources/news";
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

const API_URL = process.env.API_URL ?? "http://localhost:3001";
const REPLAY_SPEED = Number(process.env.REPLAY_SPEED) || 10;
const MODE = (process.env.MODE ?? "replay") as "replay" | "live";

async function runLiveEcn(): Promise<void> {
  const sourceId = "ecn";
  const sourceName = "Election Commission of Nepal";
  const now = new Date().toISOString();

  try {
    const { html } = await fetchEcnRaw({ baseUrl: process.env.ECN_BASE_URL });
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
  const sourceName = process.env.NEWS_SOURCE_NAME ?? "Online Khabar";
  const now = new Date().toISOString();

  try {
    const { items } = await fetchNewsRaw({
      feedUrl: process.env.NEWS_FEED_URL,
    });
    const events = normalizeNewsToEvents(items, sourceId, sourceName);
    let posted = 0;
    for (const event of events.slice(0, 20)) {
      const ok = await postEvent(API_URL, event);
      if (ok) posted++;
    }
    await postSourceHealth(API_URL, {
      sourceId,
      sourceName,
      lastUpdate: now,
      errorRate: 0,
      status: "live",
      updateCount: posted,
    });
    console.log(`[live] News ingest done: ${posted} events`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[live] News fetch failed:", message);
    await postSourceHealth(API_URL, {
      sourceId,
      sourceName,
      lastUpdate: now,
      errorRate: 1,
      status: "error",
      updateCount: 0,
    });
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
  const cronMinutes = Number(process.env.CRON_ECN_MINUTES) || 0;
  if (cronMinutes > 0) {
    const intervalMs = cronMinutes * 60 * 1000;
    const runCycle = () => {
      runLiveEcn().catch((err) => console.error("[worker] ECN run error:", err));
      runLiveNews().catch((err) => console.error("[worker] News run error:", err));
    };
    runCycle();
    setInterval(runCycle, intervalMs);
    console.log(`  ECN + News job every ${cronMinutes} min`);
  } else {
    Promise.all([
      runLiveEcn().catch((err) => {
        console.error("[worker] ECN error:", err);
      }),
      runLiveNews().catch((err) => {
        console.error("[worker] News error:", err);
      }),
    ]).finally(() => process.exit(0));
  }
} else {
  runReplay({ apiUrl: API_URL, speed: REPLAY_SPEED }).catch((err) => {
    console.error("[worker] Fatal error:", err);
    process.exit(1);
  });
}
