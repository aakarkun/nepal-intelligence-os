/**
 * Frontend environment configuration.
 * Only NEXT_PUBLIC_* vars are available at build/runtime in the browser.
 * Mirrors .env.example at repo root.
 */

export const env = {
  NEXT_PUBLIC_API_URL:
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "",
  NEXT_PUBLIC_ENABLE_WAR_ROOM:
    process.env.NEXT_PUBLIC_ENABLE_WAR_ROOM === "true",
} as const;
