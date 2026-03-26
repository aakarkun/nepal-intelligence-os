"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn, formatNumber } from "@/lib/utils";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";
import { fetchDistricts } from "@/lib/api";

type DistrictSummary = Awaited<ReturnType<typeof fetchDistricts>>[number];

const PROVINCE_LABELS: Record<number, string> = {
  1: "Koshi",
  2: "Madhesh",
  3: "Bagmati",
  4: "Gandaki",
  5: "Lumbini",
  6: "Karnali",
  7: "Sudurpashchim",
};

export function RegionalOverview() {
  const { selectedDatasetId } = useElectionDatasetStore();

  const { data: districts = [], isLoading } = useQuery<DistrictSummary[]>({
    queryKey: ["districts", selectedDatasetId],
    queryFn: () => fetchDistricts(selectedDatasetId),
    staleTime: 30_000,
  });

  const [activeProvince, setActiveProvince] = useState<number | "all">("all");

  const provinceAggregates = useMemo(() => {
    const map = new Map<number, { constituencies: number; counted: number; totalVotes: number }>();

    for (const district of districts) {
      const current = map.get(district.provinceId) ?? {
        constituencies: 0,
        counted: 0,
        totalVotes: 0,
      };
      current.constituencies += district.constituencies;
      current.counted += district.counted;
      current.totalVotes += district.totalVotes;
      map.set(district.provinceId, current);
    }

    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([provinceId, agg]) => ({
        provinceId,
        label: PROVINCE_LABELS[provinceId] ?? `Province ${provinceId}`,
        ...agg,
        pct: agg.constituencies > 0 ? Math.round((agg.counted / agg.constituencies) * 100) : 0,
      }));
  }, [districts]);

  const visibleDistricts = useMemo(() => {
    const filtered =
      activeProvince === "all"
        ? districts
        : districts.filter((d) => d.provinceId === activeProvince);

    return [...filtered].sort((a, b) => {
      const aPct = a.constituencies > 0 ? a.counted / a.constituencies : 0;
      const bPct = b.constituencies > 0 ? b.counted / b.constituencies : 0;
      return bPct - aPct || b.totalVotes - a.totalVotes;
    });
  }, [activeProvince, districts]);

  const activeProvinceAggregate = useMemo(() => {
    if (activeProvince === "all") return null;
    return provinceAggregates.find((p) => p.provinceId === activeProvince) ?? null;
  }, [activeProvince, provinceAggregates]);

  if (isLoading && districts.length === 0) {
    return (
      <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <div className="h-40 animate-pulse rounded-xl bg-white/[0.06]" />
        <div className="h-40 animate-pulse rounded-xl bg-white/[0.06]" />
      </div>
    );
  }

  if (districts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[13px] uppercase tracking-wider text-[#a1a1aa]">
            Regional overview
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            By constituencies reported in the selected dataset
          </p>
        </div>

        <div className="flex max-w-full items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setActiveProvince("all")}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs transition-colors",
              "bg-white/[0.06] hover:bg-white/[0.09]",
              activeProvince === "all" && "bg-blue-500/15"
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", activeProvince === "all" ? "bg-blue-400" : "bg-[#555]")} />
            All
          </button>
          {provinceAggregates.map((province) => (
            <button
              key={province.provinceId}
              type="button"
              onClick={() =>
                setActiveProvince((current) =>
                  current === province.provinceId ? "all" : province.provinceId
                )
              }
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs transition-colors",
                "bg-white/[0.06] hover:bg-white/[0.09]",
                activeProvince === province.provinceId && "bg-blue-500/15"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  activeProvince === province.provinceId ? "bg-blue-400" : "bg-[#555]"
                )}
              />
              {province.label}
            </button>
          ))}
        </div>
      </div>

      {activeProvince === "all" ? (
        <div className="rounded-xl bg-[#181818]/60 p-3">
          <div className="mb-3 font-mono text-[12px] uppercase tracking-wider text-[#888]">
            Province overview
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {provinceAggregates.map((province) => (
              <button
                key={province.provinceId}
                type="button"
                onClick={() => setActiveProvince(province.provinceId)}
                className={cn(
                  "flex flex-col items-start rounded-lg bg-[#0c0c0c]/60 px-3 py-2 text-left text-xs transition-colors",
                  "hover:bg-white/[0.04]"
                )}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="font-medium text-[#e5e5e5]">{province.label}</span>
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[12px] text-[#888]">
                    {province.pct}% reported
                  </span>
                </div>
                <div className="mt-1 font-mono text-sm tabular-nums">
                  {province.counted}/{province.constituencies}{" "}
                  <span className="text-muted-foreground text-[13px]">constituencies</span>
                </div>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {formatNumber(province.totalVotes)} votes counted
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-[#181818]/60 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="font-mono text-[12px] uppercase tracking-wider text-[#888]">
              Province detail
            </div>
            {activeProvinceAggregate ? (
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[12px] text-[#888]">
                {activeProvinceAggregate.pct}% reported
              </span>
            ) : null}
          </div>

          {activeProvinceAggregate ? (
            <div className="rounded-lg bg-[#0c0c0c]/60 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-[#e5e5e5]">
                    {activeProvinceAggregate.label}
                  </div>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    {formatNumber(activeProvinceAggregate.totalVotes)} votes counted
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm tabular-nums text-[#e5e5e5]">
                    {activeProvinceAggregate.counted}/{activeProvinceAggregate.constituencies}
                  </div>
                  <p className="text-[12px] text-muted-foreground">constituencies</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Province summary unavailable.
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl bg-[#181818]/60 p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="font-mono text-[12px] uppercase tracking-wider text-[#888]">
            District progress
          </div>
          <div className="text-xs text-muted-foreground">
            {activeProvince === "all"
              ? "Top districts by reporting progress"
              : `Province ${
                  typeof activeProvince === "number"
                    ? PROVINCE_LABELS[activeProvince] ?? activeProvince
                    : ""
                }`}
          </div>
        </div>

        <div className="space-y-2">
          {visibleDistricts.slice(0, 10).map((district) => {
            const pct =
              district.constituencies > 0
                ? Math.round((district.counted / district.constituencies) * 100)
                : 0;
            return (
              <div
                key={`${district.provinceId}-${district.districtName}`}
                className="flex items-center justify-between gap-3 rounded-lg bg-[#0c0c0c]/60 px-3 py-2 text-xs"
              >
                <div>
                  <div className="font-medium text-[#e5e5e5]">{district.districtName}</div>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    {district.counted}/{district.constituencies} constituencies ·{" "}
                    {formatNumber(district.totalVotes)} votes
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-mono text-sm tabular-nums">{pct}%</span>
                  <div className="mt-1 h-1.5 w-24 rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-blue-500/80"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {visibleDistricts.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No district aggregates available for the current selection.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

