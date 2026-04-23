import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Monorepo root (apps/web lives under apps/). Turbopack needs this for Docker and `next build` when the traced root is the repo.
const monorepoRoot = path.join(__dirname, "..", "..");
const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:3001";
const allowedDevOrigins = (
  process.env.NEXT_ALLOWED_DEV_ORIGINS ??
  "rumashs-macbook-air.tail24d5b0.ts.net,100.64.50.110"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for apps/web/Dockerfile (copies `.next/standalone` + static). Trade-off: slightly larger build; standard for container deploys.
  output: "standalone",
  turbopack: {
    root: monorepoRoot,
  },
  allowedDevOrigins,
  async rewrites() {
    return [
      { source: "/v1/:path*", destination: `${apiProxyTarget}/v1/:path*` },
      { source: "/api/stream", destination: `${apiProxyTarget}/api/stream` },
    ];
  },
};

export default nextConfig;
