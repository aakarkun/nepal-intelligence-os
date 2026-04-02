"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { discoverShellClass } from "@/components/discover/discover-rail-tokens";
import { FlatRailPanelHeader } from "@/components/layout/intel-rail";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchUpcomingIssues,
  type UpcomingIssuesApiMeta,
  type UpcomingIssuesApiResponse,
} from "@/lib/api";

export type UpcomingIssueCategory =
  | "ipo"
  | "right"
  | "fpo"
  | "ipo-local"
  | "mutual-fund"
  | "bonds-debentures"
  | "ipo-migrant-workers"
  | "ipo-for-qiis";

export type UpcomingIssueRow = {
  sn: number;
  symbol: string;
  company: string;
  units: number;
  sector: string;
  remark: string;
};

const CATEGORY_LABELS: Record<UpcomingIssueCategory, string> = {
  ipo: "IPO",
  right: "Right",
  fpo: "FPO",
  "ipo-local": "IPO-Local",
  "mutual-fund": "Mutual Fund",
  "bonds-debentures": "Bonds/Debentures",
  "ipo-migrant-workers": "IPO to Migrant Workers",
  "ipo-for-qiis": "IPO for QII's",
};

function formatUnits(n: number) {
  return n.toLocaleString("en-IN");
}

const rowCellBg =
  "bg-white/[0.03] transition-colors duration-150 group-hover:bg-white/[0.08]";

const EMPTY_DATA: Record<UpcomingIssueCategory, UpcomingIssueRow[]> = {
  ipo: [],
  right: [],
  fpo: [],
  "ipo-local": [],
  "mutual-fund": [],
  "bonds-debentures": [],
  "ipo-migrant-workers": [],
  "ipo-for-qiis": [],
};

function splitUpcomingIssuesResponse(
  api: UpcomingIssuesApiResponse | undefined
): { data: Record<string, Array<{ symbol: string; company: string; units: number; sector: string; remark?: string | null }>>; meta?: UpcomingIssuesApiMeta | null } {
  if (!api) return { data: {} };
  const candidate = api as unknown as { data?: unknown; meta?: unknown };
  if (
    candidate &&
    typeof candidate === "object" &&
    "data" in candidate &&
    candidate.data &&
    typeof candidate.data === "object" &&
    !Array.isArray(candidate.data)
  ) {
    return {
      data: candidate.data as Record<
        string,
        Array<{ symbol: string; company: string; units: number; sector: string; remark?: string | null }>
      >,
      meta:
        candidate.meta && typeof candidate.meta === "object" && !Array.isArray(candidate.meta)
          ? (candidate.meta as UpcomingIssuesApiMeta)
          : null,
    };
  }

  return {
    data: api as Record<
      string,
      Array<{ symbol: string; company: string; units: number; sector: string; remark?: string | null }>
    >,
  };
}

function toPanelData(apiData: Record<string, Array<{ symbol: string; company: string; units: number; sector: string; remark?: string | null }>> | undefined) {
  if (!apiData) return EMPTY_DATA;
  const out: Record<UpcomingIssueCategory, UpcomingIssueRow[]> = { ...EMPTY_DATA };
  for (const [category, rows] of Object.entries(apiData)) {
    if (!(category in CATEGORY_LABELS)) continue;
    const c = category as UpcomingIssueCategory;
    out[c] = rows.map((r, idx) => ({
      sn: idx + 1,
      symbol: r.symbol,
      company: r.company,
      units: r.units,
      sector: r.sector,
      remark: r.remark ?? "",
    }));
  }
  return out;
}

function safeDate(input?: string | null): Date | null {
  if (!input) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatRelativeTime(from: Date, to: Date) {
  const deltaMs = to.getTime() - from.getTime();
  const absMs = Math.abs(deltaMs);
  const minutes = Math.round(absMs / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

export function UpcomingIssuePanel({
  defaultCategory = "ipo",
  className,
}: {
  defaultCategory?: UpcomingIssueCategory;
  className?: string;
}) {
  const categories = React.useMemo(
    () => Object.keys(CATEGORY_LABELS) as UpcomingIssueCategory[],
    []
  );

  const {
    data: apiData,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["economy", "upcoming-issues"],
    queryFn: fetchUpcomingIssues,
    refetchInterval: 30 * 60 * 1000,
  });

  const { data: rawData, meta } = React.useMemo(
    () => splitUpcomingIssuesResponse(apiData),
    [apiData]
  );

  const data = React.useMemo(() => toPanelData(rawData), [rawData]);

  const freshness = React.useMemo(() => {
    const ingestedAt = safeDate(meta?.ingestedAt ?? null);
    const asOf = safeDate(meta?.asOf ?? null);
    const updatedAt = ingestedAt ?? asOf;
    if (!updatedAt) return { label: "Update time unavailable", tone: "unknown" as const };
    const now = new Date();
    const ageMs = now.getTime() - updatedAt.getTime();
    const ageLabel = formatRelativeTime(updatedAt, now);
    const isStale = ageMs > 6 * 60 * 60 * 1000;
    return {
      label: isStale ? `Stale (updated ${ageLabel} ago)` : `Updated ${ageLabel} ago`,
      tone: isStale ? ("stale" as const) : ("fresh" as const),
    };
  }, [meta?.asOf, meta?.ingestedAt]);

  return (
    <section className={cn(discoverShellClass, className)} aria-label="Upcoming Issue">
      <FlatRailPanelHeader title="Upcoming issue" leadingDotClass="bg-orange-400" />

      <div className="min-w-0 px-2 pb-2 pt-1">
        <div
          className="mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1"
          aria-live="polite"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 font-sans text-[11px] leading-4",
                freshness.tone === "fresh" && "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
                freshness.tone === "stale" && "border-amber-400/30 bg-amber-500/10 text-amber-100",
                freshness.tone === "unknown" && "border-white/[0.10] bg-white/[0.03] text-[#cfcfcf]"
              )}
            >
              {isPending ? "Updating…" : isError ? "Update time unavailable" : freshness.label}
            </span>
            {!isPending && !isError && meta?.source ? (
              <span className="truncate font-sans text-[11px] text-[#9a9aa2]">
                Source: {meta.source}
              </span>
            ) : null}
          </div>

          {isError ? (
            <span className="font-sans text-[11px] text-rose-300/80">
              Freshness may be outdated.
            </span>
          ) : null}
        </div>

        <Tabs defaultValue={defaultCategory}>
          <div className="overflow-x-auto pb-2">
            <TabsList
              className={cn(
                "inline-flex h-auto w-max gap-2 rounded-none bg-transparent p-0"
              )}
            >
              {categories.map((c) => (
                <TabsTrigger
                  key={c}
                  value={c}
                  className={cn(
                    "h-9 rounded-md border border-white/[0.10] bg-white/[0.03] px-3 font-sans text-[12px] font-medium text-[#ccc] shadow-none",
                    "data-[state=active]:border-white/[0.14] data-[state=active]:bg-white/[0.10] data-[state=active]:text-[#e5e5e5] data-[state=active]:shadow-none"
                  )}
                >
                  {CATEGORY_LABELS[c]}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {categories.map((c) => {
            const rows = data[c] ?? [];
            return (
              <TabsContent key={c} value={c} className="mt-0">
                <div className="overflow-x-auto overflow-hidden rounded-lg">
                  <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left">
                    <thead className="bg-white/[0.04]">
                      <tr className="border-b border-white/[0.06]">
                        {["S.N.", "Symbol", "Company", "Units", "Sector", "Remark"].map((h, i) => (
                          <th
                            key={h}
                            className={cn(
                              "whitespace-nowrap px-2 py-2 font-sans text-[11px] font-normal uppercase tracking-wider text-[#a1a1aa]",
                              i === 2 ? "text-left" : i === 3 ? "text-right" : "text-left"
                            )}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {isPending ? (
                        <tr>
                          <td colSpan={6} className="px-2 py-6 text-center font-sans text-[13px] text-[#888]">
                            Loading upcoming issues…
                          </td>
                        </tr>
                      ) : isError ? (
                        <tr>
                          <td colSpan={6} className="px-2 py-6 text-center font-sans text-[13px] text-rose-300/90">
                            Couldn&apos;t load upcoming issues{error instanceof Error ? `: ${error.message}` : ""}.
                          </td>
                        </tr>
                      ) : rows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-2 py-6 text-center font-sans text-[13px] text-[#555]">
                            <div>No upcoming issues in this category.</div>
                            {meta?.totalRows === 0 ? (
                              <div className="mt-2 max-w-xl mx-auto text-[12px] leading-relaxed text-[#777]">
                                Database has no upcoming-issue rows yet. Run the worker with{" "}
                                <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[11px]">
                                  UPCOMING_ISSUES_SOURCE_URL
                                </code>{" "}
                                (default ShareSansar URL in{" "}
                                <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[11px]">
                                  .env.example
                                </code>
                                ), confirm POST{" "}
                                <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[11px]">
                                  /v1/ingest/economy/upcoming-issues
                                </code>{" "}
                                succeeds, then reload.
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      ) : (
                        rows.map((r) => (
                          <tr key={`${c}-${r.sn}`} className="group">
                            <td className={cn("whitespace-nowrap px-2 py-1.5 font-sans text-[12px] text-[#888]", rowCellBg)}>
                              {r.sn}
                            </td>
                            <td className={cn("whitespace-nowrap px-2 py-1.5 font-mono text-[12px] text-[#e5e5e5]", rowCellBg)}>
                              {r.symbol}
                            </td>
                            <td className={cn("max-w-[340px] truncate px-2 py-1.5 font-sans text-[12px] text-[#ccc]", rowCellBg)}>
                              {r.company}
                            </td>
                            <td className={cn("whitespace-nowrap px-2 py-1.5 text-right font-sans text-[12px] text-[#ccc]", rowCellBg)}>
                              {formatUnits(r.units)}
                            </td>
                            <td className={cn("whitespace-nowrap px-2 py-1.5 font-sans text-[12px] text-[#a1a1aa]", rowCellBg)}>
                              {r.sector}
                            </td>
                            <td className={cn("max-w-[300px] truncate px-2 py-1.5 font-sans text-[12px] text-[#888]", rowCellBg)}>
                              {r.remark}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </section>
  );
}

