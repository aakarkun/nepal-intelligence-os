"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import type { RootState } from "@/store";
import { fetchConstituency } from "@/lib/api";
import { ConstituencyDossier } from "@/components/constituencies/constituency-dossier";
import { useShellHeader } from "@/components/layout/shell-header-context";
import { FlatRailPanelHeader, IntelRailSections } from "@/components/layout/intel-rail";
import { ElectionDatasetSelector } from "@/components/election-dataset-selector";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";
import { discoverShellClass } from "@/components/discover/discover-rail-tokens";
import { cn, formatNumber } from "@/lib/utils";

export default function ConstituencyPage() {
  const { id } = useParams<{ id: string }>();
  const { selectedDatasetId } = useElectionDatasetStore();
  const panelOpen = useSelector((s: RootState) => s.ui.intelRailOpen);
  const { setHeader } = useShellHeader();

  const { data, isLoading, error } = useQuery({
    queryKey: ["constituency", id, selectedDatasetId],
    queryFn: () => fetchConstituency(id, selectedDatasetId),
  });

  useEffect(() => {
    if (isLoading) {
      setHeader({
        mode: "title",
        title: "Constituency",
        description: "Loading election result…",
      });
      return () => setHeader(null);
    }
    if (error || !data) {
      setHeader({
        mode: "title",
        title: "Constituency",
        description: "HoR constituency result · live and archived election datasets",
      });
      return () => setHeader(null);
    }
    setHeader({
      mode: "title",
      title: data.constituencyName,
      description: `${data.districtName} · Province ${data.provinceId} · ${formatNumber(data.totalVotes)} votes`,
    });
    return () => setHeader(null);
  }, [isLoading, error, data, setHeader]);

  return (
    <div
      className={cn(
        "-mx-4 px-4 pb-10 md:-mx-6 md:px-6 min-h-full bg-transparent text-[#e5e5e5] antialiased"
      )}
    >
      <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
        <ElectionDatasetSelector />
      </div>

      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <div className={cn(discoverShellClass, "min-w-0")}>
              <FlatRailPanelHeader title="Result" leadingDotClass="bg-emerald-500" />
              <div className="min-w-0 px-2 pb-2">
                <div className="flex h-48 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04]">
                  <p className="font-sans text-[12px] text-[#555] animate-pulse">
                    Loading constituency data…
                  </p>
                </div>
              </div>
            </div>
          ) : error || !data ? (
            <div className={cn(discoverShellClass, "min-w-0")}>
              <FlatRailPanelHeader title="Constituency" leadingDotClass="bg-rose-500" />
              <div className="min-w-0 space-y-3 px-2 pb-4 pt-1 text-center">
                <p className="font-sans text-[13px] text-rose-400/90">
                  {error ? "Failed to load constituency data" : "Constituency not found"}
                </p>
                <Link
                  href="/constituencies"
                  className="inline-block font-sans text-[12px] text-sky-400/90 underline-offset-2 hover:underline"
                >
                  ← Back to Constituencies
                </Link>
              </div>
            </div>
          ) : (
            <ConstituencyDossier data={data} />
          )}
        </div>

        <aside
          className={cn(
            "hidden shrink-0 overflow-hidden transition-[transform,opacity,width] duration-200 ease-out lg:block",
            panelOpen
              ? "w-[var(--intel-rail-width)] translate-x-0 opacity-100"
              : "pointer-events-none w-0 translate-x-6 opacity-0"
          )}
        >
          <div className="space-y-3">
            <IntelRailSections />
          </div>
        </aside>
      </div>
    </div>
  );
}
