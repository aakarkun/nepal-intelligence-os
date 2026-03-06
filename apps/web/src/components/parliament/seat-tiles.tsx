"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchNationalSummary } from "@/lib/api";
import { HOR_TOTAL_SEATS } from "@repo/shared";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SeatTiles() {
  const { selectedDatasetId } = useElectionDatasetStore();
  const { data: summary } = useQuery({
    queryKey: ["national-summary", selectedDatasetId],
    queryFn: () => fetchNationalSummary(selectedDatasetId),
    refetchInterval: 15_000,
  });

  const tiles: Array<{ color: string; party: string; leading: boolean }> = [];

  if (summary) {
    for (const p of summary.partyResults) {
      for (let i = 0; i < p.seatsWon; i++) {
        tiles.push({ color: p.partyColor, party: p.partyShortName, leading: false });
      }
      for (let i = 0; i < p.seatsLeading; i++) {
        tiles.push({ color: p.partyColor, party: p.partyShortName, leading: true });
      }
    }
  }

  const remaining = HOR_TOTAL_SEATS - tiles.length;
  for (let i = 0; i < remaining; i++) {
    tiles.push({ color: "#1a1a2e", party: "Uncounted", leading: false });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-display">
          Seat Map — {HOR_TOTAL_SEATS} seats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={0}>
          <div className="flex flex-wrap gap-[2px]">
            {tiles.map((tile, i) => (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "w-4 h-4 rounded-[2px] transition-colors cursor-default",
                      tile.leading && "opacity-60"
                    )}
                    style={{ backgroundColor: tile.color }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {tile.party}
                  {tile.leading ? " (leading)" : ""}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
