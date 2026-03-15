import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { persistStore, persistReducer } from "redux-persist";
import { watchlistApi } from "./api/watchlistApi";
import { uiSlice } from "./slices/uiSlice";
import { persistStorage } from "./storage";

const uiPersistConfig = {
  key: "nepal-intel-ui",
  storage: persistStorage,
  whitelist: ["briefingPanelOpen", "intelRailOpen", "typeFilter"],
};

const watchlistApiPersistConfig = {
  key: "nepal-intel-watchlist-api",
  storage: persistStorage,
  whitelist: ["queries"],
};

const persistedUiReducer = persistReducer(uiPersistConfig, uiSlice.reducer);
const persistedWatchlistApiReducer = persistReducer(
  watchlistApiPersistConfig,
  watchlistApi.reducer
);

export const store = configureStore({
  reducer: {
    ui: persistedUiReducer,
    [watchlistApi.reducerPath]: persistedWatchlistApiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
        ignoredPaths: [watchlistApi.reducerPath],
      },
    }).concat(watchlistApi.middleware),
});

setupListeners(store.dispatch);

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
