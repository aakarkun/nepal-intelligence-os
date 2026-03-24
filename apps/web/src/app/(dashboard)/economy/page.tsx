"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Minus, Search } from "lucide-react";
import {
  fetchEconomySummary,
  fetchFeed,
  fetchForexRates,
  fetchMarketAssetQuotes,
  fetchNepseHistory,
  fetchNepseSummary,
} from "@/lib/api";
import { buildNepseSparkSeries } from "@/lib/nepse-index-spark";
import { dedupeSignalEventsByTitle, timeAgo } from "@/lib/utils";
import {
  IntelRailSections,
  RailPanelHeader,
  railCardInset,
  railListBody,
  railPagination,
  railRow,
  railShell,
} from "@/components/layout/intel-rail";
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
      <span className={cn("h-1.5 w-1.5 rounded-sm", live ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
      <span className={live ? "text-emerald-500/80" : "text-rose-500/80"}>{label}</span>
    </div>
  );
}

const REF_ASSETS = ["BTC", "ETH", "XAU", "XAG"] as const;

/** Official FX table: max 8 rows per page (Source Health–style pagination). */
const FX_ROWS_PER_PAGE = 8;

/** Intelligence Signals: same page size as FX for consistent rail UX. */
const SIGNALS_ROWS_PER_PAGE = 8;

const fxRowCellBg =
  "bg-[#181818]/60 transition-colors duration-150 group-hover:bg-white/[0.06]";

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

  const panelOpen = useSelector((s: RootState) => s.ui.intelRailOpen);
  const [rateQuery, setRateQuery] = useState("");
  const [fxPage, setFxPage] = useState(0);
  const [signalsPage, setSignalsPage] = useState(0);

  const filteredRates = useMemo(() => {
    const q = rateQuery.trim().toLowerCase();
    if (!q) return rates;
    return rates.filter((rate) => {
      const haystack = `${rate.currencyCode} ${rate.currencyName}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [rates, rateQuery]);

  useEffect(() => {
    setFxPage(0);
  }, [rateQuery]);

  const fxTotalPages = Math.ceil(filteredRates.length / FX_ROWS_PER_PAGE) || 1;

  useEffect(() => {
    setFxPage((p) => Math.min(p, Math.max(0, fxTotalPages - 1)));
  }, [fxTotalPages]);

  const fxPageSafe = Math.min(fxPage, Math.max(0, fxTotalPages - 1));
  const paginatedFxRates = useMemo(
    () =>
      filteredRates.slice(
        fxPageSafe * FX_ROWS_PER_PAGE,
        (fxPageSafe + 1) * FX_ROWS_PER_PAGE
      ),
    [filteredRates, fxPageSafe]
  );
  const showFxPagination = filteredRates.length > 0 && fxTotalPages > 1;

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

  const signalsTotalPages = Math.ceil(topNews.length / SIGNALS_ROWS_PER_PAGE) || 1;

  useEffect(() => {
    setSignalsPage((p) => Math.min(p, Math.max(0, signalsTotalPages - 1)));
  }, [signalsTotalPages]);

  const signalsPageSafe = Math.min(signalsPage, Math.max(0, signalsTotalPages - 1));
  const paginatedSignals = useMemo(
    () =>
      topNews.slice(
        signalsPageSafe * SIGNALS_ROWS_PER_PAGE,
        (signalsPageSafe + 1) * SIGNALS_ROWS_PER_PAGE
      ),
    [topNews, signalsPageSafe]
  );
  const showSignalsPagination = topNews.length > 0 && signalsTotalPages > 1;

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
          <div className={railShell}>
            <RailPanelHeader title="Market snapshot" leadingDotClass="bg-emerald-500" />
            <div className={cn(railListBody, "rounded-b-xl")}>
              <div className={cn("flex flex-wrap gap-2", railCardInset)}>
                {/* NEPSE */}
                <div className="flex min-w-[140px] flex-1 flex-col justify-between rounded-xl bg-[#181818]/60 p-3">
                  <div>
                    <div className="mb-1 text-[10px] font-mono uppercase tracking-wider text-[#888]">
                      NEPSE Index
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-mono text-[#e5e5e5]">
                        {nepse?.index
                          ? nepse.index.toLocaleString(undefined, { minimumFractionDigits: 2 })
                          : "—"}
                      </span>
                      <IntelDelta change={nepse?.change ?? null} />
                    </div>
                  </div>
                  {nepseSparkSeries && (
                    <div className="mt-2 flex h-6 items-end gap-[1px] opacity-60">
                      {nepseSparkSeries.values.map((v, i) => {
                        const min = Math.min(...nepseSparkSeries.values);
                        const max = Math.max(...nepseSparkSeries.values);
                        const span = max - min || 1;
                        const pct = 10 + ((v - min) / span) * 90;
                        return (
                          <div
                            key={i}
                            className="min-w-[2px] flex-1 bg-emerald-500/50"
                            style={{ height: `${pct}%` }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                {TRACKED_CODES.map((code) => {
                  const rate = rates.find((r) => r.currencyCode === code);
                  return (
                    <div
                      key={code}
                      className="flex min-w-[120px] flex-1 flex-col justify-between rounded-xl bg-[#181818]/60 p-3"
                    >
                      <div>
                        <div className="mb-1 text-[10px] font-mono uppercase tracking-wider text-[#888]">
                          {code}/NPR
                        </div>
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
            </div>
          </div>

          {/* Main Grid — right column narrower than 1/3 (9+3 of 12 ≈ 75% / 25%) */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            {/* Left Column */}
            <div className="min-w-0 space-y-4 xl:col-span-9">
              
              {/* FX Matrix */}
              <div className={railShell}>
                <RailPanelHeader
                  title="Official Exchange Rates (NRB)"
                  leadingDotClass="bg-blue-500"
                />
                <div className="bg-[#0c0c0c] px-1 py-2">
                  <div className="flex items-center gap-2 px-3">
                    <Search className="h-3 w-3 shrink-0 text-[#555]" aria-hidden />
                    <input
                      type="search"
                      value={rateQuery}
                      onChange={(e) => setRateQuery(e.target.value)}
                      placeholder="FILTER CURRENCIES..."
                      className="min-w-0 flex-1 border-none bg-transparent py-1.5 pl-0 font-mono text-[11px] text-[#ccc] placeholder:text-[#555] focus:outline-none focus:ring-0"
                    />
                  </div>
                </div>
                {/*
                  Paginated (≤8 rows per page). Bottom row radius only when no pagination footer.
                */}
                <div
                  className={cn(
                    railListBody,
                    "overflow-hidden rounded-t-xl",
                    !showFxPagination && filteredRates.length > 0 && "rounded-b-xl"
                  )}
                >
                  <div className="px-1 pb-1 pt-0">
                  {/*
                    border-separate + solid th bg: header matches main card (#0c0c0c), no alpha.
                  */}
                  <table className="w-full border-separate border-spacing-0 text-left">
                    {/*
                      Single rounded clip on thead + solid bg so tbody row color never shows through
                      the header’s corners (per-th rounded cells can anti-alias over the first row).
                    */}
                    <thead className="overflow-hidden rounded-t-xl bg-[#0c0c0c]">
                      <tr className="border-b border-white/[0.06]">
                        <th
                          scope="col"
                          className="rounded-tl-xl border-0 bg-[#0c0c0c] px-3 py-3 text-left font-mono text-[11px] font-normal uppercase leading-none tracking-[0.08em] text-[#a1a1aa]"
                        >
                          Code
                        </th>
                        <th
                          scope="col"
                          className="border-0 bg-[#0c0c0c] px-3 py-3 text-right font-mono text-[11px] font-normal uppercase leading-none tracking-[0.08em] text-[#a1a1aa]"
                        >
                          Buy
                        </th>
                        <th
                          scope="col"
                          className="border-0 bg-[#0c0c0c] px-3 py-3 text-right font-mono text-[11px] font-normal uppercase leading-none tracking-[0.08em] text-[#a1a1aa]"
                        >
                          Sell
                        </th>
                        <th
                          scope="col"
                          className="rounded-tr-xl border-0 bg-[#0c0c0c] px-3 py-3 text-right font-mono text-[11px] font-normal uppercase leading-none tracking-[0.08em] text-[#a1a1aa]"
                        >
                          Delta
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedFxRates.map((rate, idx) => {
                        const isFirstRowOnPage = idx === 0;
                        const isLastRowOnPage = idx === paginatedFxRates.length - 1;
                        const roundBottom = isLastRowOnPage;
                        return (
                          <tr key={rate.currencyCode} className="group">
                            <td
                              className={cn(
                                "px-3 py-3",
                                fxRowCellBg,
                                isFirstRowOnPage && "rounded-tl-xl",
                                roundBottom && "rounded-bl-xl"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[12px] text-[#e5e5e5]">
                                  {rate.currencyCode}
                                </span>
                                <span className="max-w-[120px] truncate font-mono text-[10px] text-[#555]">
                                  {rate.currencyName}
                                </span>
                              </div>
                            </td>
                            <td
                              className={cn(
                                "px-3 py-3 text-right font-mono text-[12px] text-[#ccc]",
                                fxRowCellBg
                              )}
                            >
                              {rate.buy.toFixed(3)}
                            </td>
                            <td
                              className={cn(
                                "px-3 py-3 text-right font-mono text-[12px] text-[#ccc]",
                                fxRowCellBg
                              )}
                            >
                              {rate.sell.toFixed(3)}
                            </td>
                            <td
                              className={cn(
                                "px-3 py-3 text-right",
                                fxRowCellBg,
                                isFirstRowOnPage && "rounded-tr-xl",
                                roundBottom && "rounded-br-xl"
                              )}
                            >
                              <IntelDelta change={rate.changeBuy} />
                            </td>
                          </tr>
                        );
                      })}
                      {filteredRates.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="rounded-b-xl px-3 py-6 text-center font-mono text-[11px] text-[#555]"
                          >
                            NO DATA MATCHING FILTER
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  </div>

                  {showFxPagination && (
                    <div className={cn(railPagination, "flex items-center justify-between rounded-b-xl")}>
                      <span className="font-mono text-[9px] text-[#555]">
                        PAGE {fxPageSafe + 1} OF {fxTotalPages}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setFxPage((p) => Math.max(0, p - 1))}
                          disabled={fxPageSafe === 0}
                          className="rounded p-1 transition-colors hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
                          aria-label="Previous page"
                        >
                          <ChevronLeft className="h-3 w-3 text-[#888]" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFxPage((p) => Math.min(fxTotalPages - 1, p + 1))
                          }
                          disabled={fxPageSafe >= fxTotalPages - 1}
                          className="rounded p-1 transition-colors hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
                          aria-label="Next page"
                        >
                          <ChevronRight className="h-3 w-3 text-[#888]" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Strategic Commodities */}
              <div className={railShell}>
                <RailPanelHeader
                  title="Strategic Commodities"
                  leadingDotClass="bg-amber-500"
                />
                <div className={cn(railListBody, "rounded-b-xl")}>
                  <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2", railCardInset)}>
                    {REF_ASSETS.map((code) => {
                      const quote = globalRefQuotes.find((q) => q.assetCode === code);
                      return (
                        <div key={code} className="rounded-xl bg-[#181818]/60 p-3">
                          <div className="mb-1 text-[10px] font-mono uppercase tracking-wider text-[#888]">
                            {quote?.assetName ?? code}
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="font-mono text-lg text-[#e5e5e5]">
                              {quote
                                ? quote.price.toLocaleString("en-US", {
                                    maximumFractionDigits: code === "BTC" ? 0 : 2,
                                  })
                                : "—"}
                            </span>
                            {quote && <IntelDelta change={quote.change} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column */}
            <div className="min-w-0 space-y-4 xl:col-span-3">
              
              {/* Intelligence Signals */}
              <div className={railShell}>
                <RailPanelHeader
                  title="Intelligence Signals"
                  leadingDotClass={
                    signalSentiment === "bearish" ? "bg-rose-500" : "bg-emerald-500"
                  }
                />
                <div
                  className={cn(
                    railListBody,
                    "overflow-hidden rounded-t-xl",
                    !showSignalsPagination && topNews.length > 0 && "rounded-b-xl"
                  )}
                >
                  <div className={railCardInset}>
                    <div className="flex flex-col">
                      {paginatedSignals.map((event, i) => {
                        const bearish = inferBearish(event.title, event.body);
                        const bullish = inferBullish(event.title, event.body);
                        const isFirst = i === 0;
                        const isLast = i === paginatedSignals.length - 1;
                        return (
                          <div
                            key={`${event.timestamp}-${signalsPageSafe}-${i}`}
                            className={cn(
                              railRow,
                              isFirst && "rounded-t-xl",
                              isLast && "rounded-b-xl"
                            )}
                          >
                            <div className="mb-1.5 flex min-w-0 items-center justify-between gap-2">
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <span className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[9px] uppercase text-[#888]">
                                  {event.source ?? "SYS"}
                                </span>
                                {(bearish || bullish) && (
                                  <span
                                    className={cn(
                                      "rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase",
                                      bearish
                                        ? "bg-rose-400/10 text-rose-400"
                                        : "bg-emerald-400/10 text-emerald-400"
                                    )}
                                  >
                                    {bearish ? "RISK" : "OPP"}
                                  </span>
                                )}
                              </div>
                              <span className="shrink-0 font-mono text-[9px] text-[#555]">
                                [{timeAgo(event.timestamp).toUpperCase()}]
                              </span>
                            </div>
                            <p className="font-sans text-[12px] leading-snug text-[#ccc]">{event.title}</p>
                          </div>
                        );
                      })}
                      {topNews.length === 0 && (
                        <div className={cn(railRow, "rounded-t-xl rounded-b-xl")}>
                          <p className="font-mono text-[10px] uppercase text-[#555]">
                            NO SIGNALS DETECTED.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {showSignalsPagination && (
                    <div className={cn(railPagination, "flex items-center justify-between rounded-b-xl")}>
                      <span className="font-mono text-[9px] text-[#555]">
                        PAGE {signalsPageSafe + 1} OF {signalsTotalPages}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSignalsPage((p) => Math.max(0, p - 1))}
                          disabled={signalsPageSafe === 0}
                          className="rounded p-1 transition-colors hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
                          aria-label="Previous page"
                        >
                          <ChevronLeft className="h-3 w-3 text-[#888]" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSignalsPage((p) => Math.min(signalsTotalPages - 1, p + 1))
                          }
                          disabled={signalsPageSafe >= signalsTotalPages - 1}
                          className="rounded p-1 transition-colors hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
                          aria-label="Next page"
                        >
                          <ChevronRight className="h-3 w-3 text-[#888]" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Volatility Watch */}
              <div className={railShell}>
                <RailPanelHeader
                  title="Volatility Watch (Movers)"
                  leadingDotClass="bg-purple-500"
                />
                <div className={cn(railListBody, "rounded-b-xl")}>
                  <div className={cn("flex flex-col", railCardInset)}>
                    {(summary?.topMovers ?? []).map((mover, i, arr) => {
                      const last = i === arr.length - 1;
                      return (
                        <div
                          key={mover.currencyCode}
                          className={cn(
                            railRow,
                            "flex items-start justify-between gap-3",
                            i === 0 && "rounded-t-xl",
                            last && "rounded-b-xl"
                          )}
                        >
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <span className="w-4 shrink-0 pt-0.5 font-mono text-[10px] text-[#555]">
                              {i + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="font-mono text-[12px] text-[#e5e5e5]">
                                {mover.currencyCode}
                              </div>
                              <div className="break-words font-mono text-[9px] leading-snug text-[#555]">
                                {mover.currencyName}
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="font-mono text-[12px] text-[#ccc]">{mover.buy.toFixed(3)}</div>
                            <IntelDelta change={mover.changeBuy} />
                          </div>
                        </div>
                      );
                    })}
                    {(summary?.topMovers ?? []).length === 0 && (
                      <div className={cn(railRow, "rounded-t-xl rounded-b-xl")}>
                        <p className="font-mono text-[10px] uppercase text-[#555]">
                          AWAITING VOLATILITY DATA.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Sidebar (Intel Rail) */}
        <aside
          className={cn(
            "hidden shrink-0 overflow-hidden transition-[transform,opacity,width] duration-200 ease-out lg:block",
            panelOpen
              ? "w-[300px] translate-x-0 opacity-100"
              : "pointer-events-none w-0 translate-x-6 opacity-0"
          )}
        >
          <div className="space-y-3">
            <IntelRailSections />
          </div>
        </aside>
      </div>
    </div>
  );
}
