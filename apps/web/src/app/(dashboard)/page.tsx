import { NationalSummaryCards } from "@/components/dashboard/national-summary-cards";
import { PartyStandings } from "@/components/dashboard/party-standings";
import { WhatChangedCard } from "@/components/dashboard/what-changed-card";
import { BattleSeats } from "@/components/dashboard/battle-seats";
import { LiveEventsMini } from "@/components/dashboard/live-events-mini";

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
      </div>
      <NationalSummaryCards />
      <PartyStandings />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <WhatChangedCard />
        </div>
        <div className="space-y-4">
          <BattleSeats />
          <LiveEventsMini />
        </div>
      </div>
    </div>
  );
}
