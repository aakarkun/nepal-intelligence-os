"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchNationalSummary } from "@/lib/api";
import { HOR_TOTAL_SEATS, HOR_MAJORITY_THRESHOLD } from "@repo/shared";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MajorityBar() {
  const { selectedDatasetId } = useElectionDatasetStore();
  const { data: summary } = useQuery({
    queryKey: ["national-summary", selectedDatasetId],
    queryFn: () => fetchNationalSummary(selectedDatasetId),
    refetchInterval: 15_000,
  });

  const parties = summary?.partyResults ?? [];
  const majorityPct = (HOR_MAJORITY_THRESHOLD / HOR_TOTAL_SEATS) * 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-display">
          Path to Majority — {HOR_MAJORITY_THRESHOLD} seats needed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative h-8 bg-muted rounded-sm overflow-hidden">
          <div className="flex h-full">
            {parties
              .filter((p) => p.seatsWon + p.seatsLeading > 0)
              .map((p) => (
                <div
                  key={p.partyId}
                  className="h-full relative group"
                  style={{
                    width: `${((p.seatsWon + p.seatsLeading) / HOR_TOTAL_SEATS) * 100}%`,
                    backgroundColor: p.partyColor,
                  }}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    {p.partyShortName} {p.seatsWon + p.seatsLeading}
                  </span>
                </div>
              ))}
          </div>
          <div
            className="absolute top-0 bottom-0 border-l-2 border-dashed border-white/60"
            style={{ left: `${majorityPct}%` }}
          >
            <span className="absolute -top-5 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap">
              Majority: {HOR_MAJORITY_THRESHOLD}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {parties
            .filter((p) => p.seatsWon + p.seatsLeading > 0)
            .sort((a, b) => b.seatsWon + b.seatsLeading - (a.seatsWon + a.seatsLeading))
            .map((p) => (
              <div key={p.partyId} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: p.partyColor }}
                />
                <span className="font-medium">{p.partyShortName}</span>
                <span className="text-muted-foreground ml-auto">
                  {p.seatsWon}
                  {p.seatsLeading > 0 && (
                    <span className="opacity-60">+{p.seatsLeading}</span>
                  )}
                </span>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
