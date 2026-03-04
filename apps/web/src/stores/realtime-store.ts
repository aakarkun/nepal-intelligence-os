import { create } from "zustand";
import type { Anomaly, SignalEvent, NationalSummary } from "@repo/shared";

interface RealtimeState {
  connectionStatus: "live" | "stale" | "error";
  lastHeartbeat: number | null;
  anomalies: Anomaly[];
  recentEvents: SignalEvent[];
  latestSummary: NationalSummary | null;
  watchlist: string[];

  setConnectionStatus: (status: "live" | "stale" | "error") => void;
  setLastHeartbeat: (ts: number) => void;
  addAnomaly: (anomaly: Anomaly) => void;
  addEvent: (event: SignalEvent) => void;
  setLatestSummary: (summary: NationalSummary) => void;
  addToWatchlist: (constituencyId: string) => void;
  removeFromWatchlist: (constituencyId: string) => void;
  clearAnomalies: () => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  connectionStatus: "error",
  lastHeartbeat: null,
  anomalies: [],
  recentEvents: [],
  latestSummary: null,
  watchlist: [],

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setLastHeartbeat: (ts) => set({ lastHeartbeat: ts, connectionStatus: "live" }),
  addAnomaly: (anomaly) =>
    set((s) => ({ anomalies: [anomaly, ...s.anomalies].slice(0, 50) })),
  addEvent: (event) =>
    set((s) => ({ recentEvents: [event, ...s.recentEvents].slice(0, 100) })),
  setLatestSummary: (summary) => set({ latestSummary: summary }),
  addToWatchlist: (id) =>
    set((s) => ({
      watchlist: s.watchlist.includes(id) ? s.watchlist : [...s.watchlist, id],
    })),
  removeFromWatchlist: (id) =>
    set((s) => ({ watchlist: s.watchlist.filter((w) => w !== id) })),
  clearAnomalies: () => set({ anomalies: [] }),
}));
