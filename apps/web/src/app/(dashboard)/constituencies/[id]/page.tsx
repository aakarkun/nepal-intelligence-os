"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchConstituency } from "@/lib/api";
import { ConstituencyDossier } from "@/components/constituencies/constituency-dossier";
import { ElectionDatasetSelector } from "@/components/election-dataset-selector";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";

export default function ConstituencyPage() {
  const { id } = useParams<{ id: string }>();
  const { selectedDatasetId } = useElectionDatasetStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ["constituency", id, selectedDatasetId],
    queryFn: () => fetchConstituency(id, selectedDatasetId),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <ElectionDatasetSelector />
        <div className="flex h-96 items-center justify-center">
          <p className="text-sm text-muted-foreground animate-pulse">
            Loading constituency data…
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <ElectionDatasetSelector />
        <div className="flex h-96 items-center justify-center">
          <div className="space-y-2 text-center">
            <p className="text-sm text-destructive">
              {error ? "Failed to load constituency data" : "Constituency not found"}
            </p>
            <Link
              href="/constituencies"
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              ← Back to Constituencies
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ElectionDatasetSelector />
      <ConstituencyDossier data={data} />
    </div>
  );
}
