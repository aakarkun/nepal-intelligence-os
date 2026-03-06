from __future__ import annotations

import json
import re
from urllib.parse import urljoin

from .config import load_news_sites
from .fetcher import fetch_html
from .ingest import post_event, post_source_health
from .utils import iso_now, stable_id


ANCHOR_RE = re.compile(r"<a[^>]+href=[\"']([^\"']+)[\"'][^>]*>(.*?)</a>", re.I | re.S)
TAG_RE = re.compile(r"<[^>]+>")
WHITESPACE_RE = re.compile(r"\s+")


def _clean_text(value: str) -> str:
    text = TAG_RE.sub(" ", value)
    return WHITESPACE_RE.sub(" ", text).strip()


def _extract_articles(site_name: str, site_url: str, html: str, limit: int = 5) -> list[dict[str, str]]:
    events: list[dict[str, str]] = []
    seen: set[str] = set()
    for href, raw_text in ANCHOR_RE.findall(html):
        text = _clean_text(raw_text)
        if len(text) < 24:
            continue
        url = urljoin(site_url, href)
        if url in seen or not url.startswith("http"):
            continue
        seen.add(url)
        events.append(
            {
                "id": stable_id("scrapling-news", url),
                "type": "news",
                "severity": "info",
                "title": text[:160],
                "body": f"Scraped from {site_name} using the Scrapling bridge.",
                "timestamp": iso_now(),
                "source": f"{site_name} (Scrapling)",
                "url": url,
            }
        )
        if len(events) >= limit:
            break
    return events


def run_news() -> dict[str, object]:
    sites = load_news_sites()
    results: list[dict[str, object]] = []

    for site in sites:
        now = iso_now()
        site_name = site.get("name", "News Site")
        site_url = site.get("url", "")
        health = {
            "sourceId": f"news:scrapling:{stable_id('site', site_url)}",
            "sourceName": f"{site_name} (Scrapling)",
            "lastUpdate": now,
            "errorRate": 0,
            "status": "live",
            "updateCount": 0,
        }

        try:
            html, fetcher_name = fetch_html(site_url)
            events = _extract_articles(site_name, site_url, html)
            for event in events:
                post_event(event).raise_for_status()
            health["updateCount"] = len(events)
            post_source_health(health).raise_for_status()
            results.append(
                {
                    "site": site_name,
                    "url": site_url,
                    "mode": fetcher_name,
                    "eventsPosted": len(events),
                }
            )
        except Exception as exc:
            health["errorRate"] = 1
            health["status"] = "error"
            post_source_health(health).raise_for_status()
            results.append(
                {
                    "site": site_name,
                    "url": site_url,
                    "error": str(exc),
                }
            )

    return {"ok": True, "sites": results}


def main() -> None:
    print(json.dumps(run_news()))


if __name__ == "__main__":
    main()
