import Parser from "rss-parser";
import type { GeopoliticsArticle } from "@repo/shared";
import { stableId } from "../lib/stable-id";

const GDELT_TIMEOUT_MS = 15_000;
/** 48h window — 24H was often empty for narrow Nepal-only queries when news volume is low. */
const GDELT_BASE =
  "https://api.gdelt.org/v2/doc/doc?mode=artlist&maxrecords=25&format=json&timespan=48H";
const UN_RSS =
  "https://news.un.org/feed/subscribe/en/news/region/asia-pacific/feed/rss.xml";
const BBC_ASIA_RSS = "https://feeds.bbci.co.uk/news/world/asia/rss.xml";

/** Google News search — reliable fallback when GDELT artlist is sparse. */
const GOOGLE_NEWS_NEPAL_RSS =
  "https://news.google.com/rss/search?q=Nepal+OR+Kathmandu+OR+Himalaya&hl=en-US&gl=US&ceid=US:en";

const KATHMANDU_POST_RSS = "https://kathmandupost.com/rss";

const MAX_PER_RSS_FEED = 28;

type GeopoliticsPanel = GeopoliticsArticle["panel"];

/**
 * GDELT queries: previous set was so Nepal-centric that panels often returned zero rows.
 * We keep regional + thematic coverage; RSS fills gaps with Nepal-focused feeds.
 */
const QUERIES: { query: string; panel: GeopoliticsPanel }[] = [
  {
    query:
      "(Nepal OR Kathmandu OR South Asia OR India OR Bangladesh OR Pakistan OR Sri Lanka OR Bhutan OR Maldives OR China OR India Nepal)",
    panel: "south_asia",
  },
  {
    query:
      "(Nepal OR diplomacy OR foreign policy OR embassy OR ambassador OR bilateral OR summit OR India China OR United Nations OR SAARC)",
    panel: "diplomatic",
  },
  {
    query:
      "(Nepal OR remittance OR migrant OR Gulf OR Qatar OR UAE OR Malaysia OR Saudi OR foreign employment OR manpower OR overseas worker)",
    panel: "remittance",
  },
  {
    query:
      "(Nepal OR United Nations OR UN peacekeeping OR UNDP OR WHO OR UNHCR OR UN General Assembly OR multilateral OR SAARC)",
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

function gdeltArticleArray(data: unknown): GDELTArticle[] {
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  const raw = o.articles ?? o.article ?? o.ARTICLES;
  return Array.isArray(raw) ? (raw as GDELTArticle[]) : [];
}

/** Route generic RSS text into a desk panel (UN / remittance / diplomatic before broad South Asia). */
export function inferPanelFromText(title: string, snippet: string): GeopoliticsPanel {
  const t = `${title} ${snippet}`.toLowerCase();
  if (
    /\b(united nations|u\.n\.|un general|peacekeeping|undp|unhcr|unesco|who\b|multilateral|un summit)\b/.test(
      t
    )
  ) {
    return "un";
  }
  if (
    /\b(remittance|migrant worker|gulf|qatar|uae|dubai|malaysia|saudi|kuwait|foreign employment|manpower|overseas worker)\b/.test(
      t
    )
  ) {
    return "remittance";
  }
  if (
    /\b(embassy|diplomat|foreign minister|bilateral|ambassador|mofa|summit|treaty|diplomatic)\b/.test(t)
  ) {
    return "diplomatic";
  }
  return "south_asia";
}

function parseArticleDate(raw: string | undefined, fallbackIso: string): string {
  if (!raw?.trim()) return fallbackIso;
  const d = new Date(raw.trim());
  return Number.isNaN(d.getTime()) ? fallbackIso : d.toISOString();
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

function pushRssItem(
  seen: Set<string>,
  articles: GeopoliticsArticle[],
  opts: {
    title: string;
    link: string;
    pubDate?: string;
    contentSnippet?: string;
    fetchedAt: string;
    sourceLabel?: string;
  }
): void {
  const link = opts.link.trim();
  if (!link || seen.has(link)) return;
  try {
    new URL(link);
  } catch {
    return;
  }
  seen.add(link);
  const hay = `${opts.title} ${opts.contentSnippet ?? ""}`;
  const panel = inferPanelFromText(opts.title, hay);
  const id = `rss-${stableId(link)}`;
  const publishedAt = parseArticleDate(opts.pubDate, opts.fetchedAt);
  const source =
    opts.sourceLabel ??
    (link.includes("news.google.com") ? "Google News" : hostFromUrl(link));

  articles.push({
    id,
    title: opts.title.trim() || "No title",
    url: link,
    source,
    panel,
    tone: null,
    publishedAt,
    language: "en",
    imageUrl: null,
    fetchedAt: opts.fetchedAt,
  });
}

async function ingestRssFeed(
  feedUrl: string,
  fetchedAt: string,
  seen: Set<string>,
  articles: GeopoliticsArticle[],
  options?: { sourceLabel?: string; bbcAsiaFilter?: boolean }
): Promise<void> {
  try {
    const parser = new Parser();
    const feed = await parser.parseURL(feedUrl);
    const items = feed.items ?? [];
    let count = 0;
    for (const item of items) {
      if (count >= MAX_PER_RSS_FEED) break;
      const title = (item.title ?? "").trim();
      const link = (item.link ?? "").trim();
      const snippet = (item.contentSnippet ?? item.content ?? "").trim();
      const hay = `${title} ${snippet}`.toLowerCase();
      if (options?.bbcAsiaFilter) {
        if (
          !/\b(nepal|kathmandu|india|china|bangladesh|pakistan|sri lanka|bhutan|maldives|south asia|himalaya|kashmir)\b/i.test(
            hay
          )
        ) {
          continue;
        }
      }
      const before = articles.length;
      pushRssItem(seen, articles, {
        title,
        link,
        pubDate: (item as { isoDate?: string }).isoDate ?? (item as { pubDate?: string }).pubDate,
        contentSnippet: snippet,
        fetchedAt,
        sourceLabel: options?.sourceLabel,
      });
      if (articles.length > before) count++;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[gdelt-world] RSS feed failed (${feedUrl}):`, message);
  }
}

export async function fetchWorldArticles(): Promise<GeopoliticsArticle[]> {
  const fetchedAt = new Date().toISOString();
  const seen = new Set<string>();
  const articles: GeopoliticsArticle[] = [];

  for (const { query, panel } of QUERIES) {
    try {
      const url = `${GDELT_BASE}&query=${encodeURIComponent(query)}`;
      const res = await fetchWithTimeout(url, { timeout: GDELT_TIMEOUT_MS });
      if (!res.ok) continue;
      const data = (await res.json()) as unknown;
      const list = gdeltArticleArray(data);
      for (const art of list) {
        const link = art.url?.trim();
        if (!link || seen.has(link)) continue;
        seen.add(link);
        const id = `gdelt-${stableId(link)}`;
        const publishedAt = art.seendate
          ? parseArticleDate(art.seendate, fetchedAt)
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
      if (
        !haystack.includes("nepal") &&
        !haystack.includes("bangladesh") &&
        !haystack.includes("bhutan") &&
        !haystack.includes("south asia") &&
        !haystack.includes("asia-pacific")
      ) {
        continue;
      }
      const link = (item as { link?: string }).link?.trim();
      if (!link || seen.has(link)) continue;
      seen.add(link);
      const id = `un-${stableId(link)}`;
      const publishedAt = parseArticleDate(
        (item as { isoDate?: string }).isoDate ??
          (item as { pubDate?: string }).pubDate,
        fetchedAt
      );
      articles.push({
        id,
        title: title || "No title",
        url: link,
        source: "news.un.org",
        panel: inferPanelFromText(title, content),
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

  await ingestRssFeed(KATHMANDU_POST_RSS, fetchedAt, seen, articles);
  await ingestRssFeed(GOOGLE_NEWS_NEPAL_RSS, fetchedAt, seen, articles, {
    sourceLabel: "Google News",
  });
  await ingestRssFeed(BBC_ASIA_RSS, fetchedAt, seen, articles, {
    sourceLabel: "BBC News",
    bbcAsiaFilter: true,
  });

  return articles;
}
