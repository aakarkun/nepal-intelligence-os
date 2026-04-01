import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Anomaly, SignalEvent, NationalSummary } from "@repo/shared";

interface RealtimeState {
  connectionStatus: "live" | "stale" | "error";
  lastHeartbeat: number | null;
  anomalies: Anomaly[];
  recentEvents: SignalEvent[];
  latestSummary: NationalSummary | null;
  watchlist: string[];
  candidateWatchlist: {
    candidateId: string;
    constituencyId: string;
    candidateName: string;
    partyName: string;
  }[];

  setConnectionStatus: (status: "live" | "stale" | "error") => void;
  setLastHeartbeat: (ts: number) => void;
  addAnomaly: (anomaly: Anomaly) => void;
  addEvent: (event: SignalEvent) => void;
  setLatestSummary: (summary: NationalSummary) => void;
  addToWatchlist: (constituencyId: string) => void;
  removeFromWatchlist: (constituencyId: string) => void;
  addCandidateToWatchlist: (candidate: {
    candidateId: string;
    constituencyId: string;
    candidateName: string;
    partyName: string;
  }) => void;
  removeCandidateFromWatchlist: (candidateId: string) => void;
  clearAnomalies: () => void;
}

export const useRealtimeStore = create<RealtimeState>()(
  persist(
    (set) => ({
      connectionStatus: "error",
      lastHeartbeat: null,
      anomalies: [],
      recentEvents: [],
      latestSummary: null,
      watchlist: [],
      candidateWatchlist: [],

      setConnectionStatus: (status) => set({ connectionStatus: status }),
      setLastHeartbeat: (ts) =>
        set({ lastHeartbeat: ts, connectionStatus: "live" }),
      addAnomaly: (anomaly) =>
        set((s) => ({ anomalies: [anomaly, ...s.anomalies].slice(0, 50) })),
      addEvent: (event) =>
        set((s) => ({ recentEvents: [event, ...s.recentEvents].slice(0, 100) })),
      setLatestSummary: (summary) => set({ latestSummary: summary }),
      addToWatchlist: (id) =>
        set((s) => ({
          watchlist: s.watchlist.includes(id)
            ? s.watchlist
            : [...s.watchlist, id],
        })),
      removeFromWatchlist: (id) =>
        set((s) => ({ watchlist: s.watchlist.filter((w) => w !== id) })),
      addCandidateToWatchlist: (candidate) =>
        set((s) => {
          const exists = s.candidateWatchlist.some(
            (c) => c.candidateId === candidate.candidateId
          );
          if (exists) return s;
          return {
            candidateWatchlist: [...s.candidateWatchlist, candidate],
          };
        }),
      removeCandidateFromWatchlist: (candidateId) =>
        set((s) => ({
          candidateWatchlist: s.candidateWatchlist.filter(
            (c) => c.candidateId !== candidateId
          ),
        })),
      clearAnomalies: () => set({ anomalies: [] }),
    }),
    {
      name: "nepal-intel-realtime",
      partialize: (state) => ({
        watchlist: state.watchlist,
        candidateWatchlist: state.candidateWatchlist,
      }),
    }
  )
);
