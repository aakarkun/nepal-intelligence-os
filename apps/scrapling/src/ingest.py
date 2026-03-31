from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any
from urllib import error, request

from .config import API_URL, SCRAPLING_TIMEOUT_MS


@dataclass
class Response:
    status_code: int
    body: str

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}: {self.body}")


def _post(path: str, payload: dict[str, Any]) -> Response:
    body = json.dumps(payload).encode("utf-8")
    req = request.Request(
        f"{API_URL}{path}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=max(1, SCRAPLING_TIMEOUT_MS // 1000)) as res:
            return Response(res.status, res.read().decode("utf-8"))
    except error.HTTPError as exc:
        return Response(exc.code, exc.read().decode("utf-8"))


def post_summary(payload: dict[str, Any]) -> Response:
    return _post("/v1/ingest/summary", payload)


def post_snapshot(payload: dict[str, Any]) -> Response:
    return _post("/v1/ingest/snapshot", payload)


def post_event(payload: dict[str, Any]) -> Response:
    return _post("/v1/ingest/event", payload)


def post_source_health(payload: dict[str, Any]) -> Response:
    return _post("/v1/ingest/source-health", payload)
