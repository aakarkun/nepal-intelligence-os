import { createSlice } from "@reduxjs/toolkit";

export interface UiState {
  briefingPanelOpen: boolean;
  intelRailOpen: boolean;
}

const initialState: UiState = {
  briefingPanelOpen: false,
  intelRailOpen: true,
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
  },
});

export const { setBriefingPanelOpen, toggleIntelRail } = uiSlice.actions;
