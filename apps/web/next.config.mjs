import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Monorepo root (apps/web lives under apps/). Turbopack needs this for Docker and `next build` when the traced root is the repo.
const monorepoRoot = path.join(__dirname, "..", "..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for apps/web/Dockerfile (copies `.next/standalone` + static). Trade-off: slightly larger build; standard for container deploys.
  output: "standalone",
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;
