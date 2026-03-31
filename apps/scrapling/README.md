# Scrapling Ingestors

This app is the Python ingestion layer for sources that are unreliable with plain HTTP fetches.

Current scope:

- `run_ecn.py`: fetch ECN and post an `official` event plus `source-health` into the API
- `run_news.py`: scrape configured news homepages, post `news` events, and update `source-health`

These scripts are intentionally decoupled from the Bun worker. They can be run:

- manually
- from cron
- from a future Bun subprocess wrapper

## Setup

```bash
cd apps/scrapling
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
scrapling install
cp .env.example .env
```

## Run

```bash
python run_ecn.py
python run_news.py
```

Both commands also emit a JSON result summary to stdout.

Current limitation:

- ECN structured summary/snapshot parsing is still pending, so `run_ecn.py` does not post election summaries yet.
