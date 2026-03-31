import { parseHTML } from "linkedom";
import type { ParliamentSession } from "@repo/shared";

const PARLIAMENT_FETCH_TIMEOUT_MS = 10_000;
const PARLIAMENT_URL = "https://www.parliament.gov.np";

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = PARLIAMENT_FETCH_TIMEOUT_MS, ...init } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; NepalIntelligenceOS/1.0; +https://github.com/nepal-intelligence-os)",
        ...(init.headers as Record<string, string>),
      },
    });
  } finally {
    clearTimeout(id);
  }
}

export async function fetchParliamentSession(): Promise<ParliamentSession | null> {
  try {
    const res = await fetchWithTimeout(PARLIAMENT_URL, {
      timeout: PARLIAMENT_FETCH_TIMEOUT_MS,
    });
    if (!res.ok) return null;
    const html = await res.text();
    return parseParliamentPage(html);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[parliament] Fetch failed:", message);
    return null;
  }
}

function parseParliamentPage(html: string): ParliamentSession | null {
  const scrapedAt = new Date().toISOString();
  const { document } = parseHTML(html);
  const body = document.body?.textContent ?? "";
  let sessionName = "Current Session";
  const sessionMatch = body.match(/session\s*[:\s]*([^\n]+)/i) ?? body.match(/(?:winter|summer|budget)\s+session\s*\d+/i);
  if (sessionMatch) sessionName = sessionMatch[1]?.trim() ?? sessionMatch[0] ?? sessionName;
  const billMatch = body.match(/(\d+)\s*bills?/i);
  const pendingBills = billMatch ? parseInt(billMatch[1], 10) : null;
  const status = /recess|prorogued|adjourned/i.test(body) ? "recess" : "active";
  const startMatch = body.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  const sessionStart = startMatch
    ? `${startMatch[1]}-${startMatch[2]!.padStart(2, "0")}-${startMatch[3]!.padStart(2, "0")}`
    : new Date().toISOString().slice(0, 10);
  return {
    sessionName,
    sessionStart,
    nextSittingDate: null,
    pendingBills: pendingBills !== null && Number.isFinite(pendingBills) ? pendingBills : null,
    status: status as ParliamentSession["status"],
    scrapedAt,
  };
}
