/**
 * News source: fetch RSS/Atom feed and return raw items.
 */

import Parser from "rss-parser";

const DEFAULT_FEED_URL =
  process.env.NEWS_FEED_URL ?? "https://english.onlinekhabar.com/feed";

export type NewsRawItem = {
  title: string;
  link?: string;
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
  const items: NewsRawItem[] = (feed.items ?? []).map((item: { title?: string; link?: string; pubDate?: string; content?: string; contentSnippet?: string }) => ({
    title: item.title ?? "",
    link: item.link,
    pubDate: item.pubDate,
    description: item.contentSnippet ?? item.content ?? undefined,
  }));

  return { items };
}
