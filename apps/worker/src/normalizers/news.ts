import type { SignalEvent, SignalSeverity } from "@repo/shared";
import type { NewsRawItem } from "../sources/news";
import { extractEntities } from "./entities";

function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

const CRITICAL_PATTERNS = /\b(emergency|crisis|alert|catastrophe|disaster|evacuat|magnitude\s*[6-9]\.?\d*|m\s*[6-9]\.?\d*)/i;
const WARNING_PATTERNS = /\b(protest|strike|blockade|curfew|violence|clash|arson|bandh)/i;

/**
 * Infers signal severity from title and body using keyword matching.
 * Used when normalizing news/social to events so severity is set consistently.
 */
export function inferSeverity(title: string, body: string): SignalSeverity {
  const text = `${title} ${body}`;
  if (CRITICAL_PATTERNS.test(text)) return "critical";
  if (WARNING_PATTERNS.test(text)) return "warning";
  return "info";
}

export function normalizeNewsToEvents(
  items: NewsRawItem[],
  sourceId: string,
  sourceName: string
): SignalEvent[] {
  const now = new Date().toISOString();
  const events: SignalEvent[] = [];

  for (const item of items) {
    const title = item.title ?? "Untitled";
    const body = item.description ?? item.title ?? "";
    const id = `news-${simpleHash(title + (item.link ?? ""))}`;
    const timestamp = item.pubDate
      ? new Date(item.pubDate).toISOString()
      : now;
    const entities = extractEntities(`${title} ${body}`);
    const event: SignalEvent = {
      id,
      type: "news",
      severity: inferSeverity(title, body),
      title,
      body,
      timestamp,
      source: sourceName,
      url: item.link,
    };
    if (
      entities.parties.length > 0 ||
      entities.districts.length > 0 ||
      entities.people.length > 0
    ) {
      event.entities = entities;
    }
    events.push(event);
  }

  return events;
}
