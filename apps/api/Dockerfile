FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json bun.lock ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

RUN bun install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/api apps/api

EXPOSE 3001
CMD ["bun", "run", "apps/api/src/index.ts"]
