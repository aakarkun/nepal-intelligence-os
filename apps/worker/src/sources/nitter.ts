/**
 * Nitter source: X/Twitter content via Nitter RSS (no X API key, no direct X requests).
 *
 * Nitter instances provide RSS feeds for search and users. They can be unstable or
 * rate-limited; use NITTER_BASE_URL to switch instances. If TWITTER_BEARER_TOKEN is
 * set, the worker also uses the official X API; Nitter is then an optional extra.
 */

import Parser from "rss-parser";
import type { SignalEvent } from "@repo/shared";
import { env } from "../env";

export type NitterFeedConfig = {
  name: string;
  query: string;
};

function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

export async function fetchNitterEvents(
  cfg: NitterFeedConfig
): Promise<SignalEvent[]> {
  const base = env.NITTER_BASE_URL.replace(/\/$/, "");
  const searchParams = new URLSearchParams();
  searchParams.set("f", "tweets");
  searchParams.set("q", cfg.query);
  const feedUrl = `${base}/search/rss?${searchParams.toString()}`;

  const parser = new Parser();
  let feed: { items?: Array<{ title?: string; link?: string; pubDate?: string; content?: string; contentSnippet?: string }> };

  try {
    feed = await parser.parseURL(feedUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[live] Nitter fetch failed for", cfg.name, ":", message);
    return [];
  }

  const items = feed.items ?? [];
  const nowIso = new Date().toISOString();
  const events: SignalEvent[] = [];

  for (const item of items.slice(0, 25)) {
    const title = item.title?.trim() ?? "";
    const link = item.link;
    const rawDate = item.pubDate;
    const timestamp =
      rawDate && !Number.isNaN(new Date(rawDate).getTime())
        ? new Date(rawDate).toISOString()
        : nowIso;
    const body = item.contentSnippet ?? item.content ?? title;
    const idSource = link ?? title ?? Math.random().toString(36);
    const id = `nitter-${simpleHash(idSource)}`;

    events.push({
      id,
      type: "note",
      severity: "info",
      title: title.slice(0, 200),
      body,
      timestamp,
      source: `X (Nitter): ${cfg.name}`,
      url: link,
    });
  }

  return events;
}
