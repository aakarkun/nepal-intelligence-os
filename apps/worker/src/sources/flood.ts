import { parseHTML } from "linkedom";
import type { FloodAlert, FloodAlertsPayload } from "@repo/shared";

const DHM_FETCH_TIMEOUT_MS = 10_000;
const DHM_BULLETIN = "https://www.dhm.gov.np";

function isMonsoonSeason(date: Date): boolean {
  const month = date.getUTCMonth();
  return month >= 5 && month <= 8;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = DHM_FETCH_TIMEOUT_MS, ...init } = options;
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

function parseNumber(s: string | null | undefined): number | null {
  if (s == null || s === "") return null;
  const n = Number(String(s).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * Fetch DHM Nepal hydrological bulletin and parse river station table.
 * On failure or no data, returns empty alerts; off-season (outside June–Sept) sets seasonInactive.
 */
export async function fetchFloodAlerts(): Promise<FloodAlertsPayload> {
  const now = new Date();
  const nowIso = now.toISOString();
  const monsoon = isMonsoonSeason(now);

  try {
    const res = await fetchWithTimeout(DHM_BULLETIN, {
      timeout: DHM_FETCH_TIMEOUT_MS,
    });
    if (!res.ok) throw new Error(`DHM ${res.status}`);
    const html = await res.text();
    const alerts = parseDhmBulletin(html, nowIso);
    if (alerts.length > 0) {
      return {
        alerts,
        lastUpdated: nowIso,
      };
    }
    if (!monsoon) {
      return {
        alerts: [],
        seasonInactive: true,
        lastUpdated: nowIso,
      };
    }
    return { alerts: [], lastUpdated: nowIso };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[flood] DHM fetch/parse failed:", message);
    if (!monsoon) {
      return {
        alerts: [],
        seasonInactive: true,
        lastUpdated: nowIso,
      };
    }
    return { alerts: [], lastUpdated: nowIso };
  }
}

function parseDhmBulletin(html: string, observedAt: string): FloodAlert[] {
  const { document } = parseHTML(html);
  const alerts: FloodAlert[] = [];
  const tables = document.querySelectorAll("table");
  const statusMap: Record<string, FloodAlert["status"]> = {
    normal: "normal",
    warning: "warning",
    danger: "danger",
    "extreme danger": "extreme_danger",
  };

  for (const table of tables) {
    const text = (table.textContent ?? "").toLowerCase();
    if (!text.includes("station") && !text.includes("river") && !text.includes("water level")) continue;
    const rows = table.querySelectorAll("tbody tr, tr");
    for (const row of rows) {
      const cells = row.querySelectorAll("td");
      if (cells.length < 4) continue;
      const cellTexts = Array.from(cells).map((c) => (c.textContent ?? "").trim());
      const stationName = cellTexts[0] ?? "";
      const river = cellTexts[1] ?? "";
      const waterLevel = parseNumber(cellTexts[2]);
      const normalLevel = parseNumber(cellTexts[3]) ?? waterLevel ?? 0;
      const warningLevel = parseNumber(cellTexts[4]) ?? normalLevel + 1;
      const dangerLevel = parseNumber(cellTexts[5]) ?? warningLevel + 1;
      let status: FloodAlert["status"] = "normal";
      for (const t of cellTexts) {
        const lower = t.toLowerCase();
        if (lower.includes("extreme") || lower.includes("danger")) {
          status = lower.includes("extreme") ? "extreme_danger" : "danger";
          break;
        }
        if (lower.includes("warning")) status = "warning";
      }
      if (!stationName || !river || waterLevel === null) continue;
      const id = `dhm-${stationName.replace(/\s+/g, "-").toLowerCase()}-${river.replace(/\s+/g, "-").toLowerCase()}`;
      alerts.push({
        id,
        stationName,
        river,
        district: cellTexts[6] ?? "",
        province: 1,
        waterLevel,
        normalLevel,
        warningLevel,
        dangerLevel,
        status,
        trend: "stable",
        observedAt,
        source: "DHM",
      });
    }
  }
  return alerts;
}
