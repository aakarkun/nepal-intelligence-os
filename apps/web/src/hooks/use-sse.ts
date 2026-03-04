"use client";

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeStore } from "@/stores/realtime-store";
import { API_URL, getConnectionStatusColor } from "@/lib/utils";
import type { SSEMessage } from "@repo/shared";

export function useSSE() {
  const queryClient = useQueryClient();
  const store = useRealtimeStore();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`${API_URL}/api/stream`);
    eventSourceRef.current = es;

    es.onopen = () => {
      reconnectAttempts.current = 0;
      store.setConnectionStatus("live");
    };

    es.onmessage = (event) => {
      try {
        const message: SSEMessage = JSON.parse(event.data);

        switch (message.type) {
          case "heartbeat":
            store.setLastHeartbeat(Date.now());
            break;

          case "snapshot":
            queryClient.invalidateQueries({ queryKey: ["constituencies"] });
            queryClient.invalidateQueries({
              queryKey: ["constituency", message.data.constituencyId],
            });
            break;

          case "summary":
            store.setLatestSummary(message.data);
            queryClient.invalidateQueries({
              queryKey: ["national-summary"],
            });
            break;

          case "anomaly":
            store.addAnomaly(message.data);
            queryClient.invalidateQueries({ queryKey: ["anomalies"] });
            break;

          case "event":
            store.addEvent(message.data);
            queryClient.invalidateQueries({ queryKey: ["feed"] });
            break;
        }
      } catch {
        // Ignore malformed messages
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      store.setConnectionStatus("error");

      const delay = Math.min(
        1000 * Math.pow(2, reconnectAttempts.current),
        30_000
      );
      reconnectAttempts.current++;

      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };
  }, [queryClient, store]);

  useEffect(() => {
    connect();

    const statusInterval = setInterval(() => {
      const { lastHeartbeat } = useRealtimeStore.getState();
      const status = getConnectionStatusColor(lastHeartbeat);
      useRealtimeStore.getState().setConnectionStatus(status);
    }, 5_000);

    return () => {
      clearInterval(statusInterval);
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (reconnectTimeoutRef.current)
        clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect]);
}
