"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown } from "@/components/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fetchElectionDatasets } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";

function getDisplayLabel(label: string, sourceId?: string | null): string {
  if (sourceId === "ekantipur" || label.startsWith("Ekantipur Election")) {
    return label.replace("Ekantipur Election", "Nepal Election");
  }
  return label;
}

export function ElectionDatasetSelector() {
  const { selectedDatasetId, setSelectedDatasetId, setDatasets } =
    useElectionDatasetStore();
  const [open, setOpen] = useState(false);
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

  const currentId = datasets.find((d) => d.isCurrent)?.id ?? "";
  const effectiveSelectedId = selectedDatasetId ?? currentId;
  const selected =
    datasets.find((d) => d.id === effectiveSelectedId) ?? datasets[0];
  const selectedLabel = selected
    ? `${getDisplayLabel(selected.label, selected.sourceId)}${
        selected.isCurrent ? " (Current)" : ""
      }`
    : "Dataset";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-sans text-[12px] uppercase tracking-wider text-[#888]">
        Dataset
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex items-center gap-1 rounded-full px-3 py-1.5 font-sans text-[13px] uppercase tracking-wider transition-colors",
              open
                ? "bg-blue-500/15 text-blue-400/90"
                : "text-[#888] hover:bg-white/[0.06] hover:text-[#ccc]"
            )}
          >
            <span className="max-w-[min(65vw,22rem)] truncate">
              {selectedLabel}
            </span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-72 overflow-hidden rounded-xl border border-white/[0.08] bg-surface-page p-1 text-[#ccc] shadow-xl shadow-black/50"
          align="start"
          sideOffset={4}
        >
          <div className="flex flex-col">
            {datasets.map((dataset) => {
              const isSelected = dataset.id === effectiveSelectedId;
              const display = `${getDisplayLabel(dataset.label, dataset.sourceId)}${
                dataset.isCurrent ? " (Current)" : ""
              }`;
              return (
                <button
                  key={dataset.id}
                  type="button"
                  onClick={() => {
                    setSelectedDatasetId(dataset.id || null);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-none px-3 py-2 text-left font-sans text-[13px] transition-colors",
                    isSelected
                      ? "rounded-xl bg-blue-500/15 text-blue-400/90"
                      : "hover:rounded-xl hover:bg-white/[0.06]"
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{display}</span>
                  {isSelected ? (
                    <Check className="h-4 w-4 text-blue-400/90" />
                  ) : (
                    <span className="h-4 w-4 inline-block" />
                  )}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
