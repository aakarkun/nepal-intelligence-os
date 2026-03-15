import { createSlice } from "@reduxjs/toolkit";
import type { SignalEventType } from "@repo/shared";

export type TypeFilterValue = SignalEventType | "all";

export interface UiState {
  briefingPanelOpen: boolean;
  intelRailOpen: boolean;
  /** Signal feed type filter; "all" = no type filter. Persisted. */
  typeFilter: TypeFilterValue;
}

const initialState: UiState = {
  briefingPanelOpen: false,
  intelRailOpen: true,
  typeFilter: "all",
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setBriefingPanelOpen: (state, action: { payload: boolean }) => {
      state.briefingPanelOpen = action.payload;
    },
    toggleIntelRail: (state) => {
      state.intelRailOpen = !state.intelRailOpen;
    },
    setTypeFilter: (state, action: { payload: TypeFilterValue }) => {
      state.typeFilter = action.payload;
    },
  },
});

export const { setBriefingPanelOpen, toggleIntelRail, setTypeFilter } =
  uiSlice.actions;
