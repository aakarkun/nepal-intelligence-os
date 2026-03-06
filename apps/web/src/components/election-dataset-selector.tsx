"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchElectionDatasets } from "@/lib/api";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";

export function ElectionDatasetSelector() {
  const { selectedDatasetId, setSelectedDatasetId, setDatasets } =
    useElectionDatasetStore();
  const { data: datasets = [] } = useQuery({
    queryKey: ["election-datasets"],
    queryFn: fetchElectionDatasets,
    staleTime: 60_000,
  });

  useEffect(() => {
    setDatasets(datasets);
  }, [datasets, setDatasets]);

  useEffect(() => {
    if (selectedDatasetId) return;
    const current = datasets.find((dataset) => dataset.isCurrent);
    if (current) {
      setSelectedDatasetId(current.id);
    }
  }, [datasets, selectedDatasetId, setSelectedDatasetId]);

  if (datasets.length === 0) return null;

  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Dataset</span>
      <select
        value={selectedDatasetId ?? datasets.find((d) => d.isCurrent)?.id ?? ""}
        onChange={(e) => setSelectedDatasetId(e.target.value || null)}
        className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
      >
        {datasets.map((dataset) => (
          <option key={dataset.id} value={dataset.id}>
            {dataset.label}
            {dataset.isCurrent ? " (Current)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
