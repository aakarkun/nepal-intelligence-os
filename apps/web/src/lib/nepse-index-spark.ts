const NPT = "Asia/Kathmandu";

export type NepseHistoryPoint = {
  indexValue: number | null;
  scrapedAt: string;
};

export type NepseSparkSeries = {
  mode: "daily" | "hourly";
  /** Short label for the section header */
  label: string;
  values: number[];
};

function nptDayKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: NPT });
}

/** One bucket per clock hour in NPT (YYYY-MM-DD + hour). */
function nptHourSlotKey(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-CA", { timeZone: NPT });
  const hour = d.toLocaleString("en-GB", { timeZone: NPT, hour: "2-digit", hour12: false });
  return `${day}T${hour}`;
}

/**
 * Builds up to 7 bars from snapshot history:
 * - Prefer **7 distinct calendar days** (NPT), last print of each day.
 * - Else, if not enough days, use **7 distinct hours** (NPT), most recent hours with data.
 * Returns null if neither threshold is met.
 */
export function buildNepseSparkSeries(rows: NepseHistoryPoint[]): NepseSparkSeries | null {
  const valid = rows.filter(
    (r) => r.indexValue != null && r.indexValue > 0 && r.scrapedAt
  );
  if (valid.length === 0) return null;

  const sortedAsc = [...valid].sort(
    (a, b) => new Date(a.scrapedAt).getTime() - new Date(b.scrapedAt).getTime()
  );

  const byDay = new Map<string, NepseHistoryPoint>();
  for (const r of sortedAsc) {
    byDay.set(nptDayKey(r.scrapedAt), r);
  }
  const dayKeys = Array.from(byDay.keys()).sort();
  const last7DayKeys = dayKeys.slice(-7);
  if (last7DayKeys.length >= 7) {
    const values = last7DayKeys.map((k) => byDay.get(k)!.indexValue!);
    return {
      mode: "daily",
      label: "Index path · 7 sessions (NPT, daily)",
      values,
    };
  }

  const sortedDesc = [...valid].sort(
    (a, b) => new Date(b.scrapedAt).getTime() - new Date(a.scrapedAt).getTime()
  );
  const seenHour = new Set<string>();
  const hourlyPicks: NepseHistoryPoint[] = [];
  for (const r of sortedDesc) {
    const slot = nptHourSlotKey(r.scrapedAt);
    if (seenHour.has(slot)) continue;
    seenHour.add(slot);
    hourlyPicks.push(r);
    if (hourlyPicks.length >= 7) break;
  }
  if (hourlyPicks.length >= 7) {
    hourlyPicks.sort(
      (a, b) => new Date(a.scrapedAt).getTime() - new Date(b.scrapedAt).getTime()
    );
    const values = hourlyPicks.map((r) => r.indexValue!);
    return {
      mode: "hourly",
      label: "Index path · 7 hours (NPT)",
      values,
    };
  }

  return null;
}
