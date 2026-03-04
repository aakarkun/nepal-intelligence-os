"use client";

import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatNumber, timeAgo } from "@/lib/utils";
import { fetchConstituencies } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import type { ConstituencyResult } from "@repo/shared";
import { useFilterStore } from "@/stores/filter-store";

interface DistrictDrawerProps {
  districtName: string | null;
  onClose: () => void;
}

const statusVariant: Record<string, "default" | "live" | "stale" | "error"> = {
  counting: "stale",
  final: "default",
  stale: "stale",
  error: "error",
};

export function DistrictDrawer({ districtName, onClose }: DistrictDrawerProps) {
  const intelRailOpen = useFilterStore((s) => s.intelRailOpen);
  const { data: constituencies } = useQuery({
    queryKey: ["constituencies"],
    queryFn: () => fetchConstituencies(),
  });

  const normalized = districtName?.toUpperCase() ?? null;
  const filtered = constituencies?.filter(
    (c) => normalized && c.districtName.toUpperCase() === normalized
  );

  const displayName =
    filtered && filtered.length > 0
      ? filtered[0].districtName
      : districtName
        ? districtName
            .toLowerCase()
            .replace(/\b\w/g, (ch) => ch.toUpperCase())
        : "";

  function getLeader(c: ConstituencyResult) {
    if (!c.candidates.length) return null;
    return [...c.candidates].sort((a, b) => b.votes - a.votes)[0];
  }

  function getMargin(c: ConstituencyResult) {
    const sorted = [...c.candidates].sort((a, b) => b.votes - a.votes);
    if (sorted.length < 2) return 0;
    return sorted[0].votes - sorted[1].votes;
  }

  return (
    <>
      {districtName && (
        <div
          className="fixed inset-0 top-12 bottom-8 z-20 bg-black/30"
          onClick={onClose}
        />
      )}
      <div
        className={cn(
          "fixed top-12 bottom-8 z-30 w-96 bg-card border-l border-border overflow-y-auto scrollbar-thin transition-transform duration-300",
          intelRailOpen ? "right-72" : "right-0",
          districtName ? "translate-x-0" : "translate-x-full"
        )}
      >
        {districtName && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold">
                  {displayName}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {filtered?.length ?? 0} constituencies
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-muted rounded-sm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              {filtered?.map((c) => {
                const leader = getLeader(c);
                const margin = getMargin(c);
                return (
                  <Link
                    key={c.constituencyId}
                    href={`/constituencies/${c.constituencyId}`}
                    className="block p-3 border border-border rounded-md hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {c.constituencyName}
                      </span>
                      <Badge variant={statusVariant[c.status] ?? "default"}>
                        {c.status}
                      </Badge>
                    </div>
                    {leader && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: leader.partyColor }}
                        />
                        <span>
                          {leader.candidateName} ({leader.partyName})
                        </span>
                        <span className="ml-auto">
                          {formatNumber(leader.votes)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                      <span>Margin: {formatNumber(margin)}</span>
                      <span>{timeAgo(c.lastUpdate)}</span>
                    </div>
                  </Link>
                );
              })}

              {(!filtered || filtered.length === 0) && (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No constituency data for this district
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
