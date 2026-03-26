"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { NationalSummaryCards } from "@/components/dashboard/national-summary-cards";
import { PartyStandings } from "@/components/dashboard/party-standings";
import { RegionalOverview } from "@/components/dashboard/regional-overview";
import { LiveEventsMini } from "@/components/dashboard/live-events-mini";
import { PoliticalPulseCards } from "@/components/dashboard/political-pulse-cards";
import { ElectionDatasetSelector } from "@/components/election-dataset-selector";
import { fetchNationalSummary } from "@/lib/api";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";
import {
  RailPanelHeader,
  railShell,
  railListBody,
  railCardInset,
} from "@/components/layout/intel-rail";

export default function PoliticalPulsePage() {
  const { selectedDatasetId } = useElectionDatasetStore();
  const { data: summary } = useQuery({
    queryKey: ["national-summary", selectedDatasetId],
    queryFn: () => fetchNationalSummary(selectedDatasetId),
  });
  const hasElectionData =
    summary && summary.totalSeats > 0 && (summary.countedConstituencies > 0 || summary.totalVotesCast > 0);

  return (
    <div
      className={cn(
        "-mx-4 px-4 pb-10 md:-mx-6 md:px-6",
        "min-h-full bg-background text-[#e5e5e5] antialiased"
      )}
    >
      <div className="mb-6 flex flex-col gap-2 border-b border-white/10 pb-4 pt-2">
        <div>
          <h1 className="font-mono text-lg uppercase tracking-[0.2em] text-[#e5e5e5]">
            Political Pulse
          </h1>
          <p className="mt-1 font-mono text-[12px] uppercase tracking-wider text-[#888]">
            Nepal&apos;s real-time national pulse — politics, economy, crisis
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <PoliticalPulseCards />

        <div className={railShell}>
          <RailPanelHeader title="Historical election data" leadingDotClass="bg-sky-500" />
          <div className={cn(railListBody, "rounded-b-xl")}>
            <div className={cn(railCardInset, "px-3 py-3")}>
              <ElectionDatasetSelector />
            </div>
          </div>
        </div>

        {hasElectionData ? (
          <>
            <div className="grid gap-4 md:grid-cols-6 [grid-auto-flow:dense]">
              <div className={cn(railShell, "md:col-span-6")}>
                <RailPanelHeader title="National summary" leadingDotClass="bg-sky-500" />
                <div className={cn(railListBody, "rounded-b-xl")}>
                  <div className={cn(railCardInset, "px-3 py-3")}>
                    <NationalSummaryCards />
                  </div>
                </div>
              </div>

              <div className={cn(railShell, "md:col-span-6")}>
                <RailPanelHeader title="Party standings" leadingDotClass="bg-violet-500" />
                <div className={cn(railListBody, "rounded-b-xl")}>
                  <div className={cn(railCardInset, "px-3 py-3")}>
                    <PartyStandings />
                  </div>
                </div>
              </div>

              <div className={cn(railShell, "md:col-span-6")}>
                <RailPanelHeader title="Regional overview" leadingDotClass="bg-emerald-500" />
                <div className={cn(railListBody, "rounded-b-xl")}>
                  <div className={cn(railCardInset, "px-3 py-3")}>
                    <RegionalOverview />
                  </div>
                </div>
              </div>

              <div className={cn(railShell, "md:col-span-6")}>
                <RailPanelHeader title="Live events" leadingDotClass="bg-cyan-500" />
                <div className={cn(railListBody, "rounded-b-xl")}>
                  <div className={cn(railCardInset, "px-3 py-3")}>
                    <LiveEventsMini />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className={railShell}>
            <RailPanelHeader title="Election data" leadingDotClass="bg-sky-500" />
            <div className={cn(railListBody, "rounded-b-xl")}>
              <div className={cn("rounded-xl bg-[#181818]/60 px-4 py-8 text-center", railCardInset)}>
                <p className="font-mono text-[13px] uppercase tracking-wider text-[#a1a1aa]">
                  No election data loaded
                </p>
                <p className="mt-2 font-mono text-[12px] leading-relaxed text-[#666]">
                  View historical datasets above or{" "}
                  <Link href="/constituencies" className="text-blue-400/90 hover:underline">
                    browse constituencies
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
