FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json bun.lock ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

# No --frozen-lockfile: Docker copies only a subset of the workspace (api + shared), so the root lockfile can disagree with that subset and cause "lockfile had changes".
RUN bun install

COPY packages/shared packages/shared
COPY apps/api apps/api

EXPOSE 3001
CMD ["bun", "run", "apps/api/src/index.ts"]
