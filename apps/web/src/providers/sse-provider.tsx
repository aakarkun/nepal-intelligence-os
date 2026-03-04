"use client";

import { useSSE } from "@/hooks/use-sse";
import type { ReactNode } from "react";

function SSEConnector() {
  useSSE();
  return null;
}

export function SSEProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <SSEConnector />
      {children}
    </>
  );
}
