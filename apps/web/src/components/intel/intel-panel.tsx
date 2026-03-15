"use client";

import { useState, useCallback, useEffect } from "react";
import { X, Loader2, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/store";
import { setBriefingPanelOpen } from "@/store/slices/uiSlice";
import { fetchIntelBrief, type IntelBriefType, type IntelBriefResponse } from "@/lib/api";
import { formatNepalTime } from "@/lib/utils";

const BRIEF_TYPES: { id: IntelBriefType; label: string }[] = [
  { id: "daily", label: "Daily Brief" },
  { id: "economic", label: "Economic" },
  { id: "crisis", label: "Crisis" },
  { id: "custom", label: "Custom" },
];

export function IntelPanel() {
  const open = useSelector((s: RootState) => s.ui.briefingPanelOpen);
  const dispatch = useDispatch();
  const setOpen = (value: boolean) => dispatch(setBriefingPanelOpen(value));
  const [briefType, setBriefType] = useState<IntelBriefType>("daily");
  const [customQuery, setCustomQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IntelBriefResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleClose = useCallback(() => setOpen(false), [setOpen]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  const handleGenerate = useCallback(async () => {
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetchIntelBrief({
        type: briefType,
        ...(briefType === "custom" && customQuery.trim()
          ? { query: customQuery.trim() }
          : {}),
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Briefing generation failed");
    } finally {
      setLoading(false);
    }
  }, [briefType, customQuery]);

  const handleCopy = useCallback(async () => {
    if (!result?.brief) return;
    try {
      await navigator.clipboard.writeText(result.brief);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [result]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />
      <div
        className={cn(
          "relative w-full max-w-2xl max-h-[90vh] flex flex-col",
          "rounded-lg border border-border bg-card shadow-2xl",
          "overflow-hidden"
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-display text-base font-semibold">Intel Briefing</h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3">
          {BRIEF_TYPES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setBriefType(id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                briefType === id
                  ? "bg-nepal-red/15 text-nepal-red"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {briefType === "custom" && (
          <div className="border-b border-border px-4 py-2">
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="Ask anything about Nepal right now..."
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-nepal-red/30"
            />
          </div>
        )}
        <div className="px-4 py-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="w-full rounded-md bg-nepal-red/90 px-4 py-2 text-sm font-medium text-white hover:bg-nepal-red disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analysing live data...
              </span>
            ) : (
              "Generate Brief"
            )}
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto border-t border-border">
          {error && (
            <div className="m-4 rounded border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error.includes("not configured")
                ? "Intel service unavailable — check ANTHROPIC_API_KEY"
                : error}
            </div>
          )}
          {!result && !error && !loading && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <p className="mb-2">Daily: situation, economy, crisis, headlines.</p>
              <p className="mb-2">Economic: NEPSE, forex, commodities.</p>
              <p className="mb-2">Crisis: active incidents and seismic.</p>
              <p className="mb-2">Custom: ask anything using live data.</p>
              <p>Press Generate to analyse live Nepal data.</p>
            </div>
          )}
          {result && (
            <div className="p-4">
              <div className="relative rounded border border-border bg-muted/30 p-4">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="absolute right-2 top-2 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed pr-10">
                  {result.brief}
                </pre>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Generated at {formatNepalTime(result.generatedAt)} · {result.dataPoints} data
                  points used
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
