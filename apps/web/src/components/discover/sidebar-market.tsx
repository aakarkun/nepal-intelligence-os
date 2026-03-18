"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { fetchNepseSummary, fetchForexRates, fetchMarketAssetQuotes } from "@/lib/api";
import { timeAgo } from "@/lib/utils";

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

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-medium text-foreground">Market Pulse</h3>
      <div className="mt-2 space-y-2 text-sm">
        {hasRealNepse && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">NEPSE</span>
            <span className="tabular-nums">
              {nepse!.index.toLocaleString()}
              {nepse!.changePercent != null && (
                <span
                  className={
                    (nepse!.changePercent ?? 0) >= 0 ? "text-emerald-500" : "text-red-500"
                  }
                >
                  {" "}
                  {(nepse!.changePercent ?? 0) >= 0 ? "+" : ""}
                  {(nepse!.changePercent ?? 0).toFixed(2)}%
                </span>
              )}
              {!open && (
                <span className="ml-1 text-[10px] text-muted-foreground">(closed)</span>
              )}
            </span>
          </div>
        )}
        {usd != null && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">USD/NPR</span>
            <span className="tabular-nums">{usd.buy?.toFixed(2) ?? "—"}</span>
          </div>
        )}
        {inr != null && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">INR/NPR</span>
            <span className="tabular-nums">{inr.buy?.toFixed(2) ?? "—"}</span>
          </div>
        )}
        {aud != null && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">AUD/NPR</span>
            <span className="tabular-nums">{aud.buy?.toFixed(2) ?? "—"}</span>
          </div>
        )}
        {btc != null && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">BTC/USD</span>
            <span className="tabular-nums">
              ${btc.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              {btc.changePercent != null && (
                <span
                  className={
                    (btc.changePercent ?? 0) >= 0 ? "text-emerald-500" : "text-red-500"
                  }
                >
                  {" "}
                  {(btc.changePercent ?? 0) >= 0 ? "+" : ""}
                  {(btc.changePercent ?? 0).toFixed(2)}%
                </span>
              )}
            </span>
          </div>
        )}
        {gold != null && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Gold (XAU)</span>
            <span className="tabular-nums">
              ${gold.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              {gold.changePercent != null && (
                <span
                  className={
                    (gold.changePercent ?? 0) >= 0 ? "text-emerald-500" : "text-red-500"
                  }
                >
                  {" "}
                  {(gold.changePercent ?? 0) >= 0 ? "+" : ""}
                  {(gold.changePercent ?? 0).toFixed(2)}%
                </span>
              )}
            </span>
          </div>
        )}
      </div>
      {updatedAt && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          Updated {timeAgo(updatedAt)}
        </p>
      )}
      <Link
        href="/economy"
        className="mt-2 block text-xs text-nepal-red hover:underline"
      >
        View full economy →
      </Link>
    </div>
  );
}
