"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { RouteHeaderResult } from "@/lib/route-header";

type ShellHeaderValue = {
  /** When set, replaces pathname-derived heading until cleared. */
  override: RouteHeaderResult | null;
  setHeader: (next: RouteHeaderResult | null) => void;
};

const ShellHeaderContext = createContext<ShellHeaderValue | null>(null);

export function ShellHeaderProvider({ children }: { children: ReactNode }) {
  const [override, setOverrideState] = useState<RouteHeaderResult | null>(null);

  const setHeader = useCallback((next: RouteHeaderResult | null) => {
    setOverrideState(next);
  }, []);

  const value = useMemo(
    () => ({ override, setHeader }),
    [override, setHeader]
  );

  return (
    <ShellHeaderContext.Provider value={value}>{children}</ShellHeaderContext.Provider>
  );
}

export function useShellHeader(): ShellHeaderValue {
  const ctx = useContext(ShellHeaderContext);
  if (!ctx) {
    throw new Error("useShellHeader must be used within ShellHeaderProvider");
  }
  return ctx;
}
