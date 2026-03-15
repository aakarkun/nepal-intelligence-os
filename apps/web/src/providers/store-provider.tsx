"use client";

import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import type { Persistor } from "redux-persist";
import { store, persistor } from "@/store";
import { useState, useEffect, type ReactNode } from "react";

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background font-mono text-sm text-muted-foreground">
      <span>Loading…</span>
    </div>
  );
}

/** Renders children after persist rehydrates, or after a timeout so the app never hangs. */
function PersistGateWithTimeout({
  children,
  persistor,
}: {
  children: ReactNode;
  persistor: Persistor;
}) {
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(t);
  }, []);

  if (timedOut) return <>{children}</>;

  return (
    <PersistGate loading={<LoadingFallback />} persistor={persistor}>
      {children}
    </PersistGate>
  );
}

export function StoreProvider({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGateWithTimeout persistor={persistor}>
        {children}
      </PersistGateWithTimeout>
    </Provider>
  );
}
