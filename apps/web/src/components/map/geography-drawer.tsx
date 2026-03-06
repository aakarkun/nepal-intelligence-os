"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import Link from "next/link";
import { PROVINCES, type ConstituencyResult } from "@repo/shared";
import { Badge } from "@/components/ui/badge";
import { fetchDistrictDetail, fetchProvinceDetail } from "@/lib/api";
import { cn, formatNumber, timeAgo } from "@/lib/utils";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";
import { useFilterStore } from "@/stores/filter-store";

type GeographySelection =
  | { type: "district"; districtName: string }
  | { type: "province"; provinceId: number }
  | null;

interface GeographyDrawerProps {
  selection: GeographySelection;
  onClose: () => void;
  onSelectDistrict: (districtName: string) => void;
}

const statusVariant: Record<string, "default" | "live" | "stale" | "error"> = {
  counting: "stale",
  final: "default",
  stale: "stale",
  error: "error",
};

function getLeader(c: ConstituencyResult) {
  if (!c.candidates.length) return null;
  return [...c.candidates].sort((a, b) => b.votes - a.votes)[0];
}

function getMargin(c: ConstituencyResult) {
  const sorted = [...c.candidates].sort((a, b) => b.votes - a.votes);
  if (sorted.length < 2) return 0;
  return sorted[0].votes - sorted[1].votes;
}

export function GeographyDrawer({
  selection,
  onClose,
  onSelectDistrict,
}: GeographyDrawerProps) {
  const intelRailOpen = useFilterStore((s) => s.intelRailOpen);
  const { selectedDatasetId } = useElectionDatasetStore();

  const districtQuery = useQuery({
    queryKey: ["district-detail", selection?.type === "district" ? selection.districtName : null, selectedDatasetId],
    queryFn: () =>
      fetchDistrictDetail(
        (selection as { type: "district"; districtName: string }).districtName,
        selectedDatasetId
      ),
    enabled: selection?.type === "district",
  });

  const provinceQuery = useQuery({
    queryKey: ["province-detail", selection?.type === "province" ? selection.provinceId : null, selectedDatasetId],
    queryFn: () =>
      fetchProvinceDetail(
        (selection as { type: "province"; provinceId: number }).provinceId,
        selectedDatasetId
      ),
    enabled: selection?.type === "province",
  });

  const provinceName = useMemo(() => {
    if (selection?.type !== "province") return null;
    return (
      PROVINCES.find((province) => province.id === selection.provinceId)?.name ??
      `Province ${selection.provinceId}`
    );
  }, [selection]);

  const title =
    selection?.type === "district"
      ? districtQuery.data?.districtName ?? selection.districtName
      : selection?.type === "province"
        ? provinceName
        : "";

  const subtitle =
    selection?.type === "district"
      ? `${districtQuery.data?.constituencies ?? 0} constituencies`
      : selection?.type === "province"
        ? `${provinceQuery.data?.districts.length ?? 0} districts · ${provinceQuery.data?.constituencies ?? 0} constituencies`
        : "";

  return (
    <>
      {selection && (
        <div
          className="fixed inset-0 top-12 bottom-8 z-20 bg-black/30"
          onClick={onClose}
        />
      )}
      <div
        className={cn(
          "fixed top-12 bottom-8 z-30 w-[26rem] bg-card border-l border-border overflow-y-auto scrollbar-thin transition-transform duration-300",
          intelRailOpen ? "right-72" : "right-0",
          selection ? "translate-x-0" : "translate-x-full"
        )}
      >
        {selection && (
          <div className="p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold">{title}</h2>
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 hover:bg-muted rounded-sm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {selection.type === "district" && (
              <>
                {districtQuery.isLoading && (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Loading district results…
                  </p>
                )}

                {districtQuery.data && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-md border border-border p-2">
                        <div className="text-muted-foreground">Votes</div>
                        <div className="mt-1 font-semibold">
                          {formatNumber(districtQuery.data.totalVotes)}
                        </div>
                      </div>
                      <div className="rounded-md border border-border p-2">
                        <div className="text-muted-foreground">Final</div>
                        <div className="mt-1 font-semibold">
                          {districtQuery.data.counted}/{districtQuery.data.constituencies}
                        </div>
                      </div>
                      <div className="rounded-md border border-border p-2">
                        <div className="text-muted-foreground">Province</div>
                        <div className="mt-1 font-semibold">
                          {districtQuery.data.provinceId}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {districtQuery.data.results.map((c) => {
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
                    </div>
                  </div>
                )}
              </>
            )}

            {selection.type === "province" && (
              <>
                {provinceQuery.isLoading && (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Loading province results…
                  </p>
                )}

                {provinceQuery.data && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-md border border-border p-2">
                        <div className="text-muted-foreground">Votes</div>
                        <div className="mt-1 font-semibold">
                          {formatNumber(provinceQuery.data.totalVotes)}
                        </div>
                      </div>
                      <div className="rounded-md border border-border p-2">
                        <div className="text-muted-foreground">Final</div>
                        <div className="mt-1 font-semibold">
                          {provinceQuery.data.counted}/{provinceQuery.data.constituencies}
                        </div>
                      </div>
                      <div className="rounded-md border border-border p-2">
                        <div className="text-muted-foreground">Districts</div>
                        <div className="mt-1 font-semibold">
                          {provinceQuery.data.districts.length}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Districts
                      </h3>
                      <div className="mt-2 space-y-2">
                        {provinceQuery.data.districts.map((district) => (
                          <button
                            key={district.districtName}
                            type="button"
                            onClick={() => onSelectDistrict(district.districtName)}
                            className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left hover:bg-muted transition-colors"
                          >
                            <div>
                              <div className="text-sm font-medium">
                                {district.districtName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {district.counted}/{district.constituencies} final · {formatNumber(district.totalVotes)} votes
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Open
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Constituencies
                      </h3>
                      <div className="mt-2 space-y-2">
                        {provinceQuery.data.results.map((c) => {
                          const leader = getLeader(c);
                          return (
                            <Link
                              key={c.constituencyId}
                              href={`/constituencies/${c.constituencyId}`}
                              className="block rounded-md border border-border px-3 py-2 hover:bg-muted transition-colors"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-sm font-medium">
                                    {c.constituencyName}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {c.districtName}
                                  </div>
                                </div>
                                <Badge variant={statusVariant[c.status] ?? "default"}>
                                  {c.status}
                                </Badge>
                              </div>
                              {leader && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                  <span
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: leader.partyColor }}
                                  />
                                  <span className="truncate">
                                    {leader.candidateName} ({leader.partyName})
                                  </span>
                                  <span className="ml-auto">
                                    {formatNumber(leader.votes)}
                                  </span>
                                </div>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
