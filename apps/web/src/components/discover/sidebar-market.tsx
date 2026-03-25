"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { fetchNepseSummary, fetchForexRates, fetchMarketAssetQuotes } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import {
  DiscoverRailPanel,
  discoverSidebarFooterStrip,
} from "@/components/discover/discover-rail-panel";
import { cn } from "@/lib/utils";

const NEPAL_TZ = "Asia/Kathmandu";

function isNepseOpen(): boolean {
  const now = new Date();
  const npt = new Date(now.toLocaleString("en-US", { timeZone: NEPAL_TZ }));
  const day = npt.getDay();
  const hour = npt.getHours();
  const min = npt.getMinutes();
  const minutes = hour * 60 + min;
  if (day === 0 || day === 6) return false;
  return minutes >= 11 * 60 && minutes < 15 * 60;
}

export function computePercentChange(current: number, previous: number | null): number | null {
  if (previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function computeGoldNprPerTola(
  xauUsdPerOunce: number,
  usdNpr: number
): number {
  return xauUsdPerOunce * usdNpr * (11.6638038 / 31.1034768);
}

export function SidebarMarket() {
  const { data: nepse } = useQuery({
    queryKey: ["economy", "nepse"],
    queryFn: () => fetchNepseSummary(),
    refetchInterval: 60_000,
  });
  const { data: forex = [] } = useQuery({
    queryKey: ["economy", "forex"],
    queryFn: () => fetchForexRates(),
    refetchInterval: 60_000,
  });
  const { data: assets = [] } = useQuery({
    queryKey: ["economy", "assets"],
    queryFn: () => fetchMarketAssetQuotes(),
    refetchInterval: 60_000,
  });

  const usd = forex.find((f) => f.currencyCode === "USD");
  const inr = forex.find((f) => f.currencyCode === "INR");
  const aud = forex.find((f) => f.currencyCode === "AUD");
  const btc = assets.find((a) => a.assetCode === "BTC" || a.assetCode?.toLowerCase() === "btc");
  const gold = assets.find((a) => a.assetCode === "XAU" || a.assetCode?.toLowerCase().includes("gold"));

  const hasRealNepse = nepse != null && nepse.index > 0;
  const hasAny =
    hasRealNepse ||
    usd != null ||
    inr != null ||
    aud != null ||
    btc != null ||
    gold != null;

  if (!hasAny) return null;

  const open = isNepseOpen();
  const updatedAt = nepse?.timestamp ?? usd?.publishedOn ?? usd?.date ?? assets[0]?.timestamp;
  const btcPercent = btc
    ? computePercentChange(btc.price, btc.previousPrice) ?? btc.changePercent
    : null;
  const goldPercent = gold
    ? computePercentChange(gold.price, gold.previousPrice) ?? gold.changePercent
    : null;
  const goldNprPerTola =
    gold == null
      ? null
      : gold.currency === "NPR"
        ? gold.price
        : usd
          ? computeGoldNprPerTola(gold.price, usd.buy)
          : null;

  return (
    <DiscoverRailPanel title="Market pulse" leadingDotClass="bg-cyan-500">
      <div className="flex flex-col gap-0">
        <div className="overflow-hidden rounded-xl">
          <div
            className={cn(
              "overflow-hidden bg-[#181818]/60",
              "rounded-t-xl rounded-bl-xl rounded-br-xl font-mono text-[13px]"
            )}
          >
        {hasRealNepse && (
          <div className="flex justify-between gap-2 px-3 py-1.5">
            <span className="text-[#888]">NEPSE</span>
            <span className="tabular-nums text-[#e5e5e5]">
              {nepse!.index.toLocaleString()}
              {nepse!.changePercent != null && (
                <span
                  className={
                    (nepse!.changePercent ?? 0) >= 0 ? "text-emerald-400/80" : "text-rose-400/80"
                  }
                >
                  {" "}
                  {(nepse!.changePercent ?? 0) >= 0 ? "+" : ""}
                  {(nepse!.changePercent ?? 0).toFixed(2)}%
                </span>
              )}
              {!open && (
                <span className="ml-1 text-[11px] text-[#555]">(closed)</span>
              )}
            </span>
          </div>
        )}
        {usd != null && (
          <div className="flex justify-between gap-2 px-3 py-1.5">
            <span className="text-[#888]">USD/NPR</span>
            <span className="tabular-nums text-[#e5e5e5]">
              {usd.buy?.toFixed(2) ?? "—"}
              {(() => {
                const usdPercent = computePercentChange(usd.buy, usd.previousBuy);
                if (usdPercent == null) return null;
                return (
                  <span className={usdPercent >= 0 ? "text-emerald-400/80" : "text-rose-400/80"}>
                    {" "}
                    {usdPercent >= 0 ? "+" : ""}
                    {usdPercent.toFixed(2)}%
                  </span>
                );
              })()}
            </span>
          </div>
        )}
        {inr != null && (
          <div className="flex justify-between gap-2 px-3 py-1.5">
            <span className="text-[#888]">INR/NPR</span>
            <span className="tabular-nums text-[#e5e5e5]">
              {inr.buy?.toFixed(2) ?? "—"}
              {(() => {
                const inrPercent = computePercentChange(inr.buy, inr.previousBuy);
                if (inrPercent == null) return null;
                return (
                  <span className={inrPercent >= 0 ? "text-emerald-400/80" : "text-rose-400/80"}>
                    {" "}
                    {inrPercent >= 0 ? "+" : ""}
                    {inrPercent.toFixed(2)}%
                  </span>
                );
              })()}
            </span>
          </div>
        )}
        {aud != null && (
          <div className="flex justify-between gap-2 px-3 py-1.5">
            <span className="text-[#888]">AUD/NPR</span>
            <span className="tabular-nums text-[#e5e5e5]">
              {aud.buy?.toFixed(2) ?? "—"}
              {(() => {
                const audPercent = computePercentChange(aud.buy, aud.previousBuy);
                if (audPercent == null) return null;
                return (
                  <span className={audPercent >= 0 ? "text-emerald-400/80" : "text-rose-400/80"}>
                    {" "}
                    {audPercent >= 0 ? "+" : ""}
                    {audPercent.toFixed(2)}%
                  </span>
                );
              })()}
            </span>
          </div>
        )}
        {btc != null && (
          <div className="flex justify-between gap-2 px-3 py-1.5">
            <span className="text-[#888]">BTC/USD</span>
            <span className="tabular-nums text-[#e5e5e5]">
              ${btc.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              {btcPercent != null && (
                <span
                  className={
                    (btcPercent ?? 0) >= 0 ? "text-emerald-400/80" : "text-rose-400/80"
                  }
                >
                  {" "}
                  {(btcPercent ?? 0) >= 0 ? "+" : ""}
                  {(btcPercent ?? 0).toFixed(2)}%
                </span>
              )}
            </span>
          </div>
        )}
        {gold != null && (
          <div className="flex justify-between gap-2 px-3 py-1.5">
            <span className="text-[#888]">
              {gold.currency === "NPR" ? "XAU/NPR (tola)" : "XAU/USD"}
            </span>
            <span className="tabular-nums text-[#e5e5e5]">
              {gold.currency === "NPR" ? "रु " : "$"}
              {gold.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              {goldPercent != null && (
                <span
                  className={
                    (goldPercent ?? 0) >= 0 ? "text-emerald-400/80" : "text-rose-400/80"
                  }
                >
                  {" "}
                  {(goldPercent ?? 0) >= 0 ? "+" : ""}
                  {(goldPercent ?? 0).toFixed(2)}%
                </span>
              )}
              {gold.change != null && (
                <span className={gold.change >= 0 ? "text-emerald-400/80" : "text-rose-400/80"}>
                  {" "}
                  ({gold.change >= 0 ? "+" : ""}
                  {gold.change.toLocaleString(undefined, { maximumFractionDigits: 0 })})
                </span>
              )}
            </span>
          </div>
        )}
        {goldNprPerTola != null && gold?.currency !== "NPR" && (
          <div className="flex justify-between gap-2 px-3 py-1.5">
            <span className="text-[#888]">XAU/NPR (tola)</span>
            <span className="tabular-nums text-[#e5e5e5]">
              रु {goldNprPerTola.toLocaleString("en-NP", { maximumFractionDigits: 0 })}
            </span>
          </div>
        )}
        {updatedAt && (
          <p className="px-3 pt-1.5 pb-2 font-mono text-[11px] uppercase tracking-wider text-[#555]">
            Updated {timeAgo(updatedAt)}
          </p>
        )}
          </div>
          <div className={discoverSidebarFooterStrip}>
            <Link
              href="/economy"
              className="font-mono text-[12px] uppercase tracking-wider text-emerald-400/90 hover:underline"
            >
              View full economy →
            </Link>
          </div>
        </div>
      </div>
    </DiscoverRailPanel>
  );
}
