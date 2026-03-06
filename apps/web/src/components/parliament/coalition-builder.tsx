"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchNationalSummary } from "@/lib/api";
import { HOR_MAJORITY_THRESHOLD } from "@repo/shared";
import { cn } from "@/lib/utils";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CoalitionBuilder() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { selectedDatasetId } = useElectionDatasetStore();

  const { data: summary } = useQuery({
    queryKey: ["national-summary", selectedDatasetId],
    queryFn: () => fetchNationalSummary(selectedDatasetId),
    refetchInterval: 15_000,
  });

  const parties = (summary?.partyResults ?? [])
    .filter((p) => p.seatsWon + p.seatsLeading > 0)
    .sort((a, b) => b.seatsWon + b.seatsLeading - (a.seatsWon + a.seatsLeading));

  function toggle(partyId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(partyId)) next.delete(partyId);
      else next.add(partyId);
      return next;
    });
  }

  const totalSeats = parties
    .filter((p) => selected.has(p.partyId))
    .reduce((sum, p) => sum + p.seatsWon + p.seatsLeading, 0);

  const hasMajority = totalSeats >= HOR_MAJORITY_THRESHOLD;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-display">
          Coalition Builder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          {parties.map((p) => (
            <button
              key={p.partyId}
              onClick={() => toggle(p.partyId)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-sm border text-xs transition-colors text-left",
                selected.has(p.partyId)
                  ? "border-white/20 bg-white/5"
                  : "border-border hover:bg-muted"
              )}
            >
              <span
                className={cn(
                  "h-3 w-3 rounded-sm border-2 flex-shrink-0",
                  selected.has(p.partyId)
                    ? "border-white bg-white"
                    : "border-muted-foreground"
                )}
                style={
                  selected.has(p.partyId)
                    ? { backgroundColor: p.partyColor, borderColor: p.partyColor }
                    : undefined
                }
              />
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: p.partyColor }}
              />
              <span className="font-medium">{p.partyShortName}</span>
              <span className="ml-auto text-muted-foreground">
                {p.seatsWon + p.seatsLeading} seats
              </span>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Coalition total</span>
            <span
              className={cn(
                "font-bold text-sm",
                hasMajority ? "text-green-500" : "text-muted-foreground"
              )}
            >
              {totalSeats} / {HOR_MAJORITY_THRESHOLD}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                hasMajority ? "bg-green-500" : "bg-nepal-red"
              )}
              style={{
                width: `${Math.min(100, (totalSeats / HOR_MAJORITY_THRESHOLD) * 100)}%`,
              }}
            />
          </div>
          {hasMajority && (
            <p className="text-xs text-green-500 font-medium text-center">
              Majority achieved
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
