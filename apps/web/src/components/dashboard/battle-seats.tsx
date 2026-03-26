"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { fetchConstituencies } from "@/lib/api";
import { cn, formatNumber } from "@/lib/utils";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";
import type { ConstituencyResult } from "@repo/shared";

function getMargin(c: ConstituencyResult): number {
  if (c.candidates.length < 2) return Infinity;
  const sorted = [...c.candidates].sort((a, b) => b.votes - a.votes);
  return sorted[0].votes - sorted[1].votes;
}

export function BattleSeats() {
  const router = useRouter();
  const { selectedDatasetId, datasets } = useElectionDatasetStore();
  const selectedDataset = datasets.find((dataset) => dataset.id === selectedDatasetId);
  const isCurrentDataset = selectedDataset?.isCurrent ?? true;

  const { data: constituencies, isLoading } = useQuery({
    queryKey: ["constituencies", selectedDatasetId],
    queryFn: () => fetchConstituencies({ dataset: selectedDatasetId }),
    refetchInterval: isCurrentDataset ? 15_000 : false,
  });

  if (isLoading || !constituencies) {
    return (
      <div className="h-48 animate-pulse rounded-xl bg-white/[0.06]" />
    );
  }

  const battleSeats = [...constituencies]
    .filter((c) => c.candidates.length >= 2)
    .sort((a, b) => getMargin(a) - getMargin(b))
    .slice(0, 5);

  return (
    <div className="rounded-xl bg-[#181818]/60 p-3">
      <div className="mb-3 font-mono text-[13px] uppercase tracking-wider text-[#a1a1aa]">
        Closest races
      </div>
      <div className="space-y-2">
        {battleSeats.map((seat) => {
          const sorted = [...seat.candidates].sort(
            (a, b) => b.votes - a.votes
          );
          const first = sorted[0];
          const second = sorted[1];
          const margin = first.votes - second.votes;
          const total = first.votes + second.votes;
          const firstPct = total > 0 ? (first.votes / total) * 100 : 50;

          return (
            <button
              key={seat.constituencyId}
              onClick={() =>
                router.push(`/constituencies/${seat.constituencyId}`)
              }
              className={cn(
                "w-full rounded-lg bg-[#0c0c0c]/60 p-3 text-left transition-colors",
                "hover:bg-white/[0.04]"
              )}
            >
              <div className="flex items-center justify-between">
                <p className="truncate text-sm font-medium text-[#e5e5e5]">
                  {seat.constituencyName}
                </p>
                <span className="ml-2 shrink-0 font-mono text-xs font-bold tabular-nums text-[#dc143c]">
                  ±{formatNumber(margin)}
                </span>
              </div>

              {/* Mini bar visualization */}
              <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="transition-all duration-500"
                  style={{
                    width: `${firstPct}%`,
                    backgroundColor: first.partyColor,
                  }}
                />
                <div
                  className="transition-all duration-500"
                  style={{
                    width: `${100 - firstPct}%`,
                    backgroundColor: second.partyColor,
                  }}
                />
              </div>

              <div className="mt-1.5 flex items-center justify-between text-[12px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: first.partyColor }}
                  />
                  {first.partyName}
                  <span className="font-mono tabular-nums">
                    {formatNumber(first.votes)}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="font-mono tabular-nums">
                    {formatNumber(second.votes)}
                  </span>
                  {second.partyName}
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: second.partyColor }}
                  />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
