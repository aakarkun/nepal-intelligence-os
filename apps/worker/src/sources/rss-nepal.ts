import Parser from "rss-parser";
import type { CabinetEvent } from "@repo/shared";

/**
 * Government RSS feed; paths vary. Verify before deploy, e.g.:
 *   curl -sI "https://www.rss.gov.np/feed"
 *   curl -sI "https://www.rss.gov.np/rss.xml"
 * Many Nepali government sites block default/node-fetch User-Agent; use browser-like.
 */
const RSS_NEPAL_USER_AGENT =
  "Mozilla/5.0 (compatible; NepalIntelligenceOS/1.0; +https://github.com/nepal-intelligence-os)";
const RSS_NEPAL_URLS = [
  "https://www.rss.gov.np/feed",
  "https://www.rss.gov.np/rss.xml",
  "https://www.rss.gov.np/rss",
  "https://www.rss.gov.np/feed/rss",
];
const CABINET_KEYWORDS = [
  "cabinet",
  "मन्त्रिपरिषद्",
  "minister",
  "मन्त्री",
  "council of ministers",
  "reshuffle",
  "appointment",
];

type CabinetEventType = CabinetEvent["type"];

function classifyType(title: string, summary: string): CabinetEventType {
  const text = `${title} ${summary}`.toLowerCase();
  if (/reshuffle|बदलाव|replacement/.test(text)) return "reshuffle";
  if (/appointment|नियुक्ति|मनोनयन/.test(text)) return "appointment";
  if (/meeting|बैठक|session|सत्र/.test(text)) return "meeting";
  return "other";
}

export async function fetchCabinetEvents(): Promise<CabinetEvent[]> {
  const parser = new Parser({
    headers: { "User-Agent": RSS_NEPAL_USER_AGENT },
  });
  const events: CabinetEvent[] = [];
  let lastError: string | null = null;
  for (const feedUrl of RSS_NEPAL_URLS) {
    try {
      const feed = await parser.parseURL(feedUrl);
      const items = feed.items ?? [];
      for (const item of items) {
        const title = (item.title ?? "").trim();
        const summary = (item.contentSnippet ?? item.content ?? "").trim().slice(0, 500);
        const haystack = `${title} ${summary}`.toLowerCase();
        const hasKeyword = CABINET_KEYWORDS.some((kw) =>
          haystack.includes(kw.toLowerCase())
        );
        if (!hasKeyword) continue;
        const publishedAt =
          (item as { isoDate?: string }).isoDate ??
          (item as { pubDate?: string }).pubDate ??
          new Date().toISOString();
        const url = (item as { link?: string }).link;
        const id = `rss-nepal-${Buffer.from(`${title}-${publishedAt}`).toString("base64url").slice(0, 48)}`;
        const keywords = CABINET_KEYWORDS.filter((kw) =>
          haystack.includes(kw.toLowerCase())
        );
        events.push({
          id,
          title,
          summary,
          publishedAt,
          source: "RSS Nepal",
          type: classifyType(title, summary),
          keywords,
          ...(url ? { url } : {}),
        });
        if (events.length >= 20) break;
      }
      return events;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      lastError = message;
      console.warn("[rss-nepal] Fetch failed for", feedUrl, message);
    }
  }
  if (lastError) console.warn("[rss-nepal] All feed URLs failed. Verify with curl before deploy.");
  return events;
}
