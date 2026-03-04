"use client";

import { useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { fetchConstituencies } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConstituencyResult } from "@repo/shared";

interface MarginDelta {
  constituencyId: string;
  constituencyName: string;
  districtName: string;
  currentMargin: number;
  previousMargin: number;
  delta: number;
  leadColor: string;
  secondColor: string;
}

function computeMargin(c: ConstituencyResult): number {
  if (c.candidates.length < 2) return c.candidates[0]?.votes ?? 0;
  const sorted = [...c.candidates].sort((a, b) => b.votes - a.votes);
  return sorted[0].votes - sorted[1].votes;
}

function getTopTwoColors(c: ConstituencyResult): [string, string] {
  const sorted = [...c.candidates].sort((a, b) => b.votes - a.votes);
  return [
    sorted[0]?.partyColor ?? "#888",
    sorted[1]?.partyColor ?? "#888",
  ];
}

export function WhatChangedCard() {
  const router = useRouter();
  const prevSnapshot = useRef<Map<string, ConstituencyResult>>(new Map());
  const lastSnapshotTime = useRef<number>(0);

  const { data: constituencies } = useQuery({
    queryKey: ["constituencies"],
    queryFn: () => fetchConstituencies(),
    refetchInterval: 60_000,
  });

  const updateSnapshot = useCallback(() => {
    if (!constituencies) return;
    const map = new Map<string, ConstituencyResult>();
    for (const c of constituencies) {
      map.set(c.constituencyId, c);
    }
    prevSnapshot.current = map;
    lastSnapshotTime.current = Date.now();
  }, [constituencies]);

  useEffect(() => {
    if (!constituencies || prevSnapshot.current.size > 0) return;
    updateSnapshot();
  }, [constituencies, updateSnapshot]);

  useEffect(() => {
    const interval = setInterval(() => {
      updateSnapshot();
    }, 60_000);
    return () => clearInterval(interval);
  }, [updateSnapshot]);

  const deltas: MarginDelta[] = [];
  if (constituencies && prevSnapshot.current.size > 0) {
    for (const current of constituencies) {
      const prev = prevSnapshot.current.get(current.constituencyId);
      if (!prev) continue;
      const currentMargin = computeMargin(current);
      const previousMargin = computeMargin(prev);
      const delta = currentMargin - previousMargin;
      if (delta === 0) continue;
      const [leadColor, secondColor] = getTopTwoColors(current);
      deltas.push({
        constituencyId: current.constituencyId,
        constituencyName: current.constituencyName,
        districtName: current.districtName,
        currentMargin,
        previousMargin,
        delta,
        leadColor,
        secondColor,
      });
    }
  }

  const topDeltas = deltas
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 5);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-display text-base font-semibold">
              What Changed
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Last 10 min
            </p>
          </div>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {topDeltas.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No significant changes detected yet
          </p>
        ) : (
          <div className="space-y-2">
            {topDeltas.map((item) => (
              <button
                key={item.constituencyId}
                onClick={() =>
                  router.push(`/constituencies/${item.constituencyId}`)
                }
                className={cn(
                  "flex w-full items-center justify-between rounded-sm border border-border p-2.5 text-left transition-colors",
                  "hover:bg-muted/40"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {item.constituencyName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.districtName}
                  </p>
                </div>
                <div className="ml-3 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: item.leadColor }}
                    />
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: item.secondColor }}
                    />
                  </div>
                  <span
                    className={cn(
                      "font-mono text-sm font-bold tabular-nums",
                      item.delta > 0 ? "text-green-500" : "text-red-500"
                    )}
                  >
                    {item.delta > 0 ? "+" : ""}
                    {item.delta}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
        {lastSnapshotTime.current > 0 && (
          <p className="mt-3 text-[10px] text-muted-foreground">
            Snapshot taken{" "}
            {timeAgo(new Date(lastSnapshotTime.current).toISOString())}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
