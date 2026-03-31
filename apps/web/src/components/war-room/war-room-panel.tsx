"use client";

import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Lock,
  Radio,
} from "@/components/icons";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { env } from "@/lib/env";
import { fetchNationalSummary, fetchSourceHealth } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";

const MOCK_PARTICIPANTS = [
  { id: "1", name: "Analyst 1", initials: "A1", muted: false },
  { id: "2", name: "Observer 2", initials: "O2", muted: true },
  { id: "3", name: "Field Reporter 3", initials: "F3", muted: true },
];

function LockedState() {
  return (
    <Card className="max-w-md mx-auto mt-20">
      <CardContent className="py-12 text-center space-y-4">
        <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
        <h2 className="font-display text-xl font-bold">
          War Room is Disabled
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          The collaborative voice room requires LiveKit integration. Set{" "}
          <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
            NEXT_PUBLIC_ENABLE_WAR_ROOM=true
          </code>{" "}
          in your environment to enable this feature.
        </p>
      </CardContent>
    </Card>
  );
}

function VoiceRoom() {
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [ptt, setPtt] = useState(false);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {MOCK_PARTICIPANTS.map((p) => (
          <Card key={p.id}>
            <CardContent className="py-6 flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-lg font-bold font-display">
                {p.initials}
              </div>
              <span className="text-sm font-medium">{p.name}</span>
              <div className="flex items-center gap-1.5">
                {p.muted ? (
                  <MicOff className="h-3.5 w-3.5 text-red-500" />
                ) : (
                  <Mic className="h-3.5 w-3.5 text-green-500" />
                )}
                <span className="text-[12px] text-muted-foreground">
                  {p.muted ? "Muted" : "Speaking"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setMuted(!muted)}
              className={cn(
                "p-3 rounded-full border transition-colors",
                muted
                  ? "bg-red-500/10 border-red-500/30 text-red-500"
                  : "border-border hover:bg-muted text-muted-foreground"
              )}
            >
              {muted ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={() => setDeafened(!deafened)}
              className={cn(
                "p-3 rounded-full border transition-colors",
                deafened
                  ? "bg-red-500/10 border-red-500/30 text-red-500"
                  : "border-border hover:bg-muted text-muted-foreground"
              )}
            >
              {deafened ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>
            <button
              onMouseDown={() => setPtt(true)}
              onMouseUp={() => setPtt(false)}
              onMouseLeave={() => setPtt(false)}
              className={cn(
                "px-6 py-3 rounded-full border text-xs font-medium transition-colors",
                ptt
                  ? "bg-nepal-red border-nepal-red text-white"
                  : "border-border hover:bg-muted text-muted-foreground"
              )}
            >
              <Radio className="h-4 w-4 inline mr-2" />
              Push to Talk
            </button>
            <button className="p-3 rounded-full border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors">
              <PhoneOff className="h-5 w-5" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AIBriefingPanel() {
  const { selectedDatasetId } = useElectionDatasetStore();
  const { data: summary } = useQuery({
    queryKey: ["war-room-summary", selectedDatasetId],
    queryFn: () => fetchNationalSummary(selectedDatasetId),
    refetchInterval: 15_000,
  });
  const { data: sourceHealth = [] } = useQuery({
    queryKey: ["war-room-source-health"],
    queryFn: fetchSourceHealth,
    refetchInterval: 15_000,
  });

  const topParty = summary?.partyResults[0];
  const runnerUp = summary?.partyResults[1];
  const liveSources = sourceHealth.filter((source) => source.status === "live");
  const weakSources = sourceHealth.filter((source) => source.status !== "live");
  const majorityGap = topParty ? Math.max(0, 138 - (topParty.seatsWon + topParty.seatsLeading)) : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-display">AI Briefing</CardTitle>
          <Badge variant="stale">
            {summary ? `Updated ${timeAgo(summary.timestamp)}` : "Waiting"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {summary && topParty
            ? `${summary.countedConstituencies} of ${summary.totalConstituencies} constituencies are currently reflected in the selected dataset. ${topParty.partyName} is the leading bloc with ${topParty.seatsWon} seats won and ${topParty.seatsLeading} seats leading.`
            : "Waiting for the latest election summary to generate a tactical briefing."}
        </p>
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-xs">
            <span className="text-nepal-red mt-0.5">1.</span>
            <p className="text-muted-foreground">
              <span className="text-foreground font-medium">Lead picture:</span>{" "}
              {topParty && runnerUp
                ? `${topParty.partyShortName} is ahead of ${runnerUp.partyShortName} by ${(topParty.seatsWon + topParty.seatsLeading) - (runnerUp.seatsWon + runnerUp.seatsLeading)} seats in the current board.`
                : "Waiting for at least two party aggregates before computing the lead picture."}
            </p>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <span className="text-nepal-red mt-0.5">2.</span>
            <p className="text-muted-foreground">
              <span className="text-foreground font-medium">Government math:</span>{" "}
              {majorityGap !== null
                ? majorityGap === 0
                  ? `${topParty?.partyShortName} has enough won + leading seats to cross the majority line.`
                  : `${topParty?.partyShortName} still needs ${majorityGap} more seats to clear the 138-seat majority threshold on its own.`
                : "Majority gap will appear once summary totals load."}
            </p>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <span className="text-nepal-red mt-0.5">3.</span>
            <p className="text-muted-foreground">
              <span className="text-foreground font-medium">Source posture:</span>{" "}
              {liveSources.length > 0
                ? `${liveSources.length} sources are currently live. ${weakSources.length > 0 ? `${weakSources.length} sources are stale or error and should be watched.` : "No weak sources are currently flagged."}`
                : "No live sources are currently reporting healthy status."}
            </p>
          </div>
        </div>
        <div className="pt-2 border-t border-border">
          <p className="text-[12px] text-muted-foreground">
            This briefing is AI-generated from current data feeds. Not for
            official citation.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function WarRoomPanel() {
  const enabled = env.NEXT_PUBLIC_ENABLE_WAR_ROOM;

  if (!enabled) return <LockedState />;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2">
        <VoiceRoom />
      </div>
      <div>
        <AIBriefingPanel />
      </div>
    </div>
  );
}
