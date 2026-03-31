import { parseHTML } from "linkedom";
import type { NepseSummary, NepseMarketStatus, SignalEvent } from "@repo/shared";

/**
 * NEPSE has no official public API. **ShareSansar** is our primary trusted surface for market
 * figures for now (datewise indices table). We also fetch Merolagani Indices.aspx in parallel
 * and pick the fresher session (tie-break: turnover, then Merolagani).
 *
 * Future (same publisher, not wired yet): sharesansar.com homepage exposes richer blocks —
 * sub-indices OHLC, turnover, point, % change, 52w high/low, main indices, forex, gold/silver,
 * oil — suitable to scrape or extend into dedicated modules when product needs them.
 *
 * Alternative backends: unofficial clients for newweb.nepalstock.com (e.g. basic-bgnr/NepseUnofficialApi).
 * Scraping: rate-limit during market hours, use a proper User-Agent.
 */
const NEPSE_FETCH_TIMEOUT_MS = 10_000;
/** Static HTML datewise index table (Market Summary page has no index in static HTML). */
const MEROLAGANI_INDICES = "https://merolagani.com/Indices.aspx";
const SHARESANSAR_DATEWISE = "https://www.sharesansar.com/datewise-indices";

function parseNumber(s: string | null | undefined): number | null {
  if (s == null || s === "") return null;
  const cleaned = String(s).replace(/,/g, "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function extractMetric(text: string, labels: string[], asInt = false): number | null {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(`${escaped}\\s*[:\\-]?\\s*([0-9][0-9,]*(?:\\.[0-9]+)?)`, "i");
    const match = text.match(rx);
    if (!match) continue;
    const parsed = parseNumber(match[1]);
    if (parsed == null) continue;
    return asInt ? Math.round(parsed) : parsed;
  }
  return null;
}

const NPT_OFFSET_MINS = 5 * 60 + 45;

/** NPT date as YYYY-MM-DD (for holiday check). */
export function getNptDateString(date: Date): string {
  const nptOffsetMs = (5 * 60 + 45) * 60 * 1000;
  return new Date(date.getTime() + nptOffsetMs).toISOString().slice(0, 10);
}

/** NPT day of week (0 = Sunday … 6 = Saturday). Market runs Sun–Thu; closed Fri/Sat. */
export function getNepalDayOfWeek(date: Date): number {
  const utcTimeMins = date.getUTCHours() * 60 + date.getUTCMinutes();
  const nptTimeMins = utcTimeMins + NPT_OFFSET_MINS;
  const utcDay = date.getUTCDay();
  const nptDay = nptTimeMins >= 24 * 60 ? (utcDay + 1) % 7 : utcDay;
  return nptDay;
}

/** 11 AM – 3 PM NPT, Sun–Thu. Closed Friday/Saturday (Nepal weekend). */
export function isNepalMarketOpen(date: Date): boolean {
  const utcHours = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();
  const utcDay = date.getUTCDay();
  const utcTimeMins = utcHours * 60 + utcMinutes;
  const nptTimeMins = utcTimeMins + NPT_OFFSET_MINS;
  const nptHours = Math.floor(nptTimeMins / 60) % 24;
  const nptDay = nptTimeMins >= 24 * 60 ? (utcDay + 1) % 7 : utcDay;
  const isMarketDay = nptDay >= 0 && nptDay <= 4; // Sun–Thu
  return isMarketDay && nptHours >= 11 && nptHours < 15;
}

/** YYYY-MM-DD from ShareSansar datewise page (datepicker / "As of" heading). */
function parseSharesansarPageDate(html: string): string | null {
  const fromInput = html.match(/id="date"[^>]*value="(\d{4}-\d{2}-\d{2})"/i);
  if (fromInput?.[1]) return fromInput[1];
  const fromHeading = html.match(/As of\s*:\s*<[^>]+>\s*(\d{4}-\d{2}-\d{2})/i);
  return fromHeading?.[1] ?? null;
}

/** Session end instant for ShareSansar: live scrape during market, else assumed cash close. */
function sharesansarSessionEnd(dataAsOf: string | null, scrapedAt: string): string | undefined {
  if (!dataAsOf) return undefined;
  if (isNepalMarketOpen(new Date(scrapedAt))) return scrapedAt;
  return `${dataAsOf}T15:00:00+05:45`;
}

/** Same session-end rule for Merolagani Indices (row date only, no clock on page). */
function merolaganiIndicesSessionEnd(dataAsOf: string, scrapedAt: string): string {
  if (isNepalMarketOpen(new Date(scrapedAt))) return scrapedAt;
  return `${dataAsOf}T15:00:00+05:45`;
}

/** `2026/03/24` → `2026-03-24` */
function adSlashDateToIso(dateAd: string): string | null {
  const m = dateAd.trim().match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/**
 * Indices.aspx has no turnover; copy same-day liquidity stats from ShareSansar so
 * Merolagani can win on source preference instead of losing on missing turnover.
 */
function enrichMerolaganiFromShareSansar(
  ml: NepseSummary | null,
  ss: NepseSummary | null
): NepseSummary | null {
  if (!ml || !ss) return ml;
  if (!ml.dataAsOf || ml.dataAsOf !== ss.dataAsOf) return ml;
  if (ml.totalTurnover != null && ml.totalTurnover > 0) return ml;
  return {
    ...ml,
    totalTurnover: ss.totalTurnover,
    tradedShares: ml.tradedShares ?? ss.tradedShares,
    advancingIssues: ml.advancingIssues ?? ss.advancingIssues,
    decliningIssues: ml.decliningIssues ?? ss.decliningIssues,
    unchangedIssues: ml.unchangedIssues ?? ss.unchangedIssues,
  };
}

/** Prefer Merolagani when session and turnover tie (both aligned with ShareSansar). */
function sourcePreferenceRank(s: NepseSummary): number {
  return s.sourceName === "Merolagani" ? 1 : 0;
}

function pickLatestNepseSummary(
  candidates: NepseSummary[],
  scrapedAt: string
): NepseSummary | null {
  const valid = candidates.filter((c) => c.index > 0);
  if (valid.length === 0) return null;
  if (valid.length === 1) return valid[0];

  const marketOpen = isNepalMarketOpen(new Date(scrapedAt));
  const scrapedMs = Date.parse(scrapedAt);

  function sortKey(s: NepseSummary): [number, number, number] {
    const turnover = s.totalTurnover ?? 0;
    const pref = sourcePreferenceRank(s);
    if (marketOpen) {
      return [scrapedMs, turnover, pref];
    }
    let sessionMs = 0;
    if (s.sessionEnd) sessionMs = Date.parse(s.sessionEnd);
    else if (s.dataAsOf) sessionMs = Date.parse(`${s.dataAsOf}T15:00:00+05:45`);
    else sessionMs = Date.parse(s.timestamp);
    return [sessionMs, turnover, pref];
  }

  valid.sort((a, b) => {
    const [ma, ta, pa] = sortKey(a);
    const [mb, tb, pb] = sortKey(b);
    if (mb !== ma) return mb - ma;
    if (tb !== ta) return tb - ta;
    return pb - pa;
  });

  return valid[0] ?? null;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = NEPSE_FETCH_TIMEOUT_MS, ...init } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; NepalIntelligenceOS/1.0; +https://github.com/nepal-intelligence-os)",
        ...(init.headers as Record<string, string>),
      },
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Merolagani datewise NEPSE index (first row = latest). No turnover on this page.
 * Expects default view: NEPSE Index in the dropdown (server-rendered first page).
 */
function parseMerolaganiIndices(html: string, scrapedAt: string): NepseSummary | null {
  const { document } = parseHTML(html);
  const container =
    document.querySelector("#ctl00_ContentPlaceHolder1_divData") ?? document.body;
  const table =
    container.querySelector("table.table-bordered.table-striped.sortable") ??
    container.querySelector("table.table-bordered.table-striped") ??
    container.querySelector("table.sortable") ??
    container.querySelector("table.table");
  if (!table) return null;
  const firstRow = table.querySelector("tbody tr");
  if (!firstRow) return null;
  const cells = firstRow.querySelectorAll("td");
  if (cells.length < 5) return null;

  const dateAd = (cells[1]?.textContent ?? "").trim();
  const dataAsOf = adSlashDateToIso(dateAd);
  if (!dataAsOf) return null;

  const index = parseNumber(cells[2]?.textContent);
  const change = parseNumber(cells[3]?.textContent);
  const pctRaw = (cells[4]?.textContent ?? "").replace(/%/g, "").trim();
  const changePercent = parseNumber(pctRaw);

  if (index === null || index === 0) return null;

  const sessionEnd = merolaganiIndicesSessionEnd(dataAsOf, scrapedAt);
  const marketStatus: NepseMarketStatus = isNepalMarketOpen(new Date(scrapedAt))
    ? "open"
    : "closed";

  return {
    sourceId: "nepse",
    sourceName: "Merolagani",
    timestamp: scrapedAt,
    dataAsOf,
    sessionEnd,
    index,
    change: change ?? null,
    changePercent: changePercent ?? null,
    marketStatus,
  };
}

function parseSharesansarDatewise(html: string, scrapedAt: string): NepseSummary | null {
  const dataAsOf = parseSharesansarPageDate(html);
  const sessionEnd = sharesansarSessionEnd(dataAsOf, scrapedAt);
  const { document } = parseHTML(html);
  const pageText = (document.body?.textContent ?? "").replace(/\s+/g, " ").trim();
  const tradedShares = extractMetric(pageText, ["Traded Shares", "Total Shares"], false);
  const advancingIssues = extractMetric(pageText, ["Advance", "ADV"], true);
  const decliningIssues = extractMetric(pageText, ["Decline", "DEC"], true);
  const unchangedIssues = extractMetric(pageText, ["Unchanged", "UNCH"], true);
  const marketStatus: NepseMarketStatus = isNepalMarketOpen(new Date(scrapedAt))
    ? "open"
    : "closed";

  const tables = document.querySelectorAll("table");
  for (const table of tables) {
    const rows = table.querySelectorAll("tr");
    for (const row of rows) {
      const cells = row.querySelectorAll("td, th");
      if (cells.length < 4) continue;
      const cellTexts = Array.from(cells).map((c) => (c.textContent ?? "").trim());
      const label = (cellTexts[0] ?? "").toLowerCase();
      if (!label.includes("nepse") || !label.includes("index")) continue;

      const index = parseNumber(cellTexts[1]);
      const change = parseNumber(cellTexts[2]);
      const changePercent = parseNumber(cellTexts[3]);
      const totalTurnover = parseNumber(cellTexts[4] ?? null);

      if (index === null || index === 0) continue;
      return {
        sourceId: "nepse",
        sourceName: "ShareSansar",
        timestamp: scrapedAt,
        dataAsOf: dataAsOf ?? undefined,
        sessionEnd,
        index,
        change,
        changePercent,
        totalTurnover: totalTurnover ?? undefined,
        tradedShares: tradedShares ?? undefined,
        advancingIssues: advancingIssues ?? undefined,
        decliningIssues: decliningIssues ?? undefined,
        unchangedIssues: unchangedIssues ?? undefined,
        marketStatus,
      };
    }
  }

  return null;
}

/**
 * NEPSE (Nepal Stock Exchange) daily index and top movers.
 * Fetches ShareSansar + Merolagani in parallel; returns the fresher snapshot.
 */
export async function fetchNepseSummary(): Promise<NepseSummary> {
  const scrapedAt = new Date().toISOString();

  const [ssOutcome, mlOutcome] = await Promise.allSettled([
    (async () => {
      const res = await fetchWithTimeout(SHARESANSAR_DATEWISE, {
        timeout: NEPSE_FETCH_TIMEOUT_MS,
      });
      if (!res.ok) throw new Error(`ShareSansar ${res.status}`);
      const html = await res.text();
      return parseSharesansarDatewise(html, scrapedAt);
    })(),
    (async () => {
      const res = await fetchWithTimeout(MEROLAGANI_INDICES, {
        timeout: NEPSE_FETCH_TIMEOUT_MS,
      });
      if (!res.ok) throw new Error(`Merolagani ${res.status}`);
      const html = await res.text();
      return parseMerolaganiIndices(html, scrapedAt);
    })(),
  ]);

  const ssParsed =
    ssOutcome.status === "fulfilled" && ssOutcome.value ? ssOutcome.value : null;
  const mlParsed =
    mlOutcome.status === "fulfilled" && mlOutcome.value ? mlOutcome.value : null;

  const candidates: NepseSummary[] = [];
  if (ssOutcome.status === "rejected") {
    const message =
      ssOutcome.reason instanceof Error
        ? ssOutcome.reason.message
        : String(ssOutcome.reason);
    console.warn("[nepse] ShareSansar fetch/parse failed:", message);
  }
  if (mlOutcome.status === "rejected") {
    const message =
      mlOutcome.reason instanceof Error
        ? mlOutcome.reason.message
        : String(mlOutcome.reason);
    console.warn("[nepse] Merolagani fetch/parse failed:", message);
  }

  const mlEnriched = enrichMerolaganiFromShareSansar(mlParsed, ssParsed);
  if (ssParsed) candidates.push(ssParsed);
  if (mlEnriched) candidates.push(mlEnriched);

  const best = pickLatestNepseSummary(candidates, scrapedAt);
  if (best) {
    if (candidates.length > 1) {
      console.info(
        `[nepse] using ${best.sourceName} (picked freshest of ${candidates.map((c) => c.sourceName).join(", ")})`
      );
    }
    return best;
  }

  return {
    sourceId: "nepse",
    sourceName: "NEPSE",
    timestamp: scrapedAt,
    index: 0,
    change: null,
    changePercent: null,
    marketStatus: "closed",
  };
}

/**
 * Build a trading-signal event from NEPSE summary for the Signals Feed.
 * Surfaces index move and top movers with an "invest wisely" disclaimer.
 */
export function nepseToSignalEvent(summary: NepseSummary): SignalEvent {
  const ts = summary.timestamp;
  const id = `nepse-${ts.replace(/[^0-9]/g, "").slice(0, 14)}`;
  const idx = summary.index.toFixed(2);
  const changeStr =
    summary.change != null && summary.changePercent != null
      ? `${summary.change >= 0 ? "+" : ""}${summary.change.toFixed(2)} (${summary.changePercent >= 0 ? "+" : ""}${summary.changePercent.toFixed(2)}%)`
      : "—";
  const status = summary.marketStatus === "open" ? "Market open." : "Market closed.";
  const gainers =
    (summary.topGainers?.length ?? 0) > 0
      ? "Top gainers: " +
        (summary.topGainers ?? [])
          .slice(0, 3)
          .map((g) => `${g.symbol} ${g.changePercent >= 0 ? "+" : ""}${g.changePercent.toFixed(1)}%`)
          .join(", ") + "."
      : "";
  const losers =
    (summary.topLosers?.length ?? 0) > 0
      ? " Top losers: " +
        (summary.topLosers ?? [])
          .slice(0, 3)
          .map((l) => `${l.symbol} ${l.changePercent.toFixed(1)}%`)
          .join(", ") + "."
      : "";
  const title = `NEPSE ${idx} (${changeStr}) — ${status}`;
  const body = [gainers, losers].filter(Boolean).join("") + " This is not investment advice; invest wisely.";
  return {
    id,
    type: "economic",
    severity: "info",
    title,
    body,
    timestamp: ts,
    source: summary.sourceName,
  };
}
