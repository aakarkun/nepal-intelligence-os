import type { SignalEvent, SignalSeverity, SignalEventType } from "@repo/shared";
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

// First match wins — order: disaster, security, political, economic, diplomatic, health, then news.
// Nepali (Devanagari) keywords included for News Room articles in Nepali.
const DISASTER_PATTERNS =
  /(?:earthquake|भूकम्प|flood|बाढी|landslide|पहिरो|DHM|NDRRMA|cyclone|wildfire|fire\s*alert|relief|evacuation|evacuat|USGS|seismic|disaster|magnitude)/i;
const SECURITY_PATTERNS =
  /(?:protest|बन्द|bandh|strike|हड्ताल|police|प्रहरी|border|सीमा|armed|conflict|curfew|bomb|blast|security\s*forces)/i;
const POLITICAL_PATTERNS =
  /(?:cabinet|मन्त्रिपरिषद्|parliament|संसद|ordinance|no-confidence|coalition|गठबन्धन|minister|मन्त्री|prime\s*minister|प्रधानमन्त्री|election|निर्वाचन|party|राजनीतिक|vote|constituency)/i;
const ECONOMIC_PATTERNS =
  /(?:NRB|राष्ट्र\s*बैंक|NOC|NEPSE|inflation|मूल्यवृद्धि|remittance|रेमिट्यान्स|fuel|तेल|GDP|budget|बजेट|forex|trade|stock\s*market|interest\s*rate|rupee|dollar|tax)/i;
const DIPLOMATIC_PATTERNS =
  /(?:MEA|embassy|दूतावास|treaty|सन्धि|bilateral|visit|राजदूत|ambassador|foreign\s*minister|diplomatic|United\s*Nations|UN\b|SAARC|China|India\s*relation)/i;
const HEALTH_PATTERNS =
  /(?:EDCD|outbreak|WHO|epidemic|महामारी|disease|अस्पताल|hospital|dengue|cholera|COVID|vaccination|health\s*ministry|स्वास्थ्य|vaccine)/i;

/**
 * Infers signal type from title and body using keyword matching.
 * Case-insensitive; first match wins (disaster before security before political, etc.).
 * Defaults to "news" when no category matches. Pure function — no side effects.
 */
export function inferSignalType(title: string, body: string): SignalEventType {
  const text = `${title} ${body}`;
  if (DISASTER_PATTERNS.test(text)) return "disaster";
  if (SECURITY_PATTERNS.test(text)) return "security";
  if (POLITICAL_PATTERNS.test(text)) return "political";
  if (ECONOMIC_PATTERNS.test(text)) return "economic";
  if (DIPLOMATIC_PATTERNS.test(text)) return "diplomatic";
  if (HEALTH_PATTERNS.test(text)) return "health";
  return "news";
}

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
      type: inferSignalType(title, body),
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
