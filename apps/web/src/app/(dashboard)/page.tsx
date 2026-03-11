import { NationalSummaryCards } from "@/components/dashboard/national-summary-cards";
import { PartyStandings } from "@/components/dashboard/party-standings";
import { RegionalOverview } from "@/components/dashboard/regional-overview";
import { FederalProportionalCard } from "@/components/dashboard/federal-proportional-card";
import { BattleSeats } from "@/components/dashboard/battle-seats";
import { LiveEventsMini } from "@/components/dashboard/live-events-mini";
import { CandidateWatch } from "@/components/dashboard/candidate-watch";
import { ElectionDatasetSelector } from "@/components/election-dataset-selector";

export default function SituationRoomPage() {
  return (
    <div className="space-y-5 md:space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
          Situation Room
        </h1>
        <p className="mt-1 text-xs text-muted-foreground md:text-sm">
          National pulse — live election intelligence
        </p>
        <div className="mt-3">
          <ElectionDatasetSelector />
        </div>
      </div>
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
    </div>
  );
}
