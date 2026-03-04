import { Hono } from "hono";
import { cors } from "hono/cors";
import { api } from "./routes";
import { createSSEResponse, startHeartbeat } from "./sse";

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

Bun.serve({
  port,
  fetch: app.fetch,
});

startHeartbeat();

console.log(`[nepal-intelligence-os] API server running on http://localhost:${port}`);
