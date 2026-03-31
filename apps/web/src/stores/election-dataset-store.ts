import { create } from "zustand";
import type { ElectionDataset } from "@/lib/api";

interface ElectionDatasetState {
  selectedDatasetId: string | null;
  datasets: ElectionDataset[];
  setSelectedDatasetId: (id: string | null) => void;
  setDatasets: (datasets: ElectionDataset[]) => void;
}

export const useElectionDatasetStore = create<ElectionDatasetState>((set) => ({
  selectedDatasetId: null,
  datasets: [],
  setSelectedDatasetId: (id) => set({ selectedDatasetId: id }),
  setDatasets: (datasets) =>
    set((state) => {
      const sameLength = state.datasets.length === datasets.length;
      const sameItems =
        sameLength &&
        state.datasets.every(
          (current, index) =>
            current.id === datasets[index]?.id &&
            current.timestamp === datasets[index]?.timestamp &&
            current.isCurrent === datasets[index]?.isCurrent
        );

      if (sameItems) {
        return state;
      }

      return { ...state, datasets };
    }),
}));
