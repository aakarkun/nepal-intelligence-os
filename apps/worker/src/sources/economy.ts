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

type CoinGeckoResponse = Record<string, { usd?: number }>;

async function fetchMetalsFromGoldApi(
  previousByCode: Map<string, MarketAssetQuote>
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
      const change =
        previous?.price === undefined
          ? null
          : Number((payload.price - previous.price).toFixed(2));
      const changePercent =
        change === null || previous?.price === 0
          ? null
          : Number(((change / previous!.price) * 100).toFixed(3));
      let trend: MarketAssetQuote["trend"] = "new";
      if (change !== null) {
        if (change > 0) trend = "up";
        else if (change < 0) trend = "down";
        else trend = "flat";
      }
      return {
        assetCode: asset.assetCode,
        assetName: payload.name ?? asset.assetName,
        class: asset.class,
        currency: payload.currency ?? "USD",
        price: payload.price,
        previousPrice: previous?.price ?? null,
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
  previousByCode: Map<string, MarketAssetQuote>
): Promise<MarketAssetQuote> {
  const res = await fetch(FENEGOSIDA_URL, { headers: { Accept: "text/html" } });
  if (!res.ok) throw new Error(`FENEGOSIDA request failed: ${res.status}`);
  const html = await res.text();
  const priceNprPerTola = extractHallmarkGoldPerTolaNpr(html);
  if (priceNprPerTola == null) {
    throw new Error("FENEGOSIDA page did not contain parsable hallmark gold tola price");
  }

  const previous = previousByCode.get("XAU");
  const change =
    previous?.price === undefined
      ? null
      : Number((priceNprPerTola - previous.price).toFixed(2));
  const changePercent =
    change === null || previous?.price === 0
      ? null
      : Number(((change / previous.price) * 100).toFixed(3));

  let trend: MarketAssetQuote["trend"] = "new";
  if (change !== null) {
    if (change > 0) trend = "up";
    else if (change < 0) trend = "down";
    else trend = "flat";
  }

  return {
    assetCode: "XAU",
    assetName: "Gold (Hallmark)",
    class: "metal",
    currency: "NPR",
    price: priceNprPerTola,
    previousPrice: previous?.price ?? null,
    change,
    changePercent,
    trend,
    timestamp: new Date().toISOString(),
  } satisfies MarketAssetQuote;
}

/** CoinGecko free tier: no API key, ~60s updates. */
async function fetchCryptoFromCoinGecko(
  previousByCode: Map<string, MarketAssetQuote>
): Promise<MarketAssetQuote[]> {
  const ids = Object.values(COINGECKO_IDS).join(",");
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) throw new Error(`CoinGecko request failed: ${res.status}`);
  const data = (await res.json()) as CoinGeckoResponse;
  const now = new Date().toISOString();
  const quotes: MarketAssetQuote[] = [];
  const names: Record<string, string> = { BTC: "Bitcoin", ETH: "Ethereum" };
  for (const [code, id] of Object.entries(COINGECKO_IDS)) {
    const usd = data[id]?.usd;
    if (typeof usd !== "number" || !Number.isFinite(usd)) continue;
    const previous = previousByCode.get(code);
    const change =
      previous?.price === undefined
        ? null
        : Number((usd - previous.price).toFixed(2));
    const changePercent =
      change === null || previous?.price === 0
        ? null
        : Number(((change / previous!.price) * 100).toFixed(3));
    let trend: MarketAssetQuote["trend"] = "new";
    if (change !== null) {
      if (change > 0) trend = "up";
      else if (change < 0) trend = "down";
      else trend = "flat";
    }
    quotes.push({
      assetCode: code,
      assetName: names[code] ?? code,
      class: "crypto",
      currency: "USD",
      price: usd,
      previousPrice: previous?.price ?? null,
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
  let metals = await fetchMetalsFromGoldApi(previousByCode);
  try {
    const hallmarkGold = await fetchHallmarkGoldQuote(previousByCode);
    metals = [hallmarkGold, ...metals.filter((m) => m.assetCode !== "XAU")];
  } catch {
    // Keep gold-api metal fallback when hallmark source is unavailable.
  }
  let crypto: MarketAssetQuote[];
  if (skipCrypto) {
    crypto = previousQuotes.filter((q) => q.class === "crypto");
  } else {
    try {
      crypto = await fetchCryptoFromCoinGecko(previousByCode);
    } catch {
      onCryptoFailure?.();
      crypto = previousQuotes.filter((q) => q.class === "crypto");
    }
  }
  return [...metals, ...crypto].sort((a, b) => a.assetCode.localeCompare(b.assetCode));
}
