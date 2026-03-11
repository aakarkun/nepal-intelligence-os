"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  if (isLoading && districts.length === 0) {
    return (
      <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <Card className="animate-pulse">
          <CardContent className="h-40" />
        </Card>
        <Card className="animate-pulse">
          <CardContent className="h-40" />
        </Card>
      </div>
    );
  }

  if (districts.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="font-display text-base font-semibold">
              Province overview
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              By constituencies reported in the selected dataset
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
                "flex flex-col items-start rounded-md border bg-card px-3 py-2 text-left text-xs transition-colors",
                activeProvince === province.provinceId
                  ? "border-primary/40 bg-primary/5"
                  : "hover:bg-muted/60"
              )}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="font-medium text-foreground">{province.label}</span>
                <Badge variant="outline" className="border-border/60 text-[10px]">
                  {province.pct}% reported
                </Badge>
              </div>
              <div className="mt-1 font-mono text-sm tabular-nums">
                {province.counted}/{province.constituencies}{" "}
                <span className="text-muted-foreground text-[11px]">constituencies</span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {formatNumber(province.totalVotes)} votes counted
              </p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="font-display text-base font-semibold">
              District progress
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {activeProvince === "all"
                ? "Top districts by reporting progress"
                : `Province ${
                    typeof activeProvince === "number"
                      ? PROVINCE_LABELS[activeProvince] ?? activeProvince
                      : ""
                  }`}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {visibleDistricts.slice(0, 8).map((district) => {
            const pct =
              district.constituencies > 0
                ? Math.round((district.counted / district.constituencies) * 100)
                : 0;
            return (
              <div
                key={`${district.provinceId}-${district.districtName}`}
                className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-xs"
              >
                <div>
                  <div className="font-medium text-foreground">{district.districtName}</div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {district.counted}/{district.constituencies} constituencies ·{" "}
                    {formatNumber(district.totalVotes)} votes
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-mono text-sm tabular-nums">{pct}%</span>
                  <div className="mt-1 h-1.5 w-24 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
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
        </CardContent>
      </Card>
    </div>
  );
}

