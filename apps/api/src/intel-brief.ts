/**
 * Intel briefing: build context from live store and call Anthropic Messages API.
 * No SDK — raw fetch, 10s timeout, circuit breaker.
 */

import {
  getSignalEvents,
  getCabinetEvents,
  getCrisisIncidents,
  getNepseSummary,
  getForexRates,
  getMarketAssetQuotes,
  getEarthquakeIncidents,
  getAnomalies,
  getFloodAlerts,
} from "./store";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 1024;
const TIMEOUT_MS = 10_000;

const SYSTEM_PROMPT = `You are a senior intelligence analyst covering Nepal.
You write concise, factual briefings for journalists.
Use only the data provided — do not invent facts.
Write in English. Be direct, no filler phrases.`;

export type BriefType = "daily" | "economic" | "crisis" | "custom";

export type BriefRequest = {
  type: BriefType;
  query?: string;
};

export type BriefResponse = {
  type: string;
  brief: string;
  generatedAt: string;
  dataPoints: number;
};

function buildDailyContext(): { context: string; dataPoints: number } {
  const signals = getSignalEvents(10, 0);
  const cabinet = getCabinetEvents(5);
  const incidents = getCrisisIncidents().slice(0, 5);
  const parts: string[] = [];
  let dataPoints = 0;

  parts.push("## Signals (latest 10)");
  signals.events.forEach((e) => {
    parts.push(`- [${e.timestamp}] ${e.title}${e.body ? ` — ${e.body.slice(0, 200)}` : ""} (${e.source ?? "unknown"})`);
    dataPoints += 1;
  });
  parts.push("\n## Cabinet / political events (latest 5)");
  cabinet.forEach((e) => {
    parts.push(`- ${e.publishedAt} ${e.title} — ${e.type}`);
    dataPoints += 1;
  });
  parts.push("\n## Crisis incidents (active)");
  incidents.forEach((i) => {
    parts.push(`- ${i.title} — ${i.severity ?? "unknown"} (${i.timestamp})`);
    dataPoints += 1;
  });
  return { context: parts.join("\n"), dataPoints };
}

function buildEconomicContext(): { context: string; dataPoints: number } {
  const nepse = getNepseSummary();
  const forex = getForexRates();
  const assets = getMarketAssetQuotes();
  const parts: string[] = [];
  let dataPoints = 0;
  if (nepse) {
    parts.push(`NEPSE: index ${nepse.index}, change ${nepse.change} (${nepse.changePercent}%), status ${nepse.marketStatus}, turnover ${nepse.totalTurnover}`);
    parts.push("Top gainers: " + (nepse.topGainers?.map((g) => `${g.symbol} ${g.price} ${g.changePercent}%`)?.join(", ") ?? "—"));
    parts.push("Top losers: " + (nepse.topLosers?.map((l) => `${l.symbol} ${l.price} ${l.changePercent}%`)?.join(", ") ?? "—"));
    dataPoints += 1;
  }
  if (forex.length) {
    parts.push("Forex (NRB): " + forex.map((f) => `${f.currencyCode} buy ${f.buy} sell ${f.sell}`).join("; "));
    dataPoints += forex.length;
  }
  if (assets.length) {
    parts.push("Assets: " + assets.map((a) => `${a.assetCode} ${a.price} ${a.currency} ${a.changePercent != null ? a.changePercent + "%" : ""}`).join("; "));
    dataPoints += assets.length;
  }
  return { context: parts.join("\n") || "No economic data available.", dataPoints };
}

function buildCrisisContext(): { context: string; dataPoints: number } {
  const incidents = getCrisisIncidents();
  const earthquakes = getEarthquakeIncidents();
  const anomalies = getAnomalies();
  const flood = getFloodAlerts();
  const parts: string[] = [];
  let dataPoints = 0;
  parts.push("## Crisis incidents");
  incidents.forEach((i) => {
    parts.push(`- ${i.title} — ${i.severity ?? "unknown"} ${i.timestamp}`);
    dataPoints += 1;
  });
  parts.push("\n## Seismic (recent)");
  earthquakes.slice(0, 10).forEach((e) => {
    parts.push(`- M${e.magnitude} ${e.place ?? ""} depth ${e.depthKm}km ${e.timestamp}`);
    dataPoints += 1;
  });
  parts.push("\n## Open anomalies");
  anomalies.forEach((a) => {
    parts.push(`- ${a.title ?? a.type} — ${a.timestamp}`);
    dataPoints += 1;
  });
  parts.push("\n## Flood alerts");
  parts.push(`Stations: ${flood.alerts.length}, seasonInactive: ${flood.seasonInactive ?? false}`);
  if (flood.alerts.length) dataPoints += flood.alerts.length;
  return { context: parts.join("\n") || "No crisis data.", dataPoints };
}

function buildFullContext(): { context: string; dataPoints: number } {
  const daily = buildDailyContext();
  const economic = buildEconomicContext();
  const crisis = buildCrisisContext();
  const context = [
    "--- SIGNALS & HEADLINES ---",
    daily.context,
    "--- ECONOMY ---",
    economic.context,
    "--- CRISIS ---",
    crisis.context,
  ].join("\n\n");
  const dataPoints = daily.dataPoints + economic.dataPoints + crisis.dataPoints;
  return { context, dataPoints };
}

export function buildContextAndPrompt(
  type: BriefType,
  query?: string
): { userMessage: string; dataPoints: number } {
  switch (type) {
    case "daily": {
      const { context, dataPoints } = buildDailyContext();
      const userMessage = `Generate a Daily Nepal Intelligence Brief from this live data. Structure it as:
SITUATION: (2 sentences on the political situation)
ECONOMY: (1 sentence on key economic moves)
CRISIS: (1 sentence on active alerts)
HEADLINES: (3 bullet points, most important stories)

Data:
${context}`;
      return { userMessage, dataPoints };
    }
    case "economic": {
      const { context, dataPoints } = buildEconomicContext();
      const userMessage = `Write a 3-paragraph economic briefing for a Nepal financial journalist. Cover: stock market, forex movements, and commodity prices.

Data:
${context}`;
      return { userMessage, dataPoints };
    }
    case "crisis": {
      const { context, dataPoints } = buildCrisisContext();
      const userMessage = `Summarise the current crisis situation in Nepal for a field journalist. List active threats by severity. Be factual and concise.

Data:
${context}`;
      return { userMessage, dataPoints };
    }
    case "custom": {
      const { context, dataPoints } = buildFullContext();
      const userMessage = `${query ?? "Summarise the current situation."}

Answer using only this live Nepal data:
${context}`;
      return { userMessage, dataPoints };
    }
    default:
      return { userMessage: "", dataPoints: 0 };
  }
}

export async function callAnthropic(userMessage: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key?.trim()) throw new Error("Intel service not configured");

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: controller.signal,
    });
    clearTimeout(id);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(body || `Anthropic ${res.status}`);
    }
    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
      error?: { message?: string };
    };
    if (data.error?.message) throw new Error(data.error.message);
    const text = data.content?.find((c) => c.type === "text")?.text ?? "";
    return text;
  } finally {
    clearTimeout(id);
  }
}
