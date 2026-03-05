/**
 * News source: fetch RSS/Atom feed and return raw items.
 */

import Parser from "rss-parser";

const DEFAULT_FEED_URL =
  process.env.NEWS_FEED_URL ?? "https://english.onlinekhabar.com/feed";

export type NewsRawItem = {
  title: string;
  link?: string;
  /**
   * Original timestamp from the feed (RSS pubDate, Atom updated/published, or isoDate).
   */
  pubDate?: string;
  description?: string;
};

export type NewsRawResult = {
  items: NewsRawItem[];
};

export async function fetchNewsRaw(options?: {
  feedUrl?: string;
}): Promise<NewsRawResult> {
  const feedUrl = options?.feedUrl ?? DEFAULT_FEED_URL;
  const parser = new Parser();

  const feed = await parser.parseURL(feedUrl);
  const rawItems = feed.items ?? [];
  const items: NewsRawItem[] = rawItems.map((item: {
    title?: string;
    link?: string;
    pubDate?: string;
    isoDate?: string;
    updated?: string;
    published?: string;
    content?: string;
    contentSnippet?: string;
  }) => {
    const rawDate =
      item.isoDate ?? item.pubDate ?? item.published ?? item.updated;

    return {
      title: item.title ?? "",
      link: item.link,
      pubDate: rawDate,
      description: item.contentSnippet ?? item.content ?? undefined,
    };
  });

  // Optional debug logging to inspect timestamps from feeds.
  if (process.env.DEBUG_NEWS_TIMES === "true") {
    console.log("[news] Feed:", feedUrl);
    for (const [idx, item] of rawItems.slice(0, 5).entries()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyItem = item as any;
      console.log(
        `[news]  #${idx + 1} "${anyItem.title}"`,
        "isoDate=",
        anyItem.isoDate,
        "pubDate=",
        anyItem.pubDate,
        "published=",
        anyItem.published,
        "updated=",
        anyItem.updated
      );
    }
  }

  return { items };
}
