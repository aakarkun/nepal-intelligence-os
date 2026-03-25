"use client";

import { useState, useEffect } from "react";
import { Landmark, TrendingUp, Mountain, Globe, Shield, Heart, Globe as WorldIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DiscoverRailPanel,
  discoverSidebarFooterStrip,
} from "@/components/discover/discover-rail-panel";
import type { SignalEventType } from "@repo/shared";

const DISMISSED_KEY = "nepal-intel-topics-dismissed";
const PREFERRED_KEY = "nepal-intel-preferred-topics";

const TOPICS: { id: SignalEventType | "world"; label: string; icon: typeof Landmark }[] = [
  { id: "political", label: "Politics", icon: Landmark },
  { id: "economic", label: "Economy", icon: TrendingUp },
  { id: "disaster", label: "Crisis", icon: Mountain },
  { id: "diplomatic", label: "Diplomatic", icon: Globe },
  { id: "security", label: "Security", icon: Shield },
  { id: "health", label: "Health", icon: Heart },
  { id: "world", label: "World", icon: WorldIcon },
];

export function getPreferredTopics(): SignalEventType[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PREFERRED_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as string[];
    return arr.filter((t): t is SignalEventType =>
      TOPICS.some((x) => x.id === t && x.id !== "world")
    );
  } catch {
    return [];
  }
}

export function isTopicSelectorDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DISMISSED_KEY) === "true";
}

interface TopicSelectorProps {
  onSave?: (topics: SignalEventType[]) => void;
  onDismiss?: () => void;
}

export function TopicSelector({ onSave, onDismiss }: TopicSelectorProps) {
  const [dismissed, setDismissed] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDismissed(isTopicSelectorDismissed());
    const prefs = getPreferredTopics();
    if (prefs.length > 0) setSelected(new Set(prefs));
    else setSelected(new Set());
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    const list = [...selected].filter((t) => t !== "world") as SignalEventType[];
    localStorage.setItem(PREFERRED_KEY, JSON.stringify(list));
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
    onSave?.(list);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
    onDismiss?.();
  };

  if (dismissed) return null;

  return (
    <DiscoverRailPanel
      title="Feed preferences"
      leadingDotClass="bg-violet-500"
      right={
        <button
          type="button"
          className="rounded p-1 font-mono text-[14px] leading-none text-[#888] hover:bg-white/[0.06] hover:text-[#e5e5e5]"
          aria-label="Close"
          onClick={handleDismiss}
        >
          ×
        </button>
      }
    >
      <div className="flex flex-col gap-0">
        <div className="overflow-hidden rounded-xl">
          <div
            className={cn(
              "space-y-2 overflow-hidden bg-[#181818]/60 px-3 pt-2.5 pb-3",
              "rounded-t-xl rounded-bl-xl rounded-br-xl"
            )}
          >
            <p className="font-mono text-[12px] uppercase tracking-wider text-[#666]">
              Select topics to prioritise in For You
            </p>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggle(id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-[12px] uppercase tracking-wide transition-colors",
                    selected.has(id)
                      ? "bg-emerald-500/15 text-emerald-400/90"
                      : "bg-[#0c0c0c]/90 text-[#888] hover:bg-white/[0.06] hover:text-[#ccc]"
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className={discoverSidebarFooterStrip}>
            <Button
              variant="secondary"
              size="sm"
              className="h-auto min-h-0 w-full border-0 bg-transparent py-1 font-mono text-[12px] uppercase tracking-wider text-emerald-400/90 hover:bg-white/[0.06] hover:text-emerald-400"
              onClick={handleSave}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </DiscoverRailPanel>
  );
}
