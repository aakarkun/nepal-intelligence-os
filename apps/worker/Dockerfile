FROM oven/bun:1 AS base
WORKDIR /app

# Python + pip for live ECN (Scrapling script); Scrapling[fetchers] uses Playwright
RUN apt-get update -qq && apt-get install -y --no-install-recommends python3 python3-pip && rm -rf /var/lib/apt/lists/*
COPY apps/scrapling/requirements.txt apps/scrapling/requirements.txt
RUN pip3 install --no-cache-dir --break-system-packages -r apps/scrapling/requirements.txt
# Playwright needs Chromium and system deps (Scrapling StealthyFetcher uses it)
RUN python3 -m playwright install-deps chromium || true
RUN python3 -m playwright install chromium

COPY package.json bun.lock ./
COPY packages/shared/package.json packages/shared/
COPY apps/worker/package.json apps/worker/

# No --frozen-lockfile: Docker copies only a subset of the workspace (worker + shared), so the root lockfile can disagree with that subset and cause "lockfile had changes".
RUN bun install

COPY packages/shared packages/shared
# Explicit copy so fixtures and config are always included (avoids cache missing them)
COPY apps/worker/fixtures apps/worker/fixtures
COPY apps/worker/config apps/worker/config
COPY apps/worker/src apps/worker/src
# Scrapling ECN script for live election data (worker calls python3 run_ecn.py; requirements already installed above)
COPY apps/scrapling/run_ecn.py apps/scrapling/
COPY apps/scrapling/src apps/scrapling/src
COPY apps/scrapling/config apps/scrapling/config

CMD ["bun", "run", "apps/worker/src/index.ts"]
