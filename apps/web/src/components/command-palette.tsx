"use client";

import { useEffect, useMemo } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Map,
  TableProperties,
  Building2,
  Radio,
  TrendingUp,
  AlertTriangle,
  Headphones,
  Diff,
  PanelRight,
  Trash2,
} from "lucide-react";
import { fetchConstituencies } from "@/lib/api";
import { useFilterStore } from "@/stores/filter-store";
import { useRealtimeStore } from "@/stores/realtime-store";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NAV_ITEMS = [
  { label: "Situation Room", path: "/", icon: LayoutDashboard },
  { label: "Tactical Map", path: "/map", icon: Map },
  { label: "Constituencies", path: "/constituencies", icon: TableProperties },
  { label: "Parliament", path: "/parliament", icon: Building2 },
  { label: "Signals Feed", path: "/feed", icon: Radio },
  { label: "Economy", path: "/economy", icon: TrendingUp },
  { label: "Crisis Monitor", path: "/disasters", icon: AlertTriangle },
  { label: "War Room", path: "/war-room", icon: Headphones },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const toggleDiffMode = useFilterStore((s) => s.toggleDiffMode);
  const toggleIntelRail = useFilterStore((s) => s.toggleIntelRail);
  const clearAnomalies = useRealtimeStore((s) => s.clearAnomalies);

  const { data: constituencies } = useQuery({
    queryKey: ["constituencies"],
    queryFn: () => fetchConstituencies(),
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
                value="Toggle Intel Rail"
                onSelect={() => action(toggleIntelRail)}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer data-[selected=true]:bg-muted"
              >
                <PanelRight className="h-4 w-4 text-muted-foreground" />
                Toggle Intel Rail
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
