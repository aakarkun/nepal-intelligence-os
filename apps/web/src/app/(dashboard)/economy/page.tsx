"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bitcoin,
  CircleDollarSign,
  Coins,
  Gem,
  Landmark,
  LineChart,
  RadioTower,
  Scale,
  Search,
} from "lucide-react";
import {
  fetchEconomySummary,
  fetchFeed,
  fetchForexRates,
  fetchMarketAssetQuotes,
  fetchNepseSummary,
  fetchSourceHealth,
} from "@/lib/api";
import { formatNepalDateTime, formatNumber, timeAgo } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ECONOMY_KEYWORDS = [
  "economy",
  "economic",
  "inflation",
  "gdp",
  "growth",
  "budget",
  "remittance",
  "forex",
  "reserve",
  "trade",
  "export",
  "import",
  "nepse",
  "stock",
  "bank",
  "tourism",
  "tax",
  "fuel",
];

const TRACKED_CODES = ["AUD", "USD", "EUR", "GBP"] as const;

function rateTone(change: number | null) {
  if (change === null || change === 0) {
    return "text-muted-foreground";
  }
  return change > 0 ? "text-emerald-400" : "text-red-400";
}

function trendLabel(change: number | null) {
  if (change === null || change === 0) return "Flat";
  return change > 0 ? "Up" : "Down";
}

function trendBadgeClass(change: number | null) {
  if (change === null || change === 0) {
    return "border-border/35 bg-muted/12 text-muted-foreground";
  }
  return change > 0
    ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-400"
    : "border-red-500/20 bg-red-500/8 text-red-400";
}

export default function EconomyPage() {
  const { data: summary } = useQuery({
    queryKey: ["economy", "summary"],
    queryFn: fetchEconomySummary,
    refetchInterval: 30 * 60 * 1000,
  });

  const { data: rates = [] } = useQuery({
    queryKey: ["economy", "forex"],
    queryFn: fetchForexRates,
    refetchInterval: 30 * 60 * 1000,
  });

  const { data: assetQuotes = [] } = useQuery({
    queryKey: ["economy", "assets"],
    queryFn: fetchMarketAssetQuotes,
    refetchInterval: 30 * 60 * 1000,
  });

  const { data: nepse } = useQuery({
    queryKey: ["economy", "nepse"],
    queryFn: fetchNepseSummary,
    refetchInterval: 30 * 60 * 1000,
  });

  const { data: feedData } = useQuery({
    queryKey: ["feed", "economy-context"],
    queryFn: () => fetchFeed(120, 0),
    refetchInterval: 30_000,
  });

  const { data: sourceHealth = [] } = useQuery({
    queryKey: ["source-health", "economy"],
    queryFn: fetchSourceHealth,
    refetchInterval: 30_000,
  });

  const trackedRates = useMemo(
    () =>
      TRACKED_CODES.map((code) => rates.find((rate) => rate.currencyCode === code)).filter(
        (rate): rate is NonNullable<(typeof rates)[number]> => Boolean(rate)
      ),
    [rates]
  );

  const [rateQuery, setRateQuery] = useState("");

  const filteredRates = useMemo(
    () => {
      const q = rateQuery.trim().toLowerCase();
      if (!q) return rates;
      return rates.filter((rate) => {
        const haystack = `${rate.currencyCode} ${rate.currencyName}`.toLowerCase();
        return haystack.includes(q);
      });
    },
    [rates, rateQuery]
  );

  const orderedAssetQuotes = useMemo(() => {
    const order = ["BTC", "XAU", "XAG"];
    const rank = (code: string) => {
      const index = order.indexOf(code);
      return index === -1 ? order.length + 1 : index;
    };
    return [...assetQuotes].sort(
      (a, b) => rank(a.assetCode) - rank(b.assetCode)
    );
  }, [assetQuotes]);

  const topNews = useMemo(() => {
    const events = feedData?.events ?? [];
    return events.filter((event) => {
      const haystack = `${event.title} ${event.body} ${event.source ?? ""}`.toLowerCase();
      return ECONOMY_KEYWORDS.some((keyword) => haystack.includes(keyword));
    });
  }, [feedData]);

  const economySources = sourceHealth.filter(
    (source) =>
      source.sourceId === "economy" ||
      source.sourceId === "economy:forex" ||
      source.sourceId.startsWith("news:")
  );

  const assetIcon = (code: string) => {
    if (code === "XAU") return Gem;
    if (code === "XAG") return Coins;
    return Bitcoin;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Economic Pulse
          </h1>
          <p className="text-muted-foreground text-sm">
            Direct FX board from Nepal Rastra Bank, with live macro context layered beside it
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card/10 px-4 py-3 text-xs text-muted-foreground">
          Source: {summary?.sourceName ?? "Nepal Rastra Bank Forex"} ·{" "}
          {summary ? formatNepalDateTime(summary.timestamp) : "Waiting for first pull"}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {trackedRates.map((rate) => (
          <Card
            key={rate.currencyCode}
            className="border border-border bg-card/80 rounded-xl"
          >
            <CardHeader className="pb-2">
              <CardTitle className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
                {rate.currencyCode} / NPR
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="font-display text-4xl font-bold tabular-nums leading-none">
                {rate.buy.toFixed(2)}
              </div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {rate.currencyName} buying rate
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {orderedAssetQuotes.map((quote) => {
          const Icon = assetIcon(quote.assetCode);
          return (
            <Card
              key={quote.assetCode}
              className={cn(
                "border border-border bg-card/10 rounded-xl transition-colors",
                quote.change !== null && quote.change > 0 && "border-emerald-500/15 bg-emerald-500/5",
                quote.change !== null && quote.change < 0 && "border-red-500/15 bg-red-500/5"
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", rateTone(quote.change))} />
                    <CardTitle className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
                      {quote.assetName}
                    </CardTitle>
                  </div>
                  <Badge className={trendBadgeClass(quote.change)}>{quote.assetCode}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="font-display text-4xl font-bold tabular-nums leading-none">
                  {quote.price.toLocaleString("en-US", {
                    maximumFractionDigits: quote.assetCode === "BTC" ? 0 : 2,
                  })}
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {quote.currency} spot reference
                </div>
                <div className={cn("flex items-center gap-2 text-sm", rateTone(quote.change))}>
                  {quote.change !== null && quote.change > 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : quote.change !== null && quote.change < 0 ? (
                    <ArrowDownRight className="h-4 w-4" />
                  ) : (
                    <Scale className="h-4 w-4" />
                  )}
                  <span className="tabular-nums">
                    {quote.change === null ? "First tracked print" : `${quote.change > 0 ? "+" : ""}${quote.change.toFixed(2)}`}
                  </span>
                  <span className="text-muted-foreground">
                    {quote.changePercent === null
                      ? ""
                      : `(${quote.changePercent > 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%)`}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {nepse && (
        <Card className="border border-border bg-card/80 rounded-xl">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <LineChart className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="font-display text-base">NEPSE</CardTitle>
              <span className="text-xs text-muted-foreground">
                {nepse.sourceName}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-display text-2xl font-bold tabular-nums">
                {nepse.index > 0 ? nepse.index.toLocaleString() : "—"}
              </span>
              {nepse.changePercent != null && (
                <span className={cn("text-sm tabular-nums", rateTone(nepse.change))}>
                  {nepse.change != null && (nepse.change >= 0 ? "+" : "")}
                  {nepse.changePercent.toFixed(2)}%
                </span>
              )}
            </div>
            {(nepse.topGainers?.length ?? 0) + (nepse.topLosers?.length ?? 0) > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {nepse.topGainers && nepse.topGainers.length > 0 && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Top gainers</div>
                    <ul className="mt-1 space-y-0.5 text-sm">
                      {nepse.topGainers.slice(0, 5).map((g) => (
                        <li key={g.symbol} className="flex justify-between text-emerald-400">
                          <span>{g.symbol}</span>
                          <span className="tabular-nums">+{g.change.toFixed(2)}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {nepse.topLosers && nepse.topLosers.length > 0 && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Top losers</div>
                    <ul className="mt-1 space-y-0.5 text-sm">
                      {nepse.topLosers.slice(0, 5).map((g) => (
                        <li key={g.symbol} className="flex justify-between text-red-400">
                          <span>{g.symbol}</span>
                          <span className="tabular-nums">{g.change.toFixed(2)}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {nepse.index === 0 && !nepse.topGainers?.length && !nepse.topLosers?.length && (
              <p className="text-xs text-muted-foreground">
                Live index and movers will appear when NEPSE data is available.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card
        className={cn(
          "border border-border rounded-xl",
          summary &&
            Math.max(
              summary.advancingRates ?? 0,
              summary.decliningRates ?? 0,
              summary.unchangedRates ?? 0
            ) === (summary.advancingRates ?? 0)
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "border-rose-100/20 bg-rose-100/5"
        )}
      >
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
              FX breadth
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <Badge className="border-emerald-500/20 bg-emerald-500/8 text-emerald-400">
                {summary?.advancingRates ?? 0} up
              </Badge>
              <Badge className="border-red-500/20 bg-red-500/8 text-red-400">
                {summary?.decliningRates ?? 0} down
              </Badge>
              <Badge className="border-border/35 bg-muted/12 text-muted-foreground">
                {summary?.unchangedRates ?? 0} flat
              </Badge>
              <Badge className="border-border/35 bg-background/18 text-foreground/90">
                {formatNumber(summary?.trackedRates ?? 0)} tracked
              </Badge>
            </div>
          </div>

          <div className="text-left md:text-right">
            <div className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Pulse freshness
            </div>
            <div className="mt-2 font-display text-3xl font-bold tabular-nums leading-none">
              {summary ? timeAgo(summary.timestamp) : "--"}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="space-y-4 w-full xl:flex-[1.3]">
          <Card className="overflow-hidden border border-border bg-card/80 rounded-2xl w-full">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="font-display text-lg">NRB FX Board</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2">
                {trackedRates.map((rate) => (
                  <div key={rate.currencyCode} className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-display text-xl font-semibold">
                          {rate.currencyCode}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {rate.currencyName} · unit {rate.unit}
                        </div>
                      </div>
                      <Badge className={trendBadgeClass(rate.changeBuy)}>
                        {trendLabel(rate.changeBuy)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-background/16 p-3">
                        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          Buy
                        </div>
                        <div className="mt-1 font-display text-2xl font-semibold tabular-nums">
                          {rate.buy.toFixed(3)}
                        </div>
                      </div>
                      <div className="rounded-lg bg-background/16 p-3">
                        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          Sell
                        </div>
                        <div className="mt-1 font-display text-2xl font-semibold tabular-nums">
                          {rate.sell.toFixed(3)}
                        </div>
                      </div>
                    </div>

                    <div className={cn("flex items-center gap-2 text-sm", rateTone(rate.changeBuy))}>
                      {rate.changeBuy !== null && rate.changeBuy > 0 ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : rate.changeBuy !== null && rate.changeBuy < 0 ? (
                        <ArrowDownRight className="h-4 w-4" />
                      ) : (
                        <Scale className="h-4 w-4" />
                      )}
                      <span className="tabular-nums">
                        {rate.changeBuy === null ? "No prior compare" : `${rate.changeBuy > 0 ? "+" : ""}${rate.changeBuy.toFixed(3)}`}
                      </span>
                      <span className="text-muted-foreground">vs previous board</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card/80 rounded-2xl w-full">
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-base">Signal Board</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topNews.slice(0, 7).map((event, index) => (
                <div
                  key={`${event.id}-${index}`}
                  className="rounded-lg bg-background/8 p-3"
                >
                  <div className="text-sm font-medium leading-tight">{event.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {event.source ?? "Unknown source"} · {timeAgo(event.timestamp)}
                  </div>
                </div>
              ))}
              {topNews.length === 0 && (
                <div className="rounded-lg bg-background/6 p-4 text-sm text-muted-foreground">
                  No economy-tagged context headlines in the current feed window.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 w-full xl:flex-[0.7]">
          <Card className="border border-border bg-card/80 rounded-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="font-display text-base">Top Movers</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(summary?.topMovers ?? []).map((mover, index) => (
                <div
                  key={mover.currencyCode}
                  className="flex items-center justify-between rounded-lg bg-background/8 px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {index + 1}. {mover.currencyCode}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {mover.currencyName} · unit {mover.unit}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold tabular-nums">
                      {mover.buy.toFixed(3)}
                    </div>
                    <div className={cn("text-xs tabular-nums", rateTone(mover.changeBuy))}>
                      {mover.changeBuy > 0 ? "+" : ""}
                      {mover.changeBuy.toFixed(3)}
                    </div>
                  </div>
                </div>
              ))}
              {(summary?.topMovers ?? []).length === 0 && (
                <div className="rounded-lg bg-background/6 p-4 text-sm text-muted-foreground">
                  Waiting for direct NRB comparison data.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border bg-card/80 rounded-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <RadioTower className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="font-display text-base">Source Health</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {economySources.map((source) => (
                <div
                  key={source.sourceId}
                  className="flex items-center justify-between rounded-lg bg-background/8 px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-medium">{source.sourceName}</div>
                    <div className="text-xs text-muted-foreground">
                      {source.updateCount} updates · {timeAgo(source.lastUpdate)}
                    </div>
                  </div>
                  <Badge
                    variant={
                      source.status === "live"
                        ? "live"
                        : source.status === "stale"
                          ? "outline"
                          : "destructive"
                    }
                  >
                    {source.status}
                  </Badge>
                </div>
              ))}
              {economySources.length === 0 && (
                <div className="rounded-lg bg-background/6 p-4 text-sm text-muted-foreground">
                  No economy source health yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-4 border border-border bg-card/80 rounded-2xl w-full">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="font-display text-base">Full Rate Ladder</CardTitle>
            <div className="relative w-full md:w-64">
              <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground/70" />
              <input
                type="text"
                value={rateQuery}
                onChange={(e) => setRateQuery(e.target.value)}
                placeholder="Filter currencies…"
                className="w-full rounded-md border border-border bg-background/40 py-1.5 pl-7 pr-3 text-xs font-mono uppercase tracking-[0.18em] text-foreground/90 placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-border/50"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.7fr] gap-2 px-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <div>Currency</div>
            <div className="text-right">Buy</div>
            <div className="text-right">Sell</div>
            <div className="text-right">Delta</div>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {filteredRates.map((rate) => (
              <div
                key={rate.currencyCode}
                className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.7fr] items-center gap-2 rounded-lg bg-background/8 px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-medium">{rate.currencyCode}</div>
                  <div className="text-xs text-muted-foreground">
                    {rate.currencyName} · unit {rate.unit}
                  </div>
                </div>
                <div className="text-right tabular-nums">{rate.buy.toFixed(3)}</div>
                <div className="text-right tabular-nums">{rate.sell.toFixed(3)}</div>
                <div className={cn("text-right tabular-nums", rateTone(rate.changeBuy))}>
                  {rate.changeBuy === null ? "--" : `${rate.changeBuy > 0 ? "+" : ""}${rate.changeBuy.toFixed(3)}`}
                </div>
              </div>
            ))}
            {rates.length === 0 && (
              <div className="rounded-lg bg-background/6 p-4 text-sm text-muted-foreground">
                Waiting for the first NRB forex pull.
              </div>
            )}
            {rates.length > 0 && filteredRates.length === 0 && (
              <div className="rounded-lg bg-background/6 p-4 text-xs text-muted-foreground">
                No currencies match this filter.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
