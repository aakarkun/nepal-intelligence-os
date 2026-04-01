from __future__ import annotations

from urllib import request

from .config import SCRAPLING_TIMEOUT_MS

try:
    from scrapling.fetchers import StealthyFetcher
except Exception:  # pragma: no cover - optional at runtime
    StealthyFetcher = None


def fetch_html(url: str) -> tuple[str, str]:
    timeout_seconds = max(1, SCRAPLING_TIMEOUT_MS // 1000)

    if StealthyFetcher is not None:
        fetcher = StealthyFetcher(auto_match=False)
        page = fetcher.fetch(url, timeout=timeout_seconds * 1000)
        html = getattr(page, "html_content", None) or getattr(page, "html", None) or str(page)
        return html, "scrapling"

    req = request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 NepalIntelligenceOS Scrapling Bridge/1.0"},
    )
    with request.urlopen(req, timeout=timeout_seconds) as response:
        return response.read().decode("utf-8", errors="replace"), "urllib"
