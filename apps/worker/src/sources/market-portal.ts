import { parseHTML } from "linkedom";
import type { MarketPortalSnapshot } from "@repo/shared";

const PORTAL_HOME = "https://www.sharesansar.com/";
const UA =
  "Mozilla/5.0 (compatible; NepalIntelligenceOS/1.0; +https://github.com/nepal-intelligence-os)";
const TIMEOUT_MS = 15_000;

function parseNumberLoose(s: string | null | undefined): number | null {
  if (s == null || s === "") return null;
  const cleaned = String(s).replace(/,/g, "").replace(/Rs\.?\s*/gi, "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseRsAmount(s: string): number | null {
  const m = s.match(/[\d,]+(?:\.\d+)?/);
  if (!m) return null;
  return parseNumberLoose(m[0]);
}

function extractCsrf(html: string): string | null {
  const m = html.match(/name="_token"\s+content="([^"]+)"/i);
  return m?.[1] ?? null;
}

function cookieHeaderFromSetCookie(res: Response): string {
  const getSetCookie = res.headers.getSetCookie?.() ?? [];
  if (getSetCookie.length === 0) {
    const single = res.headers.get("set-cookie");
    if (single) return single.split(",").map((p) => p.split(";")[0].trim()).join("; ");
    return "";
  }
  return getSetCookie.map((c) => c.split(";")[0].trim()).join("; ");
}

async function fetchText(
  url: string,
  init: RequestInit & { cookie?: string } = {}
): Promise<{ text: string; response: Response }> {
  const { cookie, ...rest } = init;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        ...(cookie ? { Cookie: cookie } : {}),
        ...(rest.headers as Record<string, string>),
      },
    });
    const text = await res.text();
    return { text, response: res };
  } finally {
    clearTimeout(id);
  }
}

function parseSubIndicesFromHomepage(html: string): {
  asOf: string | undefined;
  rows: MarketPortalSnapshot["subIndices"];
} {
  const { document } = parseHTML(html);
  let asOf: string | undefined;
  const h5s = document.querySelectorAll("h5");
  for (const h of h5s) {
    const t = h.textContent ?? "";
    if (t.includes("As of")) {
      const span = h.querySelector(".text-org");
      const d = span?.textContent?.trim();
      if (d) asOf = d;
      break;
    }
  }

  const rows: MarketPortalSnapshot["subIndices"] = [];
  for (const table of document.querySelectorAll("table")) {
    const thead = table.querySelector("thead");
    if (!thead?.textContent?.includes("Sub-Indices")) continue;

    const trList = [...table.querySelectorAll("tr")].slice(1);
    for (const tr of trList) {
      const cells = tr.querySelectorAll("td");
      if (cells.length < 10) continue;
      const name = (cells[0]?.textContent ?? "").replace(/\s+/g, " ").trim();
      if (!name) continue;
      const nums = [
        parseNumberLoose(cells[1]?.textContent),
        parseNumberLoose(cells[2]?.textContent),
        parseNumberLoose(cells[3]?.textContent),
        parseNumberLoose(cells[4]?.textContent),
        parseNumberLoose(cells[5]?.textContent),
        parseNumberLoose(cells[6]?.textContent),
        parseNumberLoose(cells[7]?.textContent),
        parseNumberLoose(cells[8]?.textContent),
        parseNumberLoose(cells[9]?.textContent),
      ];
      if (nums.some((n) => n == null)) continue;
      rows.push({
        name,
        open: nums[0]!,
        high: nums[1]!,
        low: nums[2]!,
        close: nums[3]!,
        turnover: nums[4]!,
        pointChange: nums[5]!,
        changePercent: nums[6]!,
        week52High: nums[7]!,
        week52Low: nums[8]!,
      });
    }
    break;
  }

  return { asOf, rows };
}

function parseMainIndicesFragment(html: string): {
  asOf: string | undefined;
  rows: MarketPortalSnapshot["mainIndices"];
  turnover: number | undefined;
  nepseConfidence: number | null;
  nepseConfidenceChange: number | null;
} {
  const asOfMatch = html.match(/As of <span[^>]*>([^<]+)<\/span>/i);
  const asOf = asOfMatch?.[1]?.trim();

  const { document } = parseHTML(html);
  const table = document.querySelector("table");
  const rows: MarketPortalSnapshot["mainIndices"] = [];
  let turnover: number | undefined;
  let nepseConfidence: number | null = null;
  let nepseConfidenceChange: number | null = null;

  if (!table) {
    return { asOf, rows, turnover, nepseConfidence, nepseConfidenceChange };
  }

  for (const tr of table.querySelectorAll("tbody tr")) {
    const ths = tr.querySelectorAll("th");
    const tds = tr.querySelectorAll("td");
    if (ths.length >= 2 && tds.length === 0) {
      const label = (ths[0]?.textContent ?? "").trim();
      if (label === "Turnover" && ths.length >= 2) {
        const raw = ths[ths.length - 1]?.textContent ?? "";
        const n = parseRsAmount(raw);
        if (n != null) turnover = n;
      }
      if (ths[0]?.querySelector("a")?.textContent?.includes("Confidence")) {
        const c = parseNumberLoose(ths[1]?.textContent);
        const ch = parseNumberLoose(ths[2]?.textContent);
        nepseConfidence = c;
        nepseConfidenceChange = ch;
      }
      continue;
    }

    if (tds.length >= 3) {
      const name = (tds[0]?.textContent ?? "").replace(/\s+/g, " ").trim();
      const close = parseNumberLoose(tds[1]?.textContent);
      const pt = parseNumberLoose(tds[2]?.textContent);
      if (name && close != null) {
        rows.push({ name, close, pointChange: pt });
      }
    }
  }

  return { asOf, rows, turnover, nepseConfidence, nepseConfidenceChange };
}

function parseForexFragment(html: string): {
  asOf: string | undefined;
  rows: MarketPortalSnapshot["forex"];
} {
  const asOfMatch = html.match(/As of <span[^>]*>([^<]+)<\/span>/i);
  const asOf = asOfMatch?.[1]?.trim();
  const rows: MarketPortalSnapshot["forex"] = [];
  const { document } = parseHTML(html);
  const table = document.querySelector("table");
  if (!table) return { asOf, rows };

  for (const tr of table.querySelectorAll("tbody tr")) {
    const tds = tr.querySelectorAll("td");
    if (tds.length < 3) continue;
    const code = (tds[0]?.textContent ?? "").trim();
    const buy = parseNumberLoose(tds[1]?.textContent);
    const sell = parseNumberLoose(tds[2]?.textContent);
    if (!code || buy == null || sell == null) continue;
    rows.push({ currencyCode: code, buy, sell });
  }
  return { asOf, rows };
}

function parseMetalsFragment(html: string): {
  asOf: string | undefined;
  rows: MarketPortalSnapshot["metals"];
} {
  const asOfMatch = html.match(/As of <span[^>]*>([^<]+)<\/span>/i);
  const asOf = asOfMatch?.[1]?.trim();
  const rows: MarketPortalSnapshot["metals"] = [];
  const { document } = parseHTML(html);
  const table = document.querySelector("table");
  if (!table) return { asOf, rows };

  for (const tr of table.querySelectorAll("tbody tr")) {
    const tds = tr.querySelectorAll("td");
    if (tds.length < 3) continue;
    const name = (tds[0]?.textContent ?? "").replace(/\s+/g, " ").trim();
    const price = parseNumberLoose(tds[1]?.textContent);
    const ch = parseNumberLoose(tds[2]?.textContent);
    if (!name || price == null || ch == null) continue;
    rows.push({ name, price, changeRs: ch });
  }
  return { asOf, rows };
}

function parseOilFragment(html: string): {
  asOf: string | undefined;
  rows: MarketPortalSnapshot["oil"];
} {
  const asOfMatch = html.match(/As of <span[^>]*>([^<]+)<\/span>/i);
  const asOf = asOfMatch?.[1]?.trim();
  const rows: MarketPortalSnapshot["oil"] = [];
  const { document } = parseHTML(html);
  const table = document.querySelector("table");
  if (!table) return { asOf, rows };

  for (const tr of table.querySelectorAll("tbody tr")) {
    const tds = tr.querySelectorAll("td");
    if (tds.length < 2) continue;
    const name = (tds[0]?.textContent ?? "").replace(/\s+/g, " ").trim();
    const priceText = (tds[1]?.textContent ?? "").replace(/\s+/g, " ").trim();
    if (name && priceText) rows.push({ name, priceText });
  }
  return { asOf, rows };
}

async function postFragment(
  path: string,
  cookie: string,
  csrf: string
): Promise<string> {
  const url = new URL(path, PORTAL_HOME).toString();
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Cookie: cookie,
        "X-CSRF-Token": csrf,
        Referer: PORTAL_HOME,
        "X-Requested-With": "XMLHttpRequest",
        Accept: "text/html, */*",
      },
    });
    if (!res.ok) throw new Error(`${path} ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(id);
  }
}

/**
 * Public portal homepage + POST fragments (session + CSRF).
 */
export async function fetchMarketPortalSnapshot(): Promise<MarketPortalSnapshot> {
  const scrapedAt = new Date().toISOString();
  const { text: homeHtml, response: homeRes } = await fetchText(PORTAL_HOME);
  const cookie = cookieHeaderFromSetCookie(homeRes);
  const csrf = extractCsrf(homeHtml);
  if (!csrf) throw new Error("Market portal: missing CSRF token");

  const sub = parseSubIndicesFromHomepage(homeHtml);

  const [indicesHtml, forexHtml, metalsHtml, oilHtml] = await Promise.all([
    postFragment("home-indices", cookie, csrf),
    postFragment("home-forex", cookie, csrf),
    postFragment("home-goldsilver", cookie, csrf),
    postFragment("home-oilprice", cookie, csrf),
  ]);

  const main = parseMainIndicesFragment(indicesHtml);
  const fx = parseForexFragment(forexHtml);
  const metals = parseMetalsFragment(metalsHtml);
  const oil = parseOilFragment(oilHtml);

  return {
    sourceId: "economy:market-portal",
    sourceName: "Market portal",
    timestamp: scrapedAt,
    subIndicesAsOf: sub.asOf,
    subIndices: sub.rows,
    mainIndicesAsOf: main.asOf,
    mainIndices: main.rows,
    mainIndicesTurnoverNpr: main.turnover,
    nepseConfidence: main.nepseConfidence ?? undefined,
    nepseConfidenceChange: main.nepseConfidenceChange ?? undefined,
    forexAsOf: fx.asOf,
    forex: fx.rows,
    metalsAsOf: metals.asOf,
    metals: metals.rows,
    oilAsOf: oil.asOf,
    oil: oil.rows,
  };
}
