"use client";

import { useState } from "react";
import Link from "next/link";
import type { ConstituencyResult } from "@repo/shared";
import { cn, formatNepalDateTime, formatNumber, timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PartyMark } from "@/components/party/party-mark";
import { ResponsiveContainer, LineChart, CartesianGrid } from "recharts";
import { ArrowLeft, Copy, Check, Eye, EyeOff } from "@/components/icons";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";
import { useRealtimeStore } from "@/stores/realtime-store";
import { discoverShellClass } from "@/components/discover/discover-rail-tokens";
import { FlatRailPanelHeader } from "@/components/layout/intel-rail";

const panelBodyClass = "min-w-0 px-2 pb-2";

interface ConstituencyDossierProps {
  data: ConstituencyResult;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "counting":
      return (
        <span className="rounded px-1.5 py-0.5 font-sans text-[10px] uppercase tracking-wide text-amber-400/90">
          Counting
        </span>
      );
    case "final":
      return (
        <span className="rounded px-1.5 py-0.5 font-sans text-[10px] uppercase tracking-wide text-emerald-400/90">
          Final
        </span>
      );
    case "stale":
      return (
        <span className="rounded px-1.5 py-0.5 font-sans text-[10px] uppercase tracking-wide text-yellow-500/90">
          Stale
        </span>
      );
    case "error":
      return <Badge variant="error">Error</Badge>;
    default:
      return (
        <span className="font-sans text-[10px] uppercase tracking-wide text-[#888]">
          {status}
        </span>
      );
  }
}

export function ConstituencyDossier({ data }: ConstituencyDossierProps) {
  const [copied, setCopied] = useState(false);
  const { selectedDatasetId, datasets } = useElectionDatasetStore();
  const selectedDataset = datasets.find((dataset) => dataset.id === selectedDatasetId);
  const isCurrentDataset = selectedDataset?.isCurrent ?? true;

  const watchlist = useRealtimeStore((s) => s.watchlist);
  const addToWatchlist = useRealtimeStore((s) => s.addToWatchlist);
  const removeFromWatchlist = useRealtimeStore((s) => s.removeFromWatchlist);
  const isWatched = watchlist.includes(data.constituencyId);
  const candidateWatchlist = useRealtimeStore((s) => s.candidateWatchlist);
  const addCandidateToWatchlist = useRealtimeStore((s) => s.addCandidateToWatchlist);
  const removeCandidateFromWatchlist = useRealtimeStore(
    (s) => s.removeCandidateFromWatchlist
  );

  const sortedCandidates = [...data.candidates].sort((a, b) => b.votes - a.votes);
  const maxVotes = sortedCandidates[0]?.votes ?? 0;

  async function handleCopy() {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <Link
        href="/constituencies"
        className="inline-flex items-center gap-1 font-sans text-[12px] text-[#888] transition-colors hover:text-[#ccc]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Constituencies
      </Link>

      <div className={cn(discoverShellClass, "min-w-0")}>
        <FlatRailPanelHeader
          title="Vote breakdown"
          leadingDotClass="bg-sky-500"
          right={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <StatusBadge status={data.status} />
              <button
                type="button"
                onClick={() =>
                  isWatched
                    ? removeFromWatchlist(data.constituencyId)
                    : addToWatchlist(data.constituencyId)
                }
                className="inline-flex items-center gap-1 rounded-full border border-white/[0.1] bg-white/[0.06] px-2.5 py-1 font-sans text-[11px] text-[#a1a1aa] transition-colors hover:border-white/[0.15] hover:text-[#e5e5e5]"
              >
                {isWatched ? (
                  <>
                    <EyeOff className="h-3 w-3" />
                    Unwatch
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3" />
                    Watch
                  </>
                )}
              </button>
            </div>
          }
        />
        <div className={panelBodyClass}>
          <p className="mb-3 font-sans text-[10px] text-[#555]">
            {(data.sourceName ?? data.sourceId) && (
              <>
                Source: {data.sourceName ?? data.sourceId}
                {" · "}
                {isCurrentDataset
                  ? `Updated ${timeAgo(data.sourceFetchedAt ?? data.lastUpdate)}`
                  : `Archived ${formatNepalDateTime(data.sourceFetchedAt ?? data.lastUpdate)}`}
                <br />
              </>
            )}
            Bar fill is proportional to votes (relative to the leader).{" "}
            <span className="text-[#666]">0 votes means no colored fill—only the track shows.</span>
          </p>

          <div className="mb-4 space-y-2">
            {sortedCandidates.map((c) => {
              const width = maxVotes > 0 ? (c.votes / maxVotes) * 100 : 0;
              return (
                <div key={c.candidateId} className="flex items-center gap-3">
                  <div className="w-32 shrink-0 truncate font-sans text-[12px] text-[#a1a1aa] sm:w-40">
                    {c.candidateName}
                  </div>
                  <div className="min-w-0 flex-1">
                    {c.votes === 0 ? (
                      <div className="flex h-6 items-center rounded border border-dashed border-white/[0.1] bg-white/[0.03] px-2">
                        <span className="font-sans text-[10px] text-[#666]">
                          No vote total in this feed
                        </span>
                      </div>
                    ) : (
                      <div className="h-6 overflow-hidden rounded bg-white/[0.06]">
                        <div
                          className="h-full rounded-sm transition-all duration-500"
                          style={{
                            width: `${width}%`,
                            backgroundColor: c.partyColor,
                            opacity: 0.85,
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="w-16 shrink-0 text-right font-sans text-[12px] tabular-nums text-[#e5e5e5] sm:w-20">
                    {formatNumber(c.votes)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="min-w-0 overflow-x-auto rounded-lg border border-white/[0.06] bg-white/[0.06]">
            <table className="w-full border-collapse font-sans text-[12px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.04] text-left text-[11px] uppercase tracking-wide text-[#666]">
                  <th className="px-2 py-2 font-medium">#</th>
                  <th className="px-2 py-2 font-medium">Candidate</th>
                  <th className="px-2 py-2 font-medium">Party</th>
                  <th className="px-2 py-2 text-right font-medium tabular-nums">Votes</th>
                  <th className="px-2 py-2 text-right font-medium tabular-nums">Share</th>
                </tr>
              </thead>
              <tbody>
                {sortedCandidates.map((c, i) => {
                  const share =
                    data.totalVotes > 0
                      ? ((c.votes / data.totalVotes) * 100).toFixed(1)
                      : "0.0";
                  return (
                    <tr
                      key={c.candidateId}
                      className="border-b border-white/[0.04] transition-colors last:border-b-0 hover:bg-white/[0.04]"
                    >
                      <td className="px-2 py-1.5 tabular-nums text-[#666]">{i + 1}</td>
                      <td className="px-2 py-1.5">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <PartyMark
                            partyId={c.partyId}
                            partyName={c.partyName}
                            partyColor={c.partyColor}
                            size="sm"
                          />
                          <span
                            className={cn(
                              "truncate text-[#e5e5e5]",
                              i === 0 && "font-medium"
                            )}
                          >
                            {c.candidateName}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const exists = candidateWatchlist.some(
                                (wc) => wc.candidateId === c.candidateId
                              );
                              if (exists) {
                                removeCandidateFromWatchlist(c.candidateId);
                              } else {
                                addCandidateToWatchlist({
                                  candidateId: c.candidateId,
                                  constituencyId: data.constituencyId,
                                  candidateName: c.candidateName,
                                  partyName: c.partyName,
                                });
                              }
                            }}
                            className="shrink-0 text-[#888] transition-colors hover:text-[#ccc]"
                            title={
                              candidateWatchlist.some(
                                (wc) => wc.candidateId === c.candidateId
                              )
                                ? "Unwatch candidate"
                                : "Watch candidate"
                            }
                          >
                            {candidateWatchlist.some(
                              (wc) => wc.candidateId === c.candidateId
                            ) ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-[#a1a1aa]">{c.partyName}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-[#e5e5e5]">
                        {formatNumber(c.votes)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-[#a1a1aa]">
                        {share}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className={cn(discoverShellClass, "min-w-0")}>
        <FlatRailPanelHeader title="Vote trend" leadingDotClass="bg-amber-500" />
        <div className={panelBodyClass}>
          <div className="relative h-48 rounded-lg border border-white/[0.06] bg-white/[0.04]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
              </LineChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="font-sans text-[12px] text-[#666]">
                Vote trend will appear as counting progresses
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={cn(discoverShellClass, "min-w-0")}>
        <FlatRailPanelHeader
          title="Raw data"
          leadingDotClass="bg-violet-500"
          right={
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-full border border-white/[0.1] bg-white/[0.06] px-2.5 py-1 font-sans text-[11px] text-[#a1a1aa] transition-colors hover:border-white/[0.15] hover:text-[#e5e5e5]"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy JSON
                </>
              )}
            </button>
          }
        />
        <div className={panelBodyClass}>
          <pre className="max-h-80 overflow-auto rounded-lg border border-white/[0.06] bg-black/20 p-3 font-mono text-[11px] leading-relaxed text-[#a1a1aa]">
            <code>{JSON.stringify(data, null, 2)}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
