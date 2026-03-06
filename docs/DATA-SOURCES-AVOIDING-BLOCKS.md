# News, Reddit & X — Getting Data Without Getting IP Blocked

This doc describes how the worker gets **news**, **Reddit**, and **X (Twitter)** in a way that minimizes IP blocks and rate-limit issues.

---

## News

| Source | How | Block risk |
|--------|-----|------------|
| **RSS feeds** | `news-feeds.json` + rss-parser; no browser, no scraping | Very low — RSS is meant to be consumed. |
| **GDELT** | Official GDELT API (`api.gdeltproject.org`); Nepal/election query | Low — use reasonable interval (worker uses 15 min). |

**Recommendation:** Keep using RSS + GDELT for news. Add more feeds to `apps/worker/config/news-feeds.json` if needed. Avoid scraping news site HTML at scale without proxies or official APIs.

---

## Reddit

| Source | How | Block risk |
|--------|-----|------------|
| **Direct .json** | `reddit.com/r/<sub>/new.json` (current default) | **Medium** — Reddit rate-limits and can return 403. |
| **GDELT Reddit** | GDELT query for Reddit-sourced articles (Nepal/election). **Does not hit Reddit.** | **None** — no Reddit requests. |
| **Official Reddit API** | OAuth2 app (script or installed); 60 req/min. | Low if you stay under limits. |

**What the worker does:**

- **GDELT Reddit** runs every social cycle and posts events from GDELT’s index of reddit.com (no direct Reddit calls).
- **Direct Reddit** (config in `social-feeds.json` → `reddit`) runs with:
  - **REDDIT_DELAY_MS** (default 5000) between each subreddit.
  - Retries with exponential backoff on 429/403 (**REDDIT_MAX_RETRIES**, default 2).
  - **REDDIT_USER_AGENT** set to a descriptive bot name (Reddit expects this).

**To reduce block risk:**

1. Prefer **fewer subreddits** in `social-feeds.json` and **increase REDDIT_DELAY_MS** (e.g. 8000–10000).
2. Rely more on **GDELT Reddit** and **remove or trim** the `reddit` list if you don’t need live subreddit JSON.
3. Optional: run the worker behind a **proxy** and set **REDDIT_PROXY** (or **HTTP_PROXY**); proxy support depends on your runtime.

---

## X (Twitter)

| Source | How | Block risk |
|--------|-----|------------|
| **Official X API** | `TWITTER_BEARER_TOKEN`; worker uses Twitter API v2 search. | Low within API limits; may require paid tier for heavy use. |
| **Nitter RSS** | Public Nitter instance search RSS (e.g. `nitter.poast.org/search/rss?q=...`). **No X API key.** | Low for your IP; Nitter instances can be unstable or rate-limited. |

**What the worker does:**

- If **TWITTER_BEARER_TOKEN** is set: fetches from X API (config in `social-feeds.json` → `twitter`).
- **Nitter** (config in `social-feeds.json` → `nitter`): fetches search RSS from **NITTER_BASE_URL** (default `https://nitter.poast.org`). No X API key; no direct requests to X.

**To avoid X blocks:**

1. Use **Nitter** only: leave **TWITTER_BEARER_TOKEN** unset and add one or more `nitter` entries in `social-feeds.json` (name + query). You get X-style content without hitting X or using an API key.
2. Or use **only the official API** with a valid token and stay within rate limits.
3. If a Nitter instance goes down, set **NITTER_BASE_URL** to another instance (e.g. from [Nitter instances list](https://github.com/zedeus/nitter/wiki/Instances)).

---

## Env summary

| Variable | Purpose |
|----------|---------|
| `REDDIT_USER_AGENT` | Descriptive bot name for Reddit (recommended). |
| `REDDIT_DELAY_MS` | Ms to wait between each subreddit (default 5000). |
| `REDDIT_MAX_RETRIES` | Retries on 429/403 (default 2). |
| `REDDIT_PROXY` / `HTTP_PROXY` | Optional proxy for Reddit requests. |
| `NITTER_BASE_URL` | Nitter instance for X RSS (default nitter.poast.org). |
| `TWITTER_BEARER_TOKEN` | Optional; if set, worker also uses X API. |

---

## Config files

- **News:** `apps/worker/config/news-feeds.json` (name + url per feed).
- **Social:** `apps/worker/config/social-feeds.json`:
  - `twitter`: name + query (requires TWITTER_BEARER_TOKEN).
  - `nitter`: name + query (no token).
  - `reddit`: name + subreddit (optional; GDELT Reddit runs regardless).
