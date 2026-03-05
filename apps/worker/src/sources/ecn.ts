/**
 * ECN (Election Commission of Nepal) source: fetch and parse raw HTML.
 * Base URL and paths may need adjustment when ECN site structure is known.
 */

import { parseHTML } from "linkedom";

const DEFAULT_BASE_URL = "https://election.gov.np";

export type EcnRawResult = {
  summaries?: unknown[];
  constituencies?: unknown[];
};

/**
 * Fetches the ECN results page (or configured URL) and returns raw HTML.
 */
export async function fetchEcnRaw(options?: {
  baseUrl?: string;
}): Promise<{ html: string; url: string }> {
  const baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;
  const url = baseUrl.replace(/\/$/, "");

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "NepalIntelligenceOS/1.0 (election monitoring; +https://github.com/nepal-intelligence-os)",
    },
  });

  if (!res.ok) {
    throw new Error(`ECN fetch failed: ${res.status} ${res.statusText} for ${url}`);
  }

  const html = await res.text();
  return { html, url };
}

/**
 * Parses raw ECN HTML into placeholder structures.
 * Returns empty arrays until ECN page structure is mapped to tables/selectors.
 */
export function parseEcnRaw(html: string): EcnRawResult {
  try {
    const { document } = parseHTML(html);

    const summaries: unknown[] = [];
    const constituencies: unknown[] = [];

    const tables = document.querySelectorAll("table");
    for (const table of tables) {
      const rows = table.querySelectorAll("tr");
      if (rows.length === 0) continue;
      for (const row of rows) {
        const cells = row.querySelectorAll("td, th");
        if (cells.length > 0) {
          const rowData = Array.from(cells).map((c) => (c as Element).textContent?.trim() ?? "");
          if (rowData.some(Boolean)) {
            constituencies.push({ cells: rowData });
          }
        }
      }
    }

    return { summaries, constituencies };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`ECN parse failed: ${message}`);
  }
}
