import Parser from "rss-parser";
import type { GeopoliticsArticle } from "@repo/shared";
import { stableId } from "../lib/stable-id";

const GDELT_TIMEOUT_MS = 10_000;
const GDELT_BASE =
  "https://api.gdelt.org/v2/doc/doc?mode=artlist&maxrecords=25&format=json&timespan=24H";
const UN_RSS =
  "https://news.un.org/feed/subscribe/en/news/region/asia-pacific/feed/rss.xml";

type GeopoliticsPanel = GeopoliticsArticle["panel"];

const QUERIES: { query: string; panel: GeopoliticsPanel }[] = [
  {
    query: "Nepal OR (India Nepal) OR (China Nepal)",
    panel: "south_asia",
  },
  {
    query: "Nepal foreign ministry OR Nepal embassy OR Nepal diplomat",
    panel: "diplomatic",
  },
  {
    query: "Nepal workers OR Nepal remittance OR Nepal migrant Gulf",
    panel: "remittance",
  },
  {
    query: "Nepal United Nations OR Nepal peacekeeping OR Nepal UNDP",
    panel: "un",
  },
];

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = GDELT_TIMEOUT_MS, ...init } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

type GDELTArticle = {
  title?: string;
  url?: string;
  domain?: string;
  language?: string;
  seendate?: string;
  socialimage?: string;
  tone?: number;
};

export async function fetchWorldArticles(): Promise<GeopoliticsArticle[]> {
  const fetchedAt = new Date().toISOString();
  const seen = new Set<string>();
  const articles: GeopoliticsArticle[] = [];

  for (const { query, panel } of QUERIES) {
    try {
      const url = `${GDELT_BASE}&query=${encodeURIComponent(query)}`;
      const res = await fetchWithTimeout(url, { timeout: GDELT_TIMEOUT_MS });
      if (!res.ok) continue;
      const data = (await res.json()) as { articles?: GDELTArticle[] };
      const list = data.articles ?? [];
      for (const art of list) {
        const link = art.url?.trim();
        if (!link || seen.has(link)) continue;
        seen.add(link);
        const id = `gdelt-${stableId(link)}`;
        const publishedAt = art.seendate
          ? new Date(art.seendate).toISOString()
          : fetchedAt;
        articles.push({
          id,
          title: (art.title ?? "").trim() || "No title",
          url: link,
          source: (art.domain ?? "").trim() || "unknown",
          panel,
          tone: typeof art.tone === "number" ? art.tone : null,
          publishedAt,
          language: (art.language ?? "en").slice(0, 10),
          imageUrl: art.socialimage?.trim() || null,
          fetchedAt,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[gdelt-world] GDELT panel ${panel} failed:`, message);
    }
  }

  try {
    const parser = new Parser();
    const feed = await parser.parseURL(UN_RSS);
    const items = feed.items ?? [];
    for (const item of items) {
      const title = (item.title ?? "").trim();
      const content = (item.contentSnippet ?? item.content ?? "").trim();
      const haystack = `${title} ${content}`.toLowerCase();
      if (!haystack.includes("nepal")) continue;
      const link = (item as { link?: string }).link?.trim();
      if (!link || seen.has(link)) continue;
      seen.add(link);
      const id = `gdelt-${stableId(link)}`;
      const publishedAt =
        (item as { isoDate?: string }).isoDate ??
        (item as { pubDate?: string }).pubDate ??
        fetchedAt;
      articles.push({
        id,
        title: title || "No title",
        url: link,
        source: "news.un.org",
        panel: "un",
        tone: null,
        publishedAt,
        language: "en",
        imageUrl: null,
        fetchedAt,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[gdelt-world] UN RSS failed:", message);
  }

  return articles;
}
