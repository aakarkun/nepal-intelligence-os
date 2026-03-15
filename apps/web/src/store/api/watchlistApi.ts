import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { WatchlistItem, WatchlistItemType } from "@repo/shared";

const API_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001")
    : "http://localhost:3001";

export type WatchlistCreateInput = {
  label: string;
  type: WatchlistItemType;
  value: string;
  threshold?: number;
  telegramChatId?: string;
  active?: boolean;
};

export const watchlistApi = createApi({
  reducerPath: "watchlistApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_URL}/v1`,
    prepareHeaders: (headers) => {
      headers.set("Content-Type", "application/json");
      return headers;
    },
  }),
  tagTypes: ["Watchlist"],
  endpoints: (builder) => ({
    getWatchlist: builder.query<WatchlistItem[], void>({
      query: () => "/watchlist",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Watchlist" as const, id })),
              { type: "Watchlist", id: "LIST" },
            ]
          : [{ type: "Watchlist", id: "LIST" }],
    }),
    createWatchlistItem: builder.mutation<WatchlistItem, WatchlistCreateInput>({
      query: (body) => ({
        url: "/watchlist",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Watchlist", id: "LIST" }],
    }),
    deleteWatchlistItem: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({
        url: `/watchlist/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _err, id) => [{ type: "Watchlist", id }, { type: "Watchlist", id: "LIST" }],
    }),
    toggleWatchlistItem: builder.mutation<WatchlistItem, string>({
      query: (id) => ({
        url: `/watchlist/${id}/toggle`,
        method: "PATCH",
      }),
      invalidatesTags: (_result, _err, id) => [{ type: "Watchlist", id }, { type: "Watchlist", id: "LIST" }],
    }),
  }),
});

export const {
  useGetWatchlistQuery,
  useCreateWatchlistItemMutation,
  useDeleteWatchlistItemMutation,
  useToggleWatchlistItemMutation,
} = watchlistApi;
