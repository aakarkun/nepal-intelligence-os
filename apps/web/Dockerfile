FROM oven/bun:1 AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/

# No --frozen-lockfile: Docker copies only web + shared; root lockfile can disagree with that subset (same as apps/api and apps/worker Dockerfiles).
RUN bun install

# Use Bun for build so `bun run build` matches package.json (`bunx next build`); avoids npm in node image without bun/bunx.
FROM oven/bun:1 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY packages/shared packages/shared
COPY apps/web apps/web

WORKDIR /app/apps/web
RUN bun run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Monorepo standalone layout: server lives at apps/web/server.js (see Next outputFileTracingRoot).
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
WORKDIR /app/apps/web
CMD ["node", "server.js"]
