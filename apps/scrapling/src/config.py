from __future__ import annotations

import json
import os
from pathlib import Path


APP_DIR = Path(__file__).resolve().parent.parent

API_URL = os.getenv("API_URL", "http://localhost:3001").rstrip("/")
ECN_BASE_URL = os.getenv("ECN_BASE_URL", "https://election.ekantipur.com/?lng=eng")
SCRAPLING_TIMEOUT_MS = int(os.getenv("SCRAPLING_TIMEOUT_MS", "30000"))
SCRAPLING_REQUEST_DELAY_MS = int(os.getenv("SCRAPLING_REQUEST_DELAY_MS", "250"))
NEWS_SITES_PATH = Path(
    os.getenv("SCRAPLING_NEWS_SITES_PATH", str(APP_DIR / "config" / "news-sites.json"))
)


def load_news_sites() -> list[dict[str, str]]:
    if not NEWS_SITES_PATH.exists():
        return []
    with NEWS_SITES_PATH.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        return []
    return [item for item in data if isinstance(item, dict)]
