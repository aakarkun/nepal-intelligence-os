import { create } from "zustand";

interface FilterState {
  activeModule: string;
  selectedProvince: number | null;
  selectedDistrict: string | null;
  selectedConstituency: string | null;
  timeRange: { start: string | null; end: string | null };
  diffMode: boolean;
  intelRailOpen: boolean;

  setActiveModule: (module: string) => void;
  setSelectedProvince: (id: number | null) => void;
  setSelectedDistrict: (id: string | null) => void;
  setSelectedConstituency: (id: string | null) => void;
  setTimeRange: (range: { start: string | null; end: string | null }) => void;
  toggleDiffMode: () => void;
  toggleIntelRail: () => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  activeModule: "election",
  selectedProvince: null,
  selectedDistrict: null,
  selectedConstituency: null,
  timeRange: { start: null, end: null },
  diffMode: false,
  intelRailOpen: true,

  setActiveModule: (module) => set({ activeModule: module }),
  setSelectedProvince: (id) => set({ selectedProvince: id }),
  setSelectedDistrict: (id) => set({ selectedDistrict: id }),
  setSelectedConstituency: (id) => set({ selectedConstituency: id }),
  setTimeRange: (range) => set({ timeRange: range }),
  toggleDiffMode: () => set((s) => ({ diffMode: !s.diffMode })),
  toggleIntelRail: () => set((s) => ({ intelRailOpen: !s.intelRailOpen })),
  resetFilters: () =>
    set({
      selectedProvince: null,
      selectedDistrict: null,
      selectedConstituency: null,
      timeRange: { start: null, end: null },
    }),
}));
