import type { EconomySummary, ForexRate, MarketAssetQuote } from "@repo/shared";

type NrbRateEntry = {
  currency: {
    iso3?: string | null;
    name?: string | null;
    unit?: number | string | null;
  };
  buy?: number | string | null;
  sell?: number | string | null;
};

type NrbDayResponse = {
  date?: string;
  published_on?: string;
  modified_on?: string;
  rates?: NrbRateEntry[];
};

type NrbResponse = {
  data?: {
    payload?: NrbDayResponse[];
  };
};

type GoldApiResponse = {
  name?: string;
  price?: number;
  currency?: string;
  updatedAt?: string;
  timestamp?: number;
};

const FENEGOSIDA_URL = "https://www.fenegosida.org/";

function asNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isoDate(daysAgo = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function buildEndpoint(): string {
  const url = new URL("https://www.nrb.org.np/api/forex/v1/rates");
  url.searchParams.set("page", "1");
  url.searchParams.set("per_page", "2");
  url.searchParams.set("from", isoDate(2));
  url.searchParams.set("to", isoDate(0));
  return url.toString();
}

export async function fetchForexRates(): Promise<ForexRate[]> {
  const res = await fetch(buildEndpoint(), {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`NRB forex request failed: ${res.status}`);
  }

  const payload = (await res.json()) as NrbResponse;
  const days = (payload.data?.payload ?? [])
    .filter((day) => Array.isArray(day.rates) && day.rates.length > 0)
    .sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));

  if (days.length === 0) {
    return [];
  }

  const latest = days[0];
  const previous = days[1];
  const previousByCode = new Map(
    (previous?.rates ?? [])
      .map((entry) => {
        const code = entry.currency?.iso3?.trim().toUpperCase();
        return code ? [code, entry] : null;
      })
      .filter((entry): entry is [string, NrbRateEntry] => Boolean(entry))
  );

  return (latest.rates ?? [])
    .map((entry) => {
      const currencyCode = entry.currency?.iso3?.trim().toUpperCase();
      const currencyName = entry.currency?.name?.trim();
      const unit = asNumber(entry.currency?.unit) ?? 1;
      const buy = asNumber(entry.buy);
      const sell = asNumber(entry.sell);

      if (!currencyCode || !currencyName || buy === null || sell === null) {
        return null;
      }

      const previousEntry = previousByCode.get(currencyCode);
      const previousBuy = asNumber(previousEntry?.buy);
      const previousSell = asNumber(previousEntry?.sell);
      const changeBuy =
        previousBuy === null ? null : Number((buy - previousBuy).toFixed(4));
      const changeSell =
        previousSell === null ? null : Number((sell - previousSell).toFixed(4));

      let trend: ForexRate["trend"] = "new";
      if (changeBuy !== null) {
        if (changeBuy > 0) trend = "up";
        else if (changeBuy < 0) trend = "down";
        else trend = "flat";
      }

      return {
        currencyCode,
        currencyName,
        unit,
        buy,
        sell,
        previousBuy,
        previousSell,
        changeBuy,
        changeSell,
        trend,
        date: latest.date ?? isoDate(0),
        publishedOn: latest.published_on
          ? new Date(latest.published_on).toISOString()
          : latest.modified_on
            ? new Date(latest.modified_on).toISOString()
            : undefined,
      } satisfies ForexRate;
    })
    .filter((rate): rate is ForexRate => Boolean(rate))
    .sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));
}

function getRate(rates: ForexRate[], code: string): number | null {
  return rates.find((rate) => rate.currencyCode === code)?.buy ?? null;
}

export function summarizeForexRates(
  rates: ForexRate[],
  timestamp: string
): EconomySummary {
  let advancingRates = 0;
  let decliningRates = 0;
  let unchangedRates = 0;

  for (const rate of rates) {
    if (rate.trend === "up") advancingRates++;
    else if (rate.trend === "down") decliningRates++;
    else unchangedRates++;
  }

  const topMovers = rates
    .filter((rate): rate is ForexRate & { changeBuy: number } => rate.changeBuy !== null)
    .sort((a, b) => Math.abs(b.changeBuy) - Math.abs(a.changeBuy))
    .slice(0, 5)
    .map((rate) => ({
      currencyCode: rate.currencyCode,
      currencyName: rate.currencyName,
      unit: rate.unit,
      buy: rate.buy,
      sell: rate.sell,
      changeBuy: rate.changeBuy,
      trend: rate.changeBuy > 0 ? "up" : rate.changeBuy < 0 ? "down" : "flat",
    }));

  return {
    sourceId: "economy:forex",
    sourceName: "Nepal Rastra Bank Forex",
    timestamp,
    baseCurrency: "NPR",
    trackedRates: rates.length,
    advancingRates,
    decliningRates,
    unchangedRates,
    usdBuy: getRate(rates, "USD"),
    eurBuy: getRate(rates, "EUR"),
    gbpBuy: getRate(rates, "GBP"),
    inrBuy: getRate(rates, "INR"),
    topMovers,
  };
}

const METAL_DEFS = [
  { assetCode: "XAU", assetName: "Gold", class: "metal" as const },
  { assetCode: "XAG", assetName: "Silver", class: "metal" as const },
];

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
};

/** CoinGecko spot proxies for 24h % when primary price is Gold API (spot USD tracks ~same move). */
const COINGECKO_METAL_24H_IDS: Record<string, string> = {
  XAU: "tether-gold",
  XAG: "kinesis-silver",
};

type CoinGeckoSimpleEntry = { usd?: number; usd_24h_change?: number };
type CoinGeckoSimpleResponse = Record<string, CoinGeckoSimpleEntry | undefined>;

function applyUsd24hMove(
  price: number,
  pct24h: number
): {
  change: number;
  changePercent: number;
  previousPrice: number;
  trend: MarketAssetQuote["trend"];
} {
  const previousPrice = price / (1 + pct24h / 100);
  const change = Number((price - previousPrice).toFixed(2));
  const changePercent = Number(pct24h.toFixed(3));
  let trend: MarketAssetQuote["trend"] = "flat";
  if (pct24h > 0) trend = "up";
  else if (pct24h < 0) trend = "down";
  return { change, changePercent, previousPrice, trend };
}

function applySessionDelta(
  price: number,
  previous: MarketAssetQuote | undefined
): {
  change: number | null;
  changePercent: number | null;
  previousPrice: number | null;
  trend: MarketAssetQuote["trend"];
} {
  const prev = previous?.price;
  if (prev === undefined || prev === null) {
    return { change: null, changePercent: null, previousPrice: null, trend: "new" };
  }
  const change = Number((price - prev).toFixed(2));
  const changePercent =
    prev === 0 ? null : Number(((change / prev) * 100).toFixed(3));
  let trend: MarketAssetQuote["trend"] = "flat";
  if (change > 0) trend = "up";
  else if (change < 0) trend = "down";
  return { change, changePercent, previousPrice: prev, trend };
}

async function fetchCoinGeckoSimpleWith24h(ids: string): Promise<CoinGeckoSimpleResponse | null> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) throw new Error(`CoinGecko request failed: ${res.status}`);
    return (await res.json()) as CoinGeckoSimpleResponse;
  } catch {
    return null;
  }
}

async function fetchMetalsFromGoldApi(
  previousByCode: Map<string, MarketAssetQuote>,
  cg: CoinGeckoSimpleResponse | null
): Promise<MarketAssetQuote[]> {
  return Promise.all(
    METAL_DEFS.map(async (asset) => {
      const res = await fetch(`https://api.gold-api.com/price/${asset.assetCode}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Gold API ${asset.assetCode}: ${res.status}`);
      const payload = (await res.json()) as GoldApiResponse;
      if (typeof payload.price !== "number" || !Number.isFinite(payload.price)) {
        throw new Error(`Gold API ${asset.assetCode} returned no usable price`);
      }
      const previous = previousByCode.get(asset.assetCode);
      const refId = COINGECKO_METAL_24H_IDS[asset.assetCode];
      const pct24h = refId ? cg?.[refId]?.usd_24h_change : undefined;
      let change: number | null;
      let changePercent: number | null;
      let previousPrice: number | null;
      let trend: MarketAssetQuote["trend"];
      if (typeof pct24h === "number" && Number.isFinite(pct24h)) {
        const m = applyUsd24hMove(payload.price, pct24h);
        change = m.change;
        changePercent = m.changePercent;
        previousPrice = m.previousPrice;
        trend = m.trend;
      } else {
        const s = applySessionDelta(payload.price, previous);
        change = s.change;
        changePercent = s.changePercent;
        previousPrice = s.previousPrice;
        trend = s.trend;
      }
      return {
        assetCode: asset.assetCode,
        assetName: payload.name ?? asset.assetName,
        class: asset.class,
        currency: payload.currency ?? "USD",
        price: payload.price,
        previousPrice,
        change,
        changePercent,
        trend,
        timestamp: payload.updatedAt
          ? new Date(payload.updatedAt).toISOString()
          : payload.timestamp
            ? new Date(payload.timestamp * 1000).toISOString()
            : new Date().toISOString(),
      } satisfies MarketAssetQuote;
    })
  );
}

export function extractHallmarkGoldPerTolaNpr(pageText: string): number | null {
  const fineGoldPerTolaPattern =
    /FINE\s*GOLD\s*\(9999\)\s*per\s*1\s*tola[^0-9]*([0-9][0-9,]*)/i;
  const match = pageText.match(fineGoldPerTolaPattern);
  if (!match) return null;
  const value = Number(match[1].replaceAll(",", "").trim());
  return Number.isFinite(value) ? value : null;
}

async function fetchHallmarkGoldQuote(
  previousByCode: Map<string, MarketAssetQuote>,
  cg: CoinGeckoSimpleResponse | null
): Promise<MarketAssetQuote> {
  const res = await fetch(FENEGOSIDA_URL, { headers: { Accept: "text/html" } });
  if (!res.ok) throw new Error(`FENEGOSIDA request failed: ${res.status}`);
  const html = await res.text();
  const priceNprPerTola = extractHallmarkGoldPerTolaNpr(html);
  if (priceNprPerTola == null) {
    throw new Error("FENEGOSIDA page did not contain parsable hallmark gold tola price");
  }

  const previous = previousByCode.get("XAU");
  const refId = COINGECKO_METAL_24H_IDS.XAU;
  const pct24h = refId ? cg?.[refId]?.usd_24h_change : undefined;
  let change: number | null;
  let changePercent: number | null;
  let previousPrice: number | null;
  let trend: MarketAssetQuote["trend"];
  if (typeof pct24h === "number" && Number.isFinite(pct24h)) {
    const m = applyUsd24hMove(priceNprPerTola, pct24h);
    change = m.change;
    changePercent = m.changePercent;
    previousPrice = m.previousPrice;
    trend = m.trend;
  } else {
    const s = applySessionDelta(priceNprPerTola, previous);
    change = s.change;
    changePercent = s.changePercent;
    previousPrice = s.previousPrice;
    trend = s.trend;
  }

  return {
    assetCode: "XAU",
    assetName: "Gold (Hallmark)",
    class: "metal",
    currency: "NPR",
    price: priceNprPerTola,
    previousPrice,
    change,
    changePercent,
    trend,
    timestamp: new Date().toISOString(),
  } satisfies MarketAssetQuote;
}

/** CoinGecko free tier: no API key; 24h move from `include_24hr_change`. */
function buildCryptoQuotesFromCg(
  cg: CoinGeckoSimpleResponse | null,
  previousByCode: Map<string, MarketAssetQuote>
): MarketAssetQuote[] {
  if (!cg) return [];
  const now = new Date().toISOString();
  const quotes: MarketAssetQuote[] = [];
  const names: Record<string, string> = { BTC: "Bitcoin", ETH: "Ethereum" };
  for (const [code, id] of Object.entries(COINGECKO_IDS)) {
    const row = cg[id];
    const usd = row?.usd;
    if (typeof usd !== "number" || !Number.isFinite(usd)) continue;
    const pct = row?.usd_24h_change;
    let change: number | null;
    let changePercent: number | null;
    let previousPrice: number | null;
    let trend: MarketAssetQuote["trend"];
    if (typeof pct === "number" && Number.isFinite(pct)) {
      const m = applyUsd24hMove(usd, pct);
      change = m.change;
      changePercent = m.changePercent;
      previousPrice = m.previousPrice;
      trend = m.trend;
    } else {
      const s = applySessionDelta(usd, previousByCode.get(code));
      change = s.change;
      changePercent = s.changePercent;
      previousPrice = s.previousPrice;
      trend = s.trend;
    }
    quotes.push({
      assetCode: code,
      assetName: names[code] ?? code,
      class: "crypto",
      currency: "USD",
      price: usd,
      previousPrice,
      change,
      changePercent,
      trend,
      timestamp: now,
    });
  }
  return quotes;
}

export type FetchMarketAssetQuotesOptions = {
  /** When true, skip CoinGecko (e.g. circuit open); use previous crypto from previousQuotes. */
  skipCrypto?: boolean;
  /** Called when CoinGecko request fails so caller can record circuit breaker failure. */
  onCryptoFailure?: () => void;
};

export async function fetchMarketAssetQuotes(
  previousQuotes: MarketAssetQuote[] = [],
  options: FetchMarketAssetQuotesOptions = {}
): Promise<MarketAssetQuote[]> {
  const { skipCrypto = false, onCryptoFailure } = options;
  const previousByCode = new Map(previousQuotes.map((q) => [q.assetCode, q]));
  const cgIds = skipCrypto
    ? "tether-gold,kinesis-silver"
    : "bitcoin,ethereum,tether-gold,kinesis-silver";
  const cg = await fetchCoinGeckoSimpleWith24h(cgIds);

  let metals = await fetchMetalsFromGoldApi(previousByCode, cg);
  try {
    const hallmarkGold = await fetchHallmarkGoldQuote(previousByCode, cg);
    metals = [hallmarkGold, ...metals.filter((m) => m.assetCode !== "XAU")];
  } catch {
    // Keep gold-api metal fallback when hallmark source is unavailable.
  }
  let crypto: MarketAssetQuote[];
  if (skipCrypto) {
    crypto = previousQuotes.filter((q) => q.class === "crypto");
  } else {
    const built = buildCryptoQuotesFromCg(cg, previousByCode);
    if (built.length > 0) {
      crypto = built;
    } else {
      onCryptoFailure?.();
      crypto = previousQuotes.filter((q) => q.class === "crypto");
    }
  }
  return [...metals, ...crypto].sort((a, b) => a.assetCode.localeCompare(b.assetCode));
}
