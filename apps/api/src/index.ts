import { Hono } from "hono";
import { cors } from "hono/cors";
import { api } from "./routes";
import { createSSEResponse, startHeartbeat } from "./sse";
import { seedFromFixturesIfEmpty } from "./seed";
import { ensureHor2082OfficialSummary } from "./seed-hor-2082.js";
import { ensurePoliticalPulseSeed } from "./seed-political-pulse.js";
import { runMigrations } from "./db/migrate.js";
import { closeDb } from "./db/client.js";
import { hydrateElectionFromDb, hydrateOperationalCacheFromDb } from "./store.js";

const app = new Hono();

app.use("*", cors());

app.route("/", api);

app.get("/api/stream", () => {
  return createSSEResponse();
});

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

const port = Number(process.env.API_PORT) || 3001;

await runMigrations();
console.log("[api] migrations complete");

await seedFromFixturesIfEmpty();
await ensureHor2082OfficialSummary();
await ensurePoliticalPulseSeed();
await hydrateElectionFromDb();
await hydrateOperationalCacheFromDb();

process.on("SIGTERM", async () => {
  await closeDb();
  process.exit(0);
});
process.on("SIGINT", async () => {
  await closeDb();
  process.exit(0);
});

Bun.serve({
  port,
  hostname: "0.0.0.0",
  fetch: app.fetch,
});

startHeartbeat();

console.log(`[nepal-intelligence-os] API server running on http://localhost:${port}`);
