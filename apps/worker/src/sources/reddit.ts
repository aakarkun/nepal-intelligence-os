import type { SignalEvent } from "@repo/shared";

export type RedditFeedConfig = {
  name: string;
  subreddit: string;
};

export async function fetchRedditEvents(
  cfg: RedditFeedConfig
): Promise<SignalEvent[]> {
  const url = `https://www.reddit.com/r/${encodeURIComponent(
    cfg.subreddit
  )}/new.json?limit=20`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        process.env.REDDIT_USER_AGENT ??
        "nepal-intelligence-os/1.0 (reddit ingestion)",
    },
  });

  if (!res.ok) {
    console.warn(
      "[live] Reddit API error",
      cfg.name,
      res.status,
      res.statusText
    );
    return [];
  }

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

