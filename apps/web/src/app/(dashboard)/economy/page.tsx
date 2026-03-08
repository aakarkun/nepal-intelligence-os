"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bitcoin,
  CircleDollarSign,
  Coins,
  Gem,
  Landmark,
  RadioTower,
  Scale,
} from "lucide-react";
import {
  fetchEconomySummary,
  fetchFeed,
  fetchForexRates,
  fetchMarketAssetQuotes,
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
        <div className="rounded-md border border-border/30 bg-card/35 px-4 py-3 text-xs text-muted-foreground">
          Source: {summary?.sourceName ?? "Nepal Rastra Bank Forex"} ·{" "}
          {summary ? formatNepalDateTime(summary.timestamp) : "Waiting for first pull"}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {trackedRates.map((rate) => (
          <Card key={rate.currencyCode} className="border-border/30 bg-card/30">
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

      <Card className="border-border/30 bg-card/28">
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

      <div className="grid gap-4 md:grid-cols-3">
        {assetQuotes.map((quote) => {
          const Icon = assetIcon(quote.assetCode);
          return (
            <Card
              key={quote.assetCode}
              className={cn(
                "border-border/30 bg-card/30 transition-colors",
                quote.change !== null && quote.change > 0 && "border-emerald-500/12",
                quote.change !== null && quote.change < 0 && "border-red-500/12"
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

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="overflow-hidden border-border/30 bg-card/30">
          <CardHeader className="border-b border-border/20 pb-4">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="font-display text-lg">NRB FX Board</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 divide-y divide-border/70 md:grid-cols-2 md:divide-x md:divide-y-0">
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
                    <div className="rounded-md border border-border/25 bg-background/16 p-3">
                      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Buy
                      </div>
                      <div className="mt-1 font-display text-2xl font-semibold tabular-nums">
                        {rate.buy.toFixed(3)}
                      </div>
                    </div>
                    <div className="rounded-md border border-border/25 bg-background/16 p-3">
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

        <div className="space-y-4">
          <Card className="border-border/30 bg-card/30">
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
                  className="flex items-center justify-between rounded-md border border-border/25 bg-background/14 px-3 py-2"
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
                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Waiting for direct NRB comparison data.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/30 bg-card/30">
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
                  className="flex items-center justify-between rounded-md border border-border/25 bg-background/14 px-3 py-2"
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
                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No economy source health yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-border/30 bg-card/30">
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-base">Signal Board</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topNews.slice(0, 6).map((event) => (
                <div key={event.id} className="rounded-md border border-border/25 bg-background/14 p-3">
                <div className="text-sm font-medium leading-tight">{event.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {event.source ?? "Unknown source"} · {timeAgo(event.timestamp)}
                </div>
              </div>
            ))}
            {topNews.length === 0 && (
              <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                No economy-tagged context headlines in the current feed window.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/30 bg-card/30">
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-base">Full Rate Ladder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.7fr] gap-2 px-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <div>Currency</div>
              <div className="text-right">Buy</div>
              <div className="text-right">Sell</div>
              <div className="text-right">Delta</div>
            </div>
            <div className="space-y-2">
              {rates.map((rate) => (
                <div
                  key={rate.currencyCode}
                  className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.7fr] items-center gap-2 rounded-md border border-border/25 bg-background/14 px-3 py-2 text-sm"
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
                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Waiting for the first NRB forex pull.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
