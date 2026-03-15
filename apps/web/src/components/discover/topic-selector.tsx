"use client";

import { useState, useEffect } from "react";
import { Landmark, TrendingUp, Mountain, Globe, Shield, Heart, Globe as WorldIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium text-foreground">Customise your feed</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Select topics to show first
          </p>
        </div>
        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close"
          onClick={handleDismiss}
        >
          ×
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {TOPICS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => toggle(id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              selected.has(id)
                ? "border-nepal-red bg-nepal-red/15 text-nepal-red"
                : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>
      <Button
        variant="secondary"
        size="sm"
        className="mt-3 w-full"
        onClick={handleSave}
      >
        Save
      </Button>
    </div>
  );
}
