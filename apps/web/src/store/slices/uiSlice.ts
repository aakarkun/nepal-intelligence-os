import { createSlice } from "@reduxjs/toolkit";
import type { SignalEventType } from "@repo/shared";

export type TypeFilterValue = SignalEventType | "all";

export interface UiState {
  briefingPanelOpen: boolean;
  /** Signal feed type filter; "all" = no type filter. Persisted. */
  typeFilter: TypeFilterValue;
}

const initialState: UiState = {
  briefingPanelOpen: false,
  typeFilter: "all",
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setBriefingPanelOpen: (state, action: { payload: boolean }) => {
      state.briefingPanelOpen = action.payload;
    },
    setTypeFilter: (state, action: { payload: TypeFilterValue }) => {
      state.typeFilter = action.payload;
    },
  },
});

export const { setBriefingPanelOpen, setTypeFilter } = uiSlice.actions;
