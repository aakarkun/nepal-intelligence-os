/**
 * GDELT source: fetch JSON article lists and convert to SignalEvents.
 *
 * Used in both the News Room (type: "news") and Signals feed (type: "note").
 */

import type { SignalEvent } from "@repo/shared";

const GDELT_BASE_URL =
  process.env.GDELT_BASE_URL ?? "https://api.gdeltproject.org/api/v2";

const GDELT_ARTICLES_ENDPOINT =
  process.env.GDELT_ARTICLES_ENDPOINT ?? "/doc/doc";

type GdeltArticle = {
  url?: string;
  url_mobile?: string;
  title?: string;
  seendate?: string;
  socialimage?: string;
  domain?: string;
  language?: string;
  sourcecountry?: string;
};

type GdeltResponse = {
  articles?: GdeltArticle[];
};

function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

async function fetchGdeltEventsFromQuery(options: {
  query: string;
  sourceName: string;
  type: "news" | "signal";
  maxrecords?: number;
}): Promise<SignalEvent[]> {
  const { query, sourceName, type, maxrecords = 100 } = options;

  const url = new URL(GDELT_BASE_URL + GDELT_ARTICLES_ENDPOINT);
  url.searchParams.set("query", query);
  url.searchParams.set("mode", "artlist");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", String(maxrecords));
  url.searchParams.set("sort", "datedesc");

  let json: GdeltResponse;
  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      console.warn(
        "[gdelt] API error",
        sourceName,
        res.status,
        res.statusText
      );
      return [];
    }
    json = (await res.json()) as GdeltResponse;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[gdelt] Fetch failed for", sourceName, ":", message);
    return [];
  }

  const articles = json.articles ?? [];
  const nowIso = new Date().toISOString();

  const events: SignalEvent[] = [];
  for (const a of articles) {
    const idSource = a.url ?? a.title ?? Math.random().toString(36);
    const id = `gdelt-${type}-${simpleHash(idSource)}`;
    let timestamp = nowIso;
    if (a.seendate) {
      const d = new Date(a.seendate);
      if (!Number.isNaN(d.getTime())) {
        timestamp = d.toISOString();
      }
    }

    const parts: string[] = [];
    if (a.domain || a.sourcecountry) {
      const meta = [a.domain, a.sourcecountry].filter(Boolean).join(" • ");
      if (meta) parts.push(meta);
    }
    if (a.language) {
      parts.push(`Language: ${a.language}`);
    }

    const body = parts.length > 0 ? parts.join("\n") : a.title ?? "";

    events.push({
      id,
      type: type === "news" ? "news" : "note",
      severity: "info",
      title: a.title ?? a.url ?? "Untitled",
      body,
      timestamp,
      source: sourceName,
      url: a.url ?? a.url_mobile,
    });
  }

  return events;
}

// ─── Public helpers used in worker index ──────────────────────────────────────

export async function fetchGdeltNewsEvents(): Promise<SignalEvent[]> {
  return fetchGdeltEventsFromQuery({
    // Focus news on election- and protest-related coverage about Nepal
    // to avoid unrelated international articles that merely mention "Nepal".
    query:
      "(nepal) (election OR vote OR ballot OR counting OR polling station OR protest OR bandh OR strike OR clash OR rally)",
    sourceName: "GDELT — Nepal election & protest news",
    type: "news",
    maxrecords: 100,
  });
}

export async function fetchGdeltSignalEvents(): Promise<SignalEvent[]> {
  const configs = [
    {
      query:
        "(nepal OR kathmandu) (protest OR bandh OR strike OR riot OR clash)",
      sourceName: "GDELT — Nepal protest",
    },
    {
      query:
        "(nepal) (election OR vote OR ballot OR counting OR polling station)",
      sourceName: "GDELT — Nepal election",
    },
    {
      query:
        "(nepal) (earthquake OR flood OR landslide OR disaster OR rescue)",
      sourceName: "GDELT — Nepal disaster",
    },
  ];

  const chunks: SignalEvent[][] = [];
  for (const cfg of configs) {
    const events = await fetchGdeltEventsFromQuery({
      query: cfg.query,
      sourceName: cfg.sourceName,
      type: "signal",
      maxrecords: 50,
    });
    chunks.push(events);
  }

  return chunks.flat();
}

