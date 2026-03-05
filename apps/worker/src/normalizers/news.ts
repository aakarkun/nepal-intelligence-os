import type { SignalEvent } from "@repo/shared";
import type { NewsRawItem } from "../sources/news";

function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

export function normalizeNewsToEvents(
  items: NewsRawItem[],
  sourceId: string,
  sourceName: string
): SignalEvent[] {
  const now = new Date().toISOString();
  const events: SignalEvent[] = [];

  for (const item of items) {
    const id = `news-${simpleHash((item.title ?? "") + (item.link ?? ""))}`;
    const timestamp = item.pubDate
      ? new Date(item.pubDate).toISOString()
      : now;
    events.push({
      id,
      type: "news",
      severity: "info",
      title: item.title ?? "Untitled",
      body: item.description ?? item.title ?? "",
      timestamp,
      source: sourceName,
      url: item.link,
    });
  }

  return events;
}
