"use client";

import { useState } from "react";
import Link from "next/link";
import type { ConstituencyResult } from "@repo/shared";
import { cn, formatNumber, timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
} from "recharts";
import { ArrowLeft, Copy, Check } from "lucide-react";

interface ConstituencyDossierProps {
  data: ConstituencyResult;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "counting":
      return <Badge variant="stale">Counting</Badge>;
    case "final":
      return <Badge variant="final">Final</Badge>;
    case "stale":
      return (
        <Badge
          variant="outline"
          className="border-transparent bg-yellow-500/15 text-yellow-500"
        >
          Stale
        </Badge>
      );
    case "error":
      return <Badge variant="error">Error</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function ConstituencyDossier({ data }: ConstituencyDossierProps) {
  const [copied, setCopied] = useState(false);

  const sortedCandidates = [...data.candidates].sort(
    (a, b) => b.votes - a.votes
  );
  const maxVotes = sortedCandidates[0]?.votes ?? 0;

  async function handleCopy() {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="mb-2 -ml-2 text-muted-foreground"
        >
          <Link href="/constituencies">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Constituencies
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {data.constituencyName}
          </h1>
          <StatusBadge status={data.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {data.districtName} · Province {data.provinceId} ·{" "}
          {formatNumber(data.totalVotes)} total votes
        </p>
        {(data.sourceName ?? data.sourceId) && (
          <p className="mt-1 text-xs text-muted-foreground">
            Source: {data.sourceName ?? data.sourceId}
            {" · "}
            Updated {timeAgo(data.sourceFetchedAt ?? data.lastUpdate)} ago
          </p>
        )}
      </div>

      {/* Candidate Leaderboard */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Candidate Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Horizontal Bar Chart */}
          <div className="space-y-2">
            {sortedCandidates.map((c) => {
              const width = maxVotes > 0 ? (c.votes / maxVotes) * 100 : 0;
              return (
                <div key={c.candidateId} className="flex items-center gap-3">
                  <div className="w-36 truncate text-sm">
                    {c.candidateName}
                  </div>
                  <div className="flex-1">
                    <div className="h-6 overflow-hidden rounded bg-muted">
                      <div
                        className="h-full rounded transition-all duration-500"
                        style={{
                          width: `${width}%`,
                          backgroundColor: c.partyColor,
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-20 text-right text-sm tabular-nums">
                    {formatNumber(c.votes)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Results Table */}
          <div className="overflow-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    #
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Candidate
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Party
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                    Votes
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                    Share
                  </th>
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
                      className="border-b border-border/50"
                    >
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: c.partyColor }}
                          />
                          <span className={cn(i === 0 && "font-semibold")}>
                            {c.candidateName}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {c.partyName}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatNumber(c.votes)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {share}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Vote Trend Chart (placeholder) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Vote Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[]}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.07)"
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Vote trend will appear as counting progresses
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Panel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-medium">Raw Data</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-7 text-xs"
          >
            {copied ? (
              <>
                <Check className="mr-1 h-3 w-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-1 h-3 w-3" />
                Copy JSON
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          <pre className="max-h-80 overflow-auto rounded-md bg-muted p-4 font-mono text-xs leading-relaxed">
            <code>{JSON.stringify(data, null, 2)}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
