/**
 * Reddit source: fetch subreddit listings.
 *
 * To avoid IP blocks:
 * - Use REDDIT_DELAY_MS (default 5s) between subreddits; keep few subreddits in config.
 * - Set REDDIT_USER_AGENT to a descriptive bot name (Reddit requires this).
 * - Optional: REDDIT_PROXY or HTTP_PROXY (proxy support depends on runtime).
 * - For zero risk to your IP: use GDELT Reddit (see gdelt.ts fetchGdeltRedditEvents) or
 *   Reddit's official API with OAuth (separate setup).
 */

import type { SignalEvent } from "@repo/shared";
import { env } from "../env";

export type RedditFeedConfig = {
  name: string;
  subreddit: string;
};

function getFetchOptions(): RequestInit {
  const headers: Record<string, string> = {
    "User-Agent":
      process.env.REDDIT_USER_AGENT ??
      "nepal-intelligence-os/1.0 (reddit ingestion; +https://github.com/nepal-intelligence-os)",
  };
  return { headers };
}

export async function fetchRedditEvents(
  cfg: RedditFeedConfig
): Promise<SignalEvent[]> {
  const url = `https://www.reddit.com/r/${encodeURIComponent(
    cfg.subreddit
  )}/new.json?limit=20`;
  const maxRetries = env.REDDIT_MAX_RETRIES;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const backoffMs = Math.min(2000 * Math.pow(2, attempt - 1), 30000);
      console.warn(
        `[live] Reddit backoff ${backoffMs}ms before retry ${attempt}/${maxRetries} for ${cfg.name}`
      );
      await new Promise((r) => setTimeout(r, backoffMs));
    }

    const res = await fetch(url, getFetchOptions());
    lastStatus = res.status;

    if (res.ok) {
      const json = (await res.json()) as {
        data?: {
          children?: Array<{
            data?: {
              id?: string;
              title?: string;
              selftext?: string;
              permalink?: string;
              created_utc?: number;
              ups?: number;
              num_comments?: number;
            };
          }>;
        };
      };
      const children = json.data?.children ?? [];
      const nowIso = new Date().toISOString();
      const events: SignalEvent[] = [];

      for (const child of children) {
        const d = child.data;
        if (!d?.id || !d.title) continue;

        const createdUtc = d.created_utc
          ? new Date(d.created_utc * 1000).toISOString()
          : nowIso;
        const permalink = d.permalink
          ? `https://www.reddit.com${d.permalink}`
          : `https://www.reddit.com/r/${cfg.subreddit}/comments/${d.id}`;

        const ups = d.ups ?? 0;
        const comments = d.num_comments ?? 0;
        const metaLine = `↑ ${ups.toLocaleString("en-NP")}  •  💬 ${comments.toLocaleString(
          "en-NP"
        )}`;
        const body =
          (d.selftext && d.selftext.trim().length > 0 ? d.selftext : d.title) +
          "\n\n" +
          metaLine;

        events.push({
          id: `reddit-${d.id}`,
          type: "note",
          severity: "info",
          title: d.title,
          body,
          timestamp: createdUtc,
          source: `Reddit: ${cfg.name}`,
          url: permalink,
        });
      }
      return events;
    }

    const isRateLimit = res.status === 429 || res.status === 403;
    const hint = isRateLimit
      ? " (rate limit / IP block; increase REDDIT_DELAY_MS or use fewer subreddits)"
      : "";
    console.warn(
      "[live] Reddit API error",
      cfg.name,
      res.status,
      res.statusText + hint
    );
    if (!isRateLimit || attempt === maxRetries) break;
  }

  return [];
}

