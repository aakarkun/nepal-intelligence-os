import type { SignalEvent } from "@repo/shared";

const TWITTER_API_URL = "https://api.twitter.com/2/tweets/search/recent";

export type TwitterFeedConfig = {
  name: string;
  query: string;
};

export async function fetchTwitterEvents(
  cfg: TwitterFeedConfig
): Promise<SignalEvent[]> {
  const token = process.env.TWITTER_BEARER_TOKEN;
  if (!token) {
    console.warn(
      "[live] Skipping Twitter feed (missing TWITTER_BEARER_TOKEN):",
      cfg.name
    );
    return [];
  }

  const url = new URL(TWITTER_API_URL);
  url.searchParams.set("query", cfg.query);
  url.searchParams.set("max_results", "20");
  url.searchParams.set("tweet.fields", "created_at,author_id,lang");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    console.warn(
      "[live] Twitter API error",
      cfg.name,
      res.status,
      res.statusText
    );
    return [];
  }

  const json = (await res.json()) as {
    data?: Array<{
      id: string;
      text: string;
      author_id?: string;
      created_at?: string;
      lang?: string;
    }>;
  };

  const tweets = json.data ?? [];
  const events: SignalEvent[] = tweets.map((t) => {
    const createdAt =
      t.created_at ?? new Date().toISOString(); // fallback to ingest time
    const authorSegment = t.author_id ? `/${t.author_id}` : "";
    const url = `https://twitter.com${authorSegment}/status/${t.id}`;

    return {
      id: `twitter-${t.id}`,
      type: "note",
      severity: "info",
      title: t.text.slice(0, 120),
      body: t.text,
      timestamp: createdAt,
      source: `X: ${cfg.name}`,
      url,
    };
  });

  return events;
}

