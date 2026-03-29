"use client";

import { useEffect, useMemo } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Diff, PanelRight, Trash2 } from "@/components/icons";
import { flattenNavItems } from "@/components/layout/nav-config";
import { fetchConstituencies } from "@/lib/api";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";
import { useDispatch } from "react-redux";
import { useFilterStore } from "@/stores/filter-store";
import { toggleIntelRail } from "@/store/slices/uiSlice";
import { useRealtimeStore } from "@/stores/realtime-store";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Same routes/order as sidebar `NAV_SECTIONS` (flattenNavItems). */
const NAV_ITEMS = flattenNavItems().map((item) => ({
  label: item.label,
  path: item.href,
  icon: item.icon,
}));

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { selectedDatasetId } = useElectionDatasetStore();
  const toggleDiffMode = useFilterStore((s) => s.toggleDiffMode);
  const dispatch = useDispatch();
  const togglePanel = () => dispatch(toggleIntelRail());
  const clearAnomalies = useRealtimeStore((s) => s.clearAnomalies);

  const { data: constituencies } = useQuery({
    queryKey: ["constituencies", selectedDatasetId],
    queryFn: () => fetchConstituencies({ dataset: selectedDatasetId }),
    enabled: open,
  });

  function navigate(path: string) {
    router.push(path);
    onOpenChange(false);
  }

  function action(fn: () => void) {
    fn();
    onOpenChange(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[640px]">
        <Command
          className="bg-card border border-border rounded-lg overflow-hidden shadow-2xl"
          loop
        >
          <Command.Input
            placeholder="Type a command or search..."
            className="w-full px-4 py-3 text-sm bg-transparent border-b border-border outline-none placeholder:text-muted-foreground"
          />
          <Command.List className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            <Command.Group
              heading="Navigation"
              className="text-xs text-muted-foreground uppercase tracking-wider px-2 py-1.5"
            >
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Command.Item
                    key={item.path}
                    value={item.label}
                    onSelect={() => navigate(item.path)}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer data-[selected=true]:bg-muted"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {item.label}
                  </Command.Item>
                );
              })}
            </Command.Group>

            {constituencies && constituencies.length > 0 && (
              <Command.Group
                heading="Constituencies"
                className="text-xs text-muted-foreground uppercase tracking-wider px-2 py-1.5"
              >
                {constituencies.map((c) => (
                  <Command.Item
                    key={c.constituencyId}
                    value={`${c.constituencyName} ${c.districtName}`}
                    onSelect={() =>
                      navigate(`/constituencies/${c.constituencyId}`)
                    }
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer data-[selected=true]:bg-muted"
                  >
                    <TableProperties className="h-4 w-4 text-muted-foreground" />
                    <span>{c.constituencyName}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {c.districtName}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group
              heading="Actions"
              className="text-xs text-muted-foreground uppercase tracking-wider px-2 py-1.5"
            >
              <Command.Item
                value="Toggle diff mode"
                onSelect={() => action(toggleDiffMode)}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer data-[selected=true]:bg-muted"
              >
                <Diff className="h-4 w-4 text-muted-foreground" />
                Toggle Diff Mode
              </Command.Item>
              <Command.Item
                value="Toggle right panel"
                onSelect={() => action(togglePanel)}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer data-[selected=true]:bg-muted"
              >
                <PanelRight className="h-4 w-4 text-muted-foreground" />
                Toggle right panel
              </Command.Item>
              <Command.Item
                value="Clear anomalies"
                onSelect={() => action(clearAnomalies)}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer data-[selected=true]:bg-muted"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
                Clear Anomalies
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
