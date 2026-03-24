"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Minus, Search } from "lucide-react";
import {
  fetchEconomySummary,
  fetchFeed,
  fetchForexRates,
  fetchMarketAssetQuotes,
  fetchNepseHistory,
  fetchNepseSummary,
} from "@/lib/api";
import { buildNepseSparkSeries, type NepseSparkSeries } from "@/lib/nepse-index-spark";
import {
  dedupeSignalEventsByTitle,
  formatNepalDateTime,
  formatNumber,
  timeAgo,
} from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { IntelRailSections } from "@/components/layout/intel-rail";
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
  "gold",
  "silver",
  "bullion",
  "hallmark",
  "suna",
  "chandi",
  "सुन",
  "चाँदी",
];

const SENTIMENT_NEGATIVE =
  /\b(fall|falls|down|drop|decline|bearish|decrease|slump|weakens)\b/i;
const SENTIMENT_POSITIVE =
  /\b(rise|rises|up|gain|bullish|increase|surge|strong|soar|rally)\b/i;

function inferBearish(title: string, body: string): boolean {
  return SENTIMENT_NEGATIVE.test(`${title} ${body}`);
}

function inferBullish(title: string, body: string): boolean {
  return SENTIMENT_POSITIVE.test(`${title} ${body}`);
}

const TRACKED_CODES = ["AUD", "USD", "EUR", "GBP"] as const;

const panelClass = "border border-white/10 bg-[#0a0a0a] rounded-xl relative overflow-hidden";
const headerClass = "text-[10px] font-mono uppercase tracking-[0.15em] text-[#888] px-4 py-2.5 border-b border-white/10 bg-[#111] flex items-center gap-2";

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function useOnline() {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true
  );
}

function useSecondTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
}

function IntelDelta({ change }: { change: number | null }) {
  if (change === null || change === 0) return <span className="text-[11px] font-mono text-[#555]">0.00</span>;
  const isPos = change > 0;
  return (
    <span className={cn("text-[11px] font-mono", isPos ? "text-emerald-400/80" : "text-rose-400/80")}>
      {isPos ? "+" : ""}{change.toFixed(2)}
    </span>
  );
}

function LiveIndicator({ dataUpdatedAt }: { dataUpdatedAt: number }) {
  useSecondTick();
  const online = useOnline();

  const label = !online
    ? "SYS: OFFLINE"
    : !dataUpdatedAt
      ? "SYS: AWAITING SYNC"
      : `SYNC: ${timeAgo(new Date(dataUpdatedAt).toISOString()).toUpperCase()}`;

  const live = online && dataUpdatedAt > 0;

  return (
    <div className="flex items-center gap-2 font-mono text-[10px] tracking-wider">
      <span className={cn("h-1.5 w-1.5 rounded-full", live ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
      <span className={live ? "text-emerald-500/80" : "text-rose-500/80"}>{label}</span>
    </div>
  );
}

const REF_ASSETS = ["BTC", "ETH", "XAU", "XAG"] as const;

export default function EconomyPage() {
  const { data: summary } = useQuery({
    queryKey: ["economy", "summary"],
    queryFn: fetchEconomySummary,
    refetchInterval: 30 * 60 * 1000,
  });

  const { data: rates = [], dataUpdatedAt: forexUpdatedAt } = useQuery({
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

  const { data: nepseHistory = [] } = useQuery({
    queryKey: ["economy", "nepse", "history"],
    queryFn: () => fetchNepseHistory(500),
    refetchInterval: 30 * 60 * 1000,
  });

  const { data: feedData } = useQuery({
    queryKey: ["feed", "economy-context"],
    queryFn: () => fetchFeed(120, 0),
    refetchInterval: 30_000,
  });

  const [rateQuery, setRateQuery] = useState("");

  const filteredRates = useMemo(() => {
    const q = rateQuery.trim().toLowerCase();
    if (!q) return rates;
    return rates.filter((rate) => {
      const haystack = `${rate.currencyCode} ${rate.currencyName}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [rates, rateQuery]);

  const globalRefQuotes = useMemo(() => {
    const want = new Set<string>(REF_ASSETS);
    return [...assetQuotes]
      .filter((q) => want.has(q.assetCode))
      .sort((a, b) => {
        const ia = REF_ASSETS.indexOf(a.assetCode as (typeof REF_ASSETS)[number]);
        const ib = REF_ASSETS.indexOf(b.assetCode as (typeof REF_ASSETS)[number]);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      });
  }, [assetQuotes]);

  const topNews = useMemo(() => {
    const events = feedData?.events ?? [];
    const filtered = events.filter((event) => {
      const haystack = `${event.title} ${event.body} ${event.source ?? ""}`.toLowerCase();
      return ECONOMY_KEYWORDS.some((keyword) => haystack.includes(keyword));
    });
    return dedupeSignalEventsByTitle(filtered);
  }, [feedData]);

  const signalSentiment = useMemo(() => {
    const slice = topNews.slice(0, 8);
    let bear = 0;
    let bull = 0;
    for (const e of slice) {
      const t = `${e.title} ${e.body}`;
      if (inferBearish(e.title, e.body)) bear++;
      else if (inferBullish(e.title, e.body)) bull++;
      else if (SENTIMENT_NEGATIVE.test(t)) bear++;
      else if (SENTIMENT_POSITIVE.test(t)) bull++;
    }
    if (bear === 0 && bull === 0) return "bullish" as const;
    return bear >= bull ? ("bearish" as const) : ("bullish" as const);
  }, [topNews]);

  const nepseSparkSeries = useMemo(
    () => buildNepseSparkSeries(nepseHistory),
    [nepseHistory]
  );

  return (
    <div className={cn("-mx-4 px-4 pb-10 md:-mx-6 md:px-6 min-h-full bg-[#050505] text-[#e5e5e5] antialiased")}>
      
      {/* Header */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between border-b border-white/10 pb-4 pt-2">
        <div>
          <h1 className="font-mono text-lg uppercase tracking-[0.2em] text-[#e5e5e5]">
            Macroeconomic Intelligence
          </h1>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[#888]">
            Nepal Rastra Bank · NEPSE · Global Commodities
          </p>
        </div>
        <LiveIndicator dataUpdatedAt={forexUpdatedAt} />
      </div>

      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1 space-y-4">
          
          {/* Top Indicators Strip */}
          <div className={cn(panelClass, "flex flex-wrap divide-x divide-white/10")}>
            {/* NEPSE */}
            <div className="flex-1 min-w-[140px] p-3 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-mono text-[#888] uppercase tracking-wider mb-1">NEPSE Index</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-mono text-[#e5e5e5]">
                    {nepse?.index ? nepse.index.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}
                  </span>
                  <IntelDelta change={nepse?.change ?? null} />
                </div>
              </div>
              {nepseSparkSeries && (
                <div className="mt-2 h-6 flex items-end gap-[1px] opacity-60">
                  {nepseSparkSeries.values.map((v, i) => {
                    const min = Math.min(...nepseSparkSeries.values);
                    const max = Math.max(...nepseSparkSeries.values);
                    const span = max - min || 1;
                    const pct = 10 + ((v - min) / span) * 90;
                    return <div key={i} className="flex-1 bg-emerald-500/50 min-w-[2px]" style={{ height: `${pct}%` }} />
                  })}
                </div>
              )}
            </div>
            
            {/* FX Tracked */}
            {TRACKED_CODES.map((code) => {
              const rate = rates.find((r) => r.currencyCode === code);
              return (
                <div key={code} className="flex-1 min-w-[120px] p-3 flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-mono text-[#888] uppercase tracking-wider mb-1">{code}/NPR</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-mono text-[#e5e5e5]">
                        {rate ? rate.buy.toFixed(2) : "—"}
                      </span>
                      {rate && <IntelDelta change={rate.changeBuy} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            
            {/* Left Column */}
            <div className="xl:col-span-2 space-y-4">
              
              {/* FX Matrix */}
              <div className={panelClass}>
                <div className={headerClass}>
                  <span className="h-1.5 w-1.5 bg-blue-500/80 rounded-full"></span>
                  Official Exchange Rates (NRB)
                </div>
                <div className="p-2 border-b border-white/10 bg-[#0d0d0d]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-[#555]" />
                    <input
                      type="search"
                      value={rateQuery}
                      onChange={(e) => setRateQuery(e.target.value)}
                      placeholder="FILTER CURRENCIES..."
                      className="w-full bg-transparent border-none text-[11px] font-mono text-[#ccc] placeholder:text-[#555] pl-8 py-1.5 focus:outline-none focus:ring-0"
                    />
                  </div>
                </div>
                <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#0a0a0a] border-b border-white/10 z-10">
                      <tr>
                        <th className="px-4 py-2 text-[10px] font-mono text-[#555] font-normal uppercase">Code</th>
                        <th className="px-4 py-2 text-[10px] font-mono text-[#555] font-normal uppercase text-right">Buy</th>
                        <th className="px-4 py-2 text-[10px] font-mono text-[#555] font-normal uppercase text-right">Sell</th>
                        <th className="px-4 py-2 text-[10px] font-mono text-[#555] font-normal uppercase text-right">Delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredRates.map((rate) => (
                        <tr key={rate.currencyCode} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[12px] text-[#e5e5e5]">{rate.currencyCode}</span>
                              <span className="font-mono text-[10px] text-[#555] truncate max-w-[120px]">{rate.currencyName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-[12px] text-[#ccc]">{rate.buy.toFixed(3)}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-[12px] text-[#ccc]">{rate.sell.toFixed(3)}</td>
                          <td className="px-4 py-2.5 text-right"><IntelDelta change={rate.changeBuy} /></td>
                        </tr>
                      ))}
                      {filteredRates.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center font-mono text-[11px] text-[#555]">
                            NO DATA MATCHING FILTER
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Strategic Commodities */}
              <div className={panelClass}>
                <div className={headerClass}>
                  <span className="h-1.5 w-1.5 bg-amber-500/80 rounded-full"></span>
                  Strategic Commodities
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/10">
                  {REF_ASSETS.map((code) => {
                    const quote = globalRefQuotes.find((q) => q.assetCode === code);
                    return (
                      <div key={code} className="p-3">
                        <div className="text-[10px] font-mono text-[#888] uppercase tracking-wider mb-1">{quote?.assetName ?? code}</div>
                        <div className="flex flex-col gap-1">
                          <span className="text-lg font-mono text-[#e5e5e5]">
                            {quote ? quote.price.toLocaleString("en-US", { maximumFractionDigits: code === "BTC" ? 0 : 2 }) : "—"}
                          </span>
                          {quote && <IntelDelta change={quote.change} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Right Column */}
            <div className="space-y-4">
              
              {/* Intelligence Signals */}
              <div className={panelClass}>
                <div className={headerClass}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", signalSentiment === "bearish" ? "bg-rose-500/80" : "bg-emerald-500/80")}></span>
                  Intelligence Signals
                </div>
                <div className="max-h-[400px] overflow-y-auto divide-y divide-white/5 scrollbar-thin">
                  {topNews.slice(0, 8).map((event, i) => {
                    const bearish = inferBearish(event.title, event.body);
                    const bullish = inferBullish(event.title, event.body);
                    return (
                      <div key={i} className="p-3 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-mono text-[9px] text-[#555]">[{timeAgo(event.timestamp).toUpperCase()}]</span>
                          <span className="font-mono text-[9px] text-[#888] uppercase bg-white/5 px-1.5 py-0.5 rounded-md">{event.source ?? "SYS"}</span>
                          {(bearish || bullish) && (
                            <span className={cn("font-mono text-[9px] uppercase px-1.5 py-0.5 rounded-md", bearish ? "text-rose-400 bg-rose-400/10" : "text-emerald-400 bg-emerald-400/10")}>
                              {bearish ? "RISK" : "OPP"}
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-[#ccc] leading-snug font-sans">{event.title}</p>
                      </div>
                    );
                  })}
                  {topNews.length === 0 && (
                    <div className="p-4 text-[11px] font-mono text-[#555]">NO SIGNALS DETECTED.</div>
                  )}
                </div>
              </div>

              {/* Volatility Watch */}
              <div className={panelClass}>
                <div className={headerClass}>
                  <span className="h-1.5 w-1.5 bg-purple-500/80 rounded-full"></span>
                  Volatility Watch (Movers)
                </div>
                <div className="divide-y divide-white/5">
                  {(summary?.topMovers ?? []).map((mover, i) => (
                    <div key={mover.currencyCode} className="flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] text-[#555] w-4">{i + 1}</span>
                        <div>
                          <div className="font-mono text-[12px] text-[#e5e5e5]">{mover.currencyCode}</div>
                          <div className="font-mono text-[9px] text-[#555] truncate max-w-[80px]">{mover.currencyName}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-[12px] text-[#ccc]">{mover.buy.toFixed(3)}</div>
                        <IntelDelta change={mover.changeBuy} />
                      </div>
                    </div>
                  ))}
                  {(summary?.topMovers ?? []).length === 0 && (
                    <div className="p-4 text-[11px] font-mono text-[#555]">AWAITING VOLATILITY DATA.</div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Sidebar (Intel Rail) */}
        <aside className="hidden w-[300px] shrink-0 overflow-hidden lg:block">
          <div className="space-y-3">
            <IntelRailSections />
          </div>
        </aside>
      </div>
    </div>
  );
}
