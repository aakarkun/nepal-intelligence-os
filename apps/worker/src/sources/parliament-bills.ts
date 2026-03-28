import { parseHTML } from "linkedom";
import type { LegislativeBillRow } from "@repo/shared";
import { env } from "../env";
import { postLegislativeBill } from "../ingest-client";

const PARLIAMENT_BILLS_URL = "https://hr.parliament.gov.np/en/bills";

/** HoR bills page — SSL chain issues are common; Bun fetch with tls relaxed. */
export async function runParliamentBillsScrape(): Promise<void> {
  console.warn(
    "[parliament-bills] Fetching HoR bills (TLS verify off for hr.parliament.gov.np — review quarterly)"
  );
  try {
    const res = await fetch(PARLIAMENT_BILLS_URL, {
      // @ts-expect-error Bun supports tls on fetch
      tls: { rejectUnauthorized: false },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; NepalIntelligenceOS/1.0; +https://github.com/nepal-intelligence-os)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) {
      console.warn("[parliament-bills] HTTP", res.status);
      return;
    }
    const html = await res.text();
    const { document } = parseHTML(html);
    const rows = document.querySelectorAll("table tbody tr");
    const now = new Date().toISOString();
    let n = 0;
    for (const tr of rows) {
      const cells = tr.querySelectorAll("td");
      if (cells.length < 3) continue;
      const billNumber = cells[0]?.textContent?.trim() ?? "";
      const title = cells[1]?.textContent?.trim() ?? "";
      const statusText = cells[2]?.textContent?.trim().toLowerCase() ?? "";
      if (!billNumber || !title) continue;
      const status = mapStatus(statusText);
      const id = `bill-${hashString(billNumber)}`;
      const row: LegislativeBillRow = {
        id,
        billNumber,
        title,
        status,
        introducedBy: null,
        introducedAt: null,
        updatedAt: now,
        sourceUrl: PARLIAMENT_BILLS_URL,
        partyId: null,
        rawExcerpt: statusText.slice(0, 500),
      };
      const ok = await postLegislativeBill(env.API_URL, row);
      if (ok) n++;
    }
    console.log(`[parliament-bills] Upserted ${n} bill row(s)`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[parliament-bills] Scrape failed:", msg);
  }
}

function mapStatus(t: string): string {
  if (t.includes("pass") && t.includes("hor")) return "passed_hor";
  if (t.includes("pass") && t.includes("na")) return "passed_na";
  if (t.includes("enact") || t.includes("gazette")) return "enacted";
  if (t.includes("committee")) return "committee";
  if (t.includes("reject")) return "rejected";
  if (t.includes("register")) return "registered";
  return "registered";
}

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}
