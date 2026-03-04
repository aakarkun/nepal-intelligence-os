FROM oven/bun:1 AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/

RUN bun install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY packages/shared packages/shared
COPY apps/web apps/web

WORKDIR /app/apps/web
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
