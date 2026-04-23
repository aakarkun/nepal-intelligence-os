export type UpcomingIssuesCategory =
  | "ipo"
  | "right"
  | "fpo"
  | "ipo-local"
  | "mutual-fund"
  | "bonds-debentures"
  | "ipo-migrant-workers"
  | "ipo-for-qiis";

export type UpcomingIssueRow = {
  category: UpcomingIssuesCategory;
  sn: number;
  symbol: string;
  company: string;
  units: number;
  sector: string;
  remark: string;
  sourceUrl?: string | null;
  fetchedAt?: string;
  updatedAt?: string;
};

import { parseHTML } from "linkedom";

const SHARESANSAR_TYPE_TO_CATEGORY: Record<number, UpcomingIssuesCategory> = {
  1: "ipo",
  2: "right",
  3: "fpo",
  4: "ipo-local",
  5: "mutual-fund",
  6: "bonds-debentures",
  7: "ipo-migrant-workers",
  8: "ipo-for-qiis",
} as const;

const CATEGORY_LABEL_TO_SLUG: Array<[string, UpcomingIssuesCategory]> = [
  ["ipo", "ipo"],
  ["right", "right"],
  ["fpo", "fpo"],
  ["ipo-local", "ipo-local"],
  ["ipo local", "ipo-local"],
  ["mutual fund", "mutual-fund"],
  ["mutual-fund", "mutual-fund"],
  ["bonds/debentures", "bonds-debentures"],
  ["bonds & debentures", "bonds-debentures"],
  ["bonds-debentures", "bonds-debentures"],
  ["ipo to migrant workers", "ipo-migrant-workers"],
  ["migrant workers", "ipo-migrant-workers"],
  ["ipo-migrant-workers", "ipo-migrant-workers"],
  ["ipo for qii", "ipo-for-qiis"],
  ["ipo for qiis", "ipo-for-qiis"],
  ["qii", "ipo-for-qiis"],
  ["ipo-for-qiis", "ipo-for-qiis"],
];

function normalizeText(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .replace(/[’']/g, "'")
    .trim()
    .toLowerCase();
}

function normalizeCategory(label: string | null | undefined): UpcomingIssuesCategory | null {
  const n = normalizeText(label ?? "");
  if (!n) return null;
  for (const [needle, slug] of CATEGORY_LABEL_TO_SLUG) {
    if (n === needle || n.includes(needle)) return slug;
  }
  return null;
}

function parseUnits(input: string): number {
  const cleaned = normalizeText(input).replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function inferHeaderMap(headers: string[]): {
  sn?: number;
  symbol?: number;
  company?: number;
  units?: number;
  sector?: number;
  remark?: number;
} {
  const norm = headers.map(normalizeText);
  const idx = (pred: (h: string) => boolean) => norm.findIndex(pred);
  return {
    sn: idx((h) => h === "sn" || h === "s.n." || h === "s.n" || h.includes("s.n")),
    symbol: idx((h) => h === "symbol" || h.includes("sym")),
    company: idx((h) => h === "company" || h.includes("company") || h.includes("name")),
    units: idx((h) => h === "units" || h.includes("unit") || h.includes("qty")),
    sector: idx((h) => h === "sector" || h.includes("sector")),
    remark: idx((h) => h === "remark" || h.includes("remark") || h.includes("notes")),
  };
}

function textContent(el: Element | null): string {
  return el?.textContent?.trim() ?? "";
}

function previousHeading(table: Element): string | null {
  let node: Element | null = table.previousElementSibling;
  let hops = 0;
  while (node && hops < 12) {
    const tag = node.tagName?.toLowerCase?.() ?? "";
    if (tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4" || tag === "h5") {
      const t = textContent(node);
      if (t) return t;
    }
    const t = textContent(node);
    if (t && t.length < 80 && /ipo|right|fpo|mutual|bond|debenture|migrant|qii/i.test(t)) {
      return t;
    }
    node = node.previousElementSibling;
    hops++;
  }
  return null;
}

export async function fetchUpcomingIssuesFromHtmlSource(url: string): Promise<UpcomingIssueRow[]> {
  const fetchedAt = new Date().toISOString();
  const updatedAt = fetchedAt;

  const requestHeaders: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
    Referer: url,
  };

  const stripHtml = (s: string): string =>
    s
      .replace(/<[^>]*>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, "\"")
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const trySharesansarJson = async (): Promise<UpcomingIssueRow[] | null> => {
    const out: UpcomingIssueRow[] = [];
    const base = new URL(url);

    for (const [typeRaw, category] of Object.entries(SHARESANSAR_TYPE_TO_CATEGORY)) {
      const type = Number(typeRaw);
      let start = 0;
      // ShareSansar DataTables endpoint appears to hard-cap page size at 50.
      const length = 50;
      let safetyPages = 0;

      while (safetyPages++ < 20) {
        const u = new URL(base.toString());
        u.searchParams.set("type", String(type));
        u.searchParams.set("draw", "1");
        u.searchParams.set("start", String(start));
        u.searchParams.set("length", String(length));

        const res = await fetch(u.toString(), {
          headers: {
            ...requestHeaders,
            Accept: "application/json,text/plain,*/*",
            "X-Requested-With": "XMLHttpRequest",
          },
        });
        if (!res.ok) throw new Error(`Upcoming issues JSON HTTP ${res.status}`);

        const payload = (await res.json().catch(() => null)) as
          | null
          | { recordsTotal?: unknown; data?: unknown };
        if (!payload || typeof payload !== "object") return null;
        if (!Array.isArray((payload as { data?: unknown }).data)) return null;

        const rows = (payload as { data: Array<Record<string, unknown>> }).data;
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i] ?? {};
          const companyObj = (row.company ?? null) as null | {
            symbol?: string;
            companyname?: string;
            sector?: { sectorname?: string };
          };
          const symbol = stripHtml(String(companyObj?.symbol ?? ""));
          const company = stripHtml(String(companyObj?.companyname ?? ""));
          if (!symbol || !company) continue;

          const sector = stripHtml(String(companyObj?.sector?.sectorname ?? "")) || "—";
          const units = parseUnits(String(row.total_units ?? ""));
          const remark = stripHtml(String(row.remark ?? "")) || "";

          out.push({
            category,
            sn: start + i + 1,
            symbol,
            company,
            units,
            sector,
            remark,
            sourceUrl: url,
            fetchedAt,
            updatedAt,
          });
        }

        const total = Number((payload as { recordsTotal?: unknown }).recordsTotal ?? 0);
        start += length;
        if (!Number.isFinite(total) || start >= total) break;
      }
    }

    return out;
  };

  const sharesansarRows = await trySharesansarJson();
  if (sharesansarRows) return sharesansarRows;

  const res = await fetch(url, { headers: { ...requestHeaders, Accept: "text/html,application/xhtml+xml" } });
  if (!res.ok) throw new Error(`Upcoming issues source HTTP ${res.status}`);
  const html = await res.text();
  const { document } = parseHTML(html);

  const out: UpcomingIssueRow[] = [];
  const tables = Array.from(document.querySelectorAll("table"));

  for (const table of tables) {
    const heading = previousHeading(table);
    const category = normalizeCategory(heading);
    if (!category) continue;

    const headerCells = Array.from(table.querySelectorAll("thead th, thead td"));
    const headers =
      headerCells.length > 0
        ? headerCells.map((c) => normalizeText(textContent(c)))
        : Array.from(table.querySelectorAll("tr:first-child th, tr:first-child td")).map((c) =>
            normalizeText(textContent(c))
          );
    if (headers.length === 0) continue;

    const map = inferHeaderMap(headers);
    const rows = Array.from(table.querySelectorAll("tbody tr"));
    if (rows.length === 0) continue;

    for (const tr of rows) {
      const tds = Array.from(tr.querySelectorAll("td"));
      if (tds.length === 0) continue;

      const symbol = textContent(tds[map.symbol ?? 1] ?? null);
      const company = textContent(tds[map.company ?? 2] ?? null);
      if (!symbol || !company) continue;

      const snText = textContent(tds[map.sn ?? 0] ?? null);
      const sn = Number.parseInt(snText, 10);
      const unitsText = textContent(tds[map.units ?? 3] ?? null);
      const sector = textContent(tds[map.sector ?? 4] ?? null);
      const remark = textContent(tds[map.remark ?? 5] ?? null);

      out.push({
        category,
        sn: Number.isFinite(sn) && sn > 0 ? sn : out.filter((r) => r.category === category).length + 1,
        symbol,
        company,
        units: parseUnits(unitsText),
        sector: sector || "—",
        remark: remark || "",
        sourceUrl: url,
        fetchedAt,
        updatedAt,
      });
    }
  }

  return out;
}

