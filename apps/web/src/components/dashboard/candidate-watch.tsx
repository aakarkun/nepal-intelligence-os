"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Flame, Megaphone, Trophy } from "@/components/icons";
import type { ConstituencyResult } from "@repo/shared";
import { fetchConstituencies } from "@/lib/api";
import { cn, formatNumber } from "@/lib/utils";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";
import { Badge } from "@/components/ui/badge";

type VoteLeader = {
  constituencyId: string;
  constituencyName: string;
  candidateName: string;
  partyName: string;
  partyColor: string;
  votes: number;
  margin: number;
  status: "final" | "counting" | "stale" | "error";
};

type PersonalityLeader = {
  constituencyId: string;
  candidateName: string;
  partyName: string;
  partyColor: string;
  personalityRank: number;
  votes: number;
  constituencyName: string;
};

const CURATED_PERSONALITIES = [
  "Balendra Shah",
  "Pushpa Kamal Dahal",
  "Mahesh Basnet",
  "Rabi Lamichhane",
  "KP Sharma Oli",
];

function topTwoCandidates(result: ConstituencyResult) {
  return [...result.candidates].sort((a, b) => b.votes - a.votes).slice(0, 2);
}

function candidateInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function buildVoteLeaders(results: ConstituencyResult[]): VoteLeader[] {
  return results
    .filter((result) => result.candidates.length >= 2)
    .map((result) => {
      const [first, second] = topTwoCandidates(result);
      return {
        constituencyId: result.constituencyId,
        constituencyName: result.constituencyName,
        candidateName: first.candidateName,
        partyName: first.partyName,
        partyColor: first.partyColor,
        votes: first.votes,
        margin: first.votes - second.votes,
        status: result.status,
      };
    })
    .sort((a, b) => b.votes - a.votes || b.margin - a.margin)
    .slice(0, 6);
}

function buildPersonalityLeaders(results: ConstituencyResult[]): PersonalityLeader[] {
  const candidates: PersonalityLeader[] = [];
  for (const result of results) {
    for (const candidate of result.candidates) {
      const personalityRank =
        CURATED_PERSONALITIES.findIndex(
          (name) => name.toLowerCase() === candidate.candidateName.toLowerCase()
        ) + 1;
      if (personalityRank > 0) {
        candidates.push({
          constituencyId: result.constituencyId,
          constituencyName: result.constituencyName,
          candidateName: candidate.candidateName,
          partyName: candidate.partyName,
          partyColor: candidate.partyColor,
          personalityRank,
          votes: candidate.votes,
        });
      }
    }
  }

  return candidates
    .sort((a, b) => a.personalityRank - b.personalityRank || b.votes - a.votes)
    .slice(0, 6);
}

export function CandidateWatch() {
  const { selectedDatasetId, datasets } = useElectionDatasetStore();
  const selectedDataset = datasets.find((dataset) => dataset.id === selectedDatasetId);
  const isCurrentDataset = selectedDataset?.isCurrent ?? true;

  const { data: constituencies, isLoading } = useQuery({
    queryKey: ["candidate-watch-constituencies", selectedDatasetId],
    queryFn: () => fetchConstituencies({ dataset: selectedDatasetId }),
    refetchInterval: isCurrentDataset ? 15_000 : false,
  });

  const voteLeaders = useMemo(
    () => (constituencies ? buildVoteLeaders(constituencies) : []),
    [constituencies]
  );

  const personalityLeaders = useMemo(
    () => (constituencies ? buildPersonalityLeaders(constituencies) : []),
    [constituencies]
  );

  if (isLoading || !constituencies) {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-72 animate-pulse rounded-xl bg-white/[0.06]" />
        <div className="h-72 animate-pulse rounded-xl bg-white/[0.06]" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-xl bg-[#181818]/60 p-3">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="font-mono text-[13px] uppercase tracking-wider text-[#a1a1aa]">
              Vote leaders
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Compact leaderboard by current vote total
            </p>
          </div>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          {voteLeaders.map((candidate, index) => (
            <Link
              key={`${candidate.constituencyId}:${candidate.candidateName}`}
              href={`/constituencies/${candidate.constituencyId}`}
              className="flex items-center gap-3 rounded-lg bg-[#0c0c0c]/60 px-3 py-2 transition-colors hover:bg-white/[0.04]"
            >
              <div className="w-6 text-center font-mono text-xs text-muted-foreground">
                {index + 1}
              </div>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full border text-sm font-display font-bold"
                style={{
                  borderColor: `${candidate.partyColor}88`,
                  backgroundColor: `${candidate.partyColor}22`,
                }}
              >
                {candidateInitials(candidate.candidateName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-[#e5e5e5]">
                  {candidate.candidateName}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {candidate.constituencyName} · {candidate.partyName}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-bold tabular-nums">
                  {formatNumber(candidate.votes)}
                </div>
                <div className="text-[12px] text-muted-foreground">
                  Margin {formatNumber(candidate.margin)}
                </div>
              </div>
              <Badge variant={candidate.status === "final" ? "final" : "stale"}>
                {candidate.status === "final" ? "Won" : "Lead"}
              </Badge>
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-[#181818]/60 p-3">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="font-mono text-[13px] uppercase tracking-wider text-[#a1a1aa]">
              Popular personalities
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Curated national figures highlighted in our interface style
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-nepal-red" />
            <Link
              href="/constituencies"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-400/90 hover:underline"
            >
              Candidate dossiers
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
        <div className="space-y-2">
          {personalityLeaders.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No clear personality signals yet from the current feed window
            </p>
          ) : (
            personalityLeaders.map((candidate, index) => (
              <Link
                key={`${candidate.constituencyId}:${candidate.candidateName}:personality`}
                href={`/constituencies/${candidate.constituencyId}`}
                className="flex items-center gap-3 rounded-lg bg-[#0c0c0c]/60 px-3 py-2 transition-colors hover:bg-white/[0.04]"
              >
                <div className="w-6 text-center font-mono text-xs text-muted-foreground">
                  {index + 1}
                </div>
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-display font-bold",
                    index === 0 && "ring-2 ring-nepal-red/40"
                  )}
                  style={{
                    borderColor: `${candidate.partyColor}88`,
                    backgroundColor: `${candidate.partyColor}22`,
                  }}
                >
                  {candidateInitials(candidate.candidateName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-[#e5e5e5]">
                    {candidate.candidateName}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {candidate.constituencyName} · {candidate.partyName}
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-1 font-mono text-sm font-bold tabular-nums text-nepal-red">
                    <Megaphone className="h-3.5 w-3.5" />
                    #{candidate.personalityRank}
                  </div>
                  <div className="text-[12px] text-muted-foreground">
                    curated priority
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
