import Parser from "rss-parser";
import { env } from "../env";
import { classifyNepalArticle } from "../lib/anthropic-political";
import {
  getPoliticalNewsSources,
  postPoliticalEvent,
  postNewsSourcePolled,
  urlExistsInPoliticalPulse,
} from "../ingest-client";

const KEYWORDS = [
  "bill",
  "law",
  "parliament",
  "legislation",
  "cabinet",
  "minister",
  "policy",
  "ordinance",
  "gazette",
  "rsp",
  "balen",
  "balendra shah",
  "house of representatives",
  "national assembly",
  "सरकार",
  "संसद",
  "विधेयक",
];

function matchesKeywords(text: string): boolean {
  const t = text.toLowerCase();
  return KEYWORDS.some((k) => t.includes(k.toLowerCase()));
}

const parser = new Parser({
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; NepalIntelligenceOS/1.0; +https://github.com/nepal-intelligence-os)",
    Accept: "application/rss+xml, application/xml, text/xml",
  },
});

export async function runPoliticalRssIngestion(): Promise<void> {
  const defaultIntervalMs =
    Math.max(5, Number(process.env.RSS_POLL_INTERVAL_MINUTES ?? 30)) * 60 * 1000;

  const sources = await getPoliticalNewsSources(env.API_URL);
  if (!sources || sources.length === 0) {
    console.warn(
      "[political-rss] No news_feed_sources from API — run DB migration + seed, and set WORKER_SECRET"
    );
    return;
  }

  const now = Date.now();
  for (const src of sources) {
    if (src.isActive === false) continue;
    const intervalMs = (src.pollIntervalMinutes ?? 30) * 60 * 1000 || defaultIntervalMs;
    const last = src.lastPolledAt ? new Date(src.lastPolledAt).getTime() : 0;
    if (last && now - last < intervalMs * 0.85) {
      continue;
    }
    try {
      const feed = await parser.parseURL(src.rssUrl);
      let ingested = 0;
      for (const item of feed.items ?? []) {
        const title = item.title ?? "";
        const desc = item.contentSnippet ?? item.content ?? "";
        const link = item.link ?? "";
        const pub = item.pubDate ?? item.isoDate ?? new Date().toISOString();
        const publishedAt = new Date(pub).toISOString();
        const blob = `${title}\n${desc}`;
        if (!matchesKeywords(blob)) continue;
        if (!link) continue;
        const exists = await urlExistsInPoliticalPulse(env.API_URL, link);
        if (exists) continue;
        const classified = await classifyNepalArticle({
          title,
          content: desc || title,
          sourceName: src.name,
          link,
          publishedAt,
        });
        const ok = await postPoliticalEvent(env.API_URL, classified);
        if (ok) ingested++;
      }
      await postNewsSourcePolled(env.API_URL, src.id, new Date().toISOString());
      console.log(`[political-rss] ${src.name}: ingested ${ingested} new event(s)`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[political-rss] ${src.name} failed:`, msg);
    }
  }
}
