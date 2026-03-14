"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { NationalSummaryCards } from "@/components/dashboard/national-summary-cards";
import { PartyStandings } from "@/components/dashboard/party-standings";
import { RegionalOverview } from "@/components/dashboard/regional-overview";
import { FederalProportionalCard } from "@/components/dashboard/federal-proportional-card";
import { BattleSeats } from "@/components/dashboard/battle-seats";
import { LiveEventsMini } from "@/components/dashboard/live-events-mini";
import { CandidateWatch } from "@/components/dashboard/candidate-watch";
import { PoliticalPulseCards } from "@/components/dashboard/political-pulse-cards";
import { ElectionDatasetSelector } from "@/components/election-dataset-selector";
import { fetchNationalSummary } from "@/lib/api";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";

export default function PoliticalPulsePage() {
  const { selectedDatasetId } = useElectionDatasetStore();
  const { data: summary } = useQuery({
    queryKey: ["national-summary", selectedDatasetId],
    queryFn: () => fetchNationalSummary(selectedDatasetId),
  });
  const hasElectionData =
    summary && summary.totalSeats > 0 && (summary.countedConstituencies > 0 || summary.totalVotesCast > 0);

  return (
    <div className="space-y-5 md:space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
          Political Pulse
        </h1>
        <p className="mt-1 text-xs text-muted-foreground md:text-sm">
          Nepal&apos;s real-time national pulse — politics, economy, crisis
        </p>
      </div>

      <PoliticalPulseCards />

      <details className="rounded-lg border border-border bg-card/50">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
          Historical election data
        </summary>
        <div className="border-t border-border px-4 pb-4 pt-3">
          <ElectionDatasetSelector />
        </div>
      </details>

      {hasElectionData ? (
        <>
          <NationalSummaryCards />
          <PartyStandings />
          <FederalProportionalCard />
          <RegionalOverview />
          <CandidateWatch />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-4 md:col-span-2">
              <BattleSeats />
            </div>
            <div className="space-y-4">
              <LiveEventsMini />
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          No election data loaded. View historical datasets above or{" "}
          <Link href="/constituencies" className="text-nepal-red hover:underline">
            browse constituencies
          </Link>
          .
        </div>
      )}
    </div>
  );
}
