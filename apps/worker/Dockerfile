FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json bun.lock ./
COPY packages/shared/package.json packages/shared/
COPY apps/worker/package.json apps/worker/

RUN bun install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/worker apps/worker

CMD ["bun", "run", "apps/worker/src/index.ts"]
