import { parseHTML } from "linkedom";
import type { NepseSummary, NepseMarketStatus } from "@repo/shared";

const NEPSE_FETCH_TIMEOUT_MS = 10_000;
const MEROLAGANI_SUMMARY = "https://merolagani.com/MarketSummary.aspx";
const SHARESANSAR_INDEX = "https://www.sharesansar.com/nepse-index";

function parseNumber(s: string | null | undefined): number | null {
  if (s == null || s === "") return null;
  const cleaned = String(s).replace(/,/g, "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function isNepalMarketOpen(date: Date): boolean {
  const utcHours = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();
  const utcDay = date.getUTCDay();
  const utcTimeMins = utcHours * 60 + utcMinutes;
  const nptOffsetMins = 5 * 60 + 45;
  const nptTimeMins = utcTimeMins + nptOffsetMins;
  const nptHours = Math.floor(nptTimeMins / 60) % 24;
  const nptDay = nptTimeMins >= 24 * 60 ? (utcDay + 1) % 7 : utcDay;
  const isWeekday = nptDay >= 0 && nptDay <= 4;
  return isWeekday && nptHours >= 11 && nptHours < 15;
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

function parseMerolagani(html: string, scrapedAt: string): NepseSummary | null {
  const { document } = parseHTML(html);
  let index: number | null = null;
  let change: number | null = null;
  let changePercent: number | null = null;
  let totalTurnover: number | null = null;
  const gainers: Array<{ symbol: string; price: number; changePercent: number }> = [];
  const losers: Array<{ symbol: string; price: number; changePercent: number }> = [];

  const tables = document.querySelectorAll("table");
  for (const table of tables) {
    const text = table.textContent ?? "";
    const rows = table.querySelectorAll("tr");

    for (const row of rows) {
      const cells = row.querySelectorAll("td, th");
      const cellTexts = Array.from(cells).map((c) => (c.textContent ?? "").trim());

      if (
        text.includes("NEPSE") ||
        text.includes("Index") ||
        cellTexts.some((t) => t.includes("NEPSE") || t.includes("Index"))
      ) {
        for (let i = 0; i < cellTexts.length; i++) {
          const num = parseNumber(cellTexts[i]);
          if (num !== null && num > 100 && num < 100_000) {
            if (index === null) index = num;
            else if (change === null && Math.abs(num) < 1000) change = num;
            else if (changePercent === null && Math.abs(num) < 100) changePercent = num;
          }
        }
      }

      if (
        text.includes("Turnover") ||
        cellTexts.some((t) => t.toLowerCase().includes("turnover"))
      ) {
        for (const t of cellTexts) {
          const n = parseNumber(t);
          if (n !== null && n > 1_000_000) {
            totalTurnover = n;
            break;
          }
        }
      }
    }
  }

  const allTables = document.querySelectorAll("table");
  for (const table of allTables) {
    const header = (table.querySelector("thead") ?? table).textContent ?? "";
    const isGainers = header.toLowerCase().includes("gainer");
    const isLosers = header.toLowerCase().includes("loser");
    if (!isGainers && !isLosers) continue;

    const rows = table.querySelectorAll("tbody tr, tr");
    const target = isGainers ? gainers : losers;
    if (target.length >= 5) continue;

    for (const row of rows) {
      if (target.length >= 5) break;
      const cells = row.querySelectorAll("td");
      if (cells.length < 2) continue;
      const symbolCell = cells[0]?.textContent?.trim() ?? "";
      const symbol = symbolCell.replace(/\s+/g, " ").trim().slice(0, 20);
      if (!symbol || symbol.length < 2) continue;
      let price: number | null = null;
      let pct: number | null = null;
      for (let i = 1; i < cells.length; i++) {
        const val = parseNumber(cells[i]?.textContent);
        if (val !== null) {
          if (val >= 1 && val < 1e6 && (price === null || val > price)) price = val;
          if (Math.abs(val) <= 100 && pct === null) pct = val;
        }
      }
      if (symbol && price !== null && pct !== null) {
        target.push({ symbol, price, changePercent: pct });
      }
    }
  }

  if (index === null || index === 0) return null;

  const marketStatus: NepseMarketStatus = isNepalMarketOpen(
    new Date(scrapedAt)
  )
    ? "open"
    : "closed";

  return {
    sourceId: "nepse",
    sourceName: "Merolagani",
    timestamp: scrapedAt,
    index,
    change: change ?? null,
    changePercent: changePercent ?? null,
    totalTurnover: totalTurnover ?? undefined,
    marketStatus,
    topGainers: gainers.length > 0 ? gainers.slice(0, 5) : undefined,
    topLosers: losers.length > 0 ? losers.slice(0, 5) : undefined,
  };
}

function parseSharesansar(html: string, scrapedAt: string): NepseSummary | null {
  const { document } = parseHTML(html);
  let index: number | null = null;
  let change: number | null = null;
  let changePercent: number | null = null;
  let totalTurnover: number | null = null;
  const gainers: Array<{ symbol: string; price: number; changePercent: number }> = [];
  const losers: Array<{ symbol: string; price: number; changePercent: number }> = [];

  const body = document.body?.innerHTML ?? "";
  const numMatch = body.match(/NEPSE[\s\S]*?(\d{4}\.?\d*)/i);
  if (numMatch) {
    index = parseNumber(numMatch[1]);
  }
  if (index === null) {
    const allNums = body.match(/\b(2\d{3}\.?\d*)\b/g);
    if (allNums?.length) index = parseNumber(allNums[0]);
  }
  if (index === null || index === 0) return null;

  const marketStatus: NepseMarketStatus = isNepalMarketOpen(
    new Date(scrapedAt)
  )
    ? "open"
    : "closed";

  return {
    sourceId: "nepse",
    sourceName: "Sharesansar",
    timestamp: scrapedAt,
    index,
    change,
    changePercent,
    totalTurnover: totalTurnover ?? undefined,
    marketStatus,
    topGainers: gainers.length > 0 ? gainers.slice(0, 5) : undefined,
    topLosers: losers.length > 0 ? losers.slice(0, 5) : undefined,
  };
}

/**
 * NEPSE (Nepal Stock Exchange) daily index and top movers.
 * Primary: Merolagani; fallback: Sharesansar.
 */
export async function fetchNepseSummary(): Promise<NepseSummary> {
  const scrapedAt = new Date().toISOString();

  try {
    const res = await fetchWithTimeout(MEROLAGANI_SUMMARY, {
      timeout: NEPSE_FETCH_TIMEOUT_MS,
    });
    if (!res.ok) throw new Error(`Merolagani ${res.status}`);
    const html = await res.text();
    const parsed = parseMerolagani(html, scrapedAt);
    if (parsed) return parsed;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[nepse] Merolagani fetch/parse failed:", message);
  }

  try {
    const res = await fetchWithTimeout(SHARESANSAR_INDEX, {
      timeout: NEPSE_FETCH_TIMEOUT_MS,
    });
    if (!res.ok) throw new Error(`Sharesansar ${res.status}`);
    const html = await res.text();
    const parsed = parseSharesansar(html, scrapedAt);
    if (parsed) return parsed;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[nepse] Sharesansar fetch/parse failed:", message);
  }

  return {
    sourceId: "nepse",
    sourceName: "NEPSE (unavailable)",
    timestamp: scrapedAt,
    index: 0,
    change: null,
    changePercent: null,
    marketStatus: "closed",
  };
}
