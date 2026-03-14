import Parser from "rss-parser";
import type { CabinetEvent } from "@repo/shared";

const RSS_NEPAL_FEED = "https://www.rss.gov.np/feed";
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
  const parser = new Parser();
  const events: CabinetEvent[] = [];
  try {
    const feed = await parser.parseURL(RSS_NEPAL_FEED);
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[rss-nepal] Fetch failed:", message);
  }
  return events;
}
