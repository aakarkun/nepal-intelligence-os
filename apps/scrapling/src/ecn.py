from __future__ import annotations

import json
import re
import time
from collections import defaultdict
from urllib.parse import urljoin

from .config import ECN_BASE_URL, SCRAPLING_REQUEST_DELAY_MS
from .fetcher import fetch_html
from .ingest import post_source_health, post_snapshot, post_summary
from .utils import iso_now

DISTRICT_OPTION_RE = re.compile(
    r"pradeshdistricts\['(?P<province>\d+)'\]\s*\+=\s*'<option value=\"(?P<slug>[a-z0-9]+)\">(?P<name>[^<]+)</option>';"
)
DISTRICT_REGION_RE = re.compile(r"regions\['(?P<slug>[a-z0-9]+)'\]\s*=\s*(?P<count>\d+);")
TITLE_RE = re.compile(r"<h3>(?P<title>[^<]+)</h3>")
ROW_RE = re.compile(
    r'<tr>\s*<td><a href="/profile/(?P<candidate_id>\d+)\?lng=eng".*?<span>(?P<candidate_name>[^<]+)</span></a></td>\s*'
    r'<td><a href="/party/(?P<party_numeric_id>\d+)\?lng=eng".*?<span class="party-name">(?P<party_name>[^<]+)</span></a></td>\s*'
    r"<td>.*?<div class=\"votecount (?P<result_class>[a-z]+) d-flex align-items-center\">.*?<p>(?P<votes>[0-9,]+)</p>",
    re.DOTALL,
)
PARTY_RESULTS_ROW_RE = re.compile(
    r'<div class="party-row d-flex">.*?<a href="/party/(?P<party_numeric_id>\d+)\?lng=eng" class="first-col d-flex align-items-start">.*?<p>(?P<party_name>[^<]+)</p>.*?'
    r'<span class="win-count">(?P<win>\d+)</span>.*?'
    r'<span class="lead-count">(?P<lead>\d+)</span>',
    re.DOTALL,
)
CONSTITUENCY_LINK_RE = re.compile(
    r"/pradesh-(?P<province_id>\d+)/district-(?P<district_slug>[a-z0-9-]+)/constituency-(?P<region_num>\d+)\?lng=eng"
)

PARTY_MAP = {
    "CPN-UML": {"id": "ncp-uml", "short": "UML", "color": "#ee1c25"},
    "Nepali Congress": {"id": "nc", "short": "NC", "color": "#3f653b"},
    "Nepali Communist Party": {"id": "ncp-mc", "short": "MC", "color": "#ef4444"},
    "CPN (Maoist Centre)": {"id": "ncp-mc", "short": "MC", "color": "#ef4444"},
    "Rastriya Swatantra Party": {"id": "rsp", "short": "RSP", "color": "#1a97d5"},
    "Rastriya Prajatantra Party": {"id": "rppp", "short": "RPP", "color": "#f97316"},
    "Janata Samajbadi Party": {"id": "jspn", "short": "JSPN", "color": "#ef4444"},
    "Janata Samjbadi Party-Nepal": {"id": "jspn", "short": "JSPN", "color": "#ef4444"},
    "Janata Samajbadi Party (Ekal Chunab Chinha)": {
        "id": "others",
        "short": "OTH",
        "color": "#666666",
    },
    "Loktantrik Samajbadi Party": {"id": "lsp", "short": "LSP", "color": "#339966"},
    "Nepal Majdoor Kisan Party": {"id": "nwpp", "short": "NWPP", "color": "#993366"},
    "Independent": {"id": "ind", "short": "IND", "color": "#888888"},
    "Janamat Party": {"id": "others", "short": "OTH", "color": "#666666"},
    "Shram Sanskriti Party": {"id": "others", "short": "OTH", "color": "#666666"},
    "Mongol National Organization": {"id": "others", "short": "OTH", "color": "#666666"},
    "National Republic Nepal": {"id": "others", "short": "OTH", "color": "#666666"},
    "Ujaylo Nepal Party": {"id": "others", "short": "OTH", "color": "#666666"},
    "Sanghiya Loktantrik Rastriya Manch": {"id": "others", "short": "OTH", "color": "#666666"},
}


def _party_meta(name: str) -> dict[str, str]:
    party = PARTY_MAP.get(name)
    if party is not None:
        return {
            "partyId": party["id"],
            "partyShortName": party["short"],
            "partyColor": party["color"],
        }
    return {"partyId": "others", "partyShortName": "OTH", "partyColor": "#666666"}


def _extract_districts(html: str) -> list[dict[str, object]]:
    districts: dict[str, dict[str, object]] = {}
    for match in DISTRICT_OPTION_RE.finditer(html):
        slug = match.group("slug")
        districts[slug] = {
            "provinceId": int(match.group("province")),
            "districtSlug": slug,
            "districtName": match.group("name").strip(),
            "constituencies": 0,
        }
    for match in DISTRICT_REGION_RE.finditer(html):
        slug = match.group("slug")
        if slug in districts:
            districts[slug]["constituencies"] = int(match.group("count"))
    return [
        district
        for district in districts.values()
        if int(district["constituencies"]) > 0
    ]


def _constituency_urls(base_url: str, html: str) -> list[dict[str, object]]:
    urls: list[dict[str, object]] = []
    for district in _extract_districts(html):
        province_id = int(district["provinceId"])
        district_slug = str(district["districtSlug"])
        count = int(district["constituencies"])
        district_name = str(district["districtName"])
        for region_num in range(1, count + 1):
            url = urljoin(
                base_url,
                f"/pradesh-{province_id}/district-{district_slug}/constituency-{region_num}?lng=eng",
            )
            urls.append(
                {
                    "provinceId": province_id,
                    "districtSlug": district_slug,
                    "districtName": district_name,
                    "regionNum": region_num,
                    "url": url,
                }
            )
    return urls


def _parse_votes(raw: str) -> int:
    return int(raw.replace(",", "").strip())


def _parse_constituency_page(
    html: str,
    province_id: int,
    district_name: str,
    region_num: int,
    fetched_at: str,
    final_ids: set[str] | None = None,
    leading_ids: set[str] | None = None,
) -> dict[str, object]:
    candidates = []
    final_status = "stale"
    total_votes = 0
    for match in ROW_RE.finditer(html):
        party_name = match.group("party_name").strip()
        votes = _parse_votes(match.group("votes"))
        total_votes += votes
        result_class = match.group("result_class")
        if result_class == "win":
            final_status = "final"
        elif result_class == "lead" and final_status != "final":
            final_status = "counting"
        party_meta = _party_meta(party_name)
        candidates.append(
            {
                "candidateId": f"ekantipur-{match.group('candidate_id')}",
                "candidateName": match.group("candidate_name").strip(),
                "partyId": party_meta["partyId"],
                "partyName": party_name,
                "partyColor": party_meta["partyColor"],
                "votes": votes,
            }
        )

    candidates.sort(key=lambda item: item["votes"], reverse=True)
    constituency_name = f"{district_name}-{region_num}"
    constituency_id = constituency_name.lower().replace(" ", "")

    if final_ids and constituency_id in final_ids:
        final_status = "final"
    elif leading_ids and constituency_id in leading_ids:
        final_status = "counting"

    return {
        "constituencyId": constituency_id,
        "constituencyName": constituency_name,
        "districtName": district_name,
        "provinceId": province_id,
        "status": final_status,
        "totalVotes": total_votes,
        "lastUpdate": fetched_at,
        "candidates": candidates,
        "sourceId": "ekantipur",
        "sourceName": "Ekantipur Election",
        "sourceFetchedAt": fetched_at,
    }


def _parse_party_results(html: str) -> dict[str, dict[str, int | str]]:
    party_results: dict[str, dict[str, int | str]] = {}
    for match in PARTY_RESULTS_ROW_RE.finditer(html):
        party_name = match.group("party_name").strip()
        party_meta = _party_meta(party_name)
        next_record = {
            "partyNumericId": match.group("party_numeric_id"),
            "wins": int(match.group("win")),
            "leads": int(match.group("lead")),
        }
        current = party_results.get(party_meta["partyId"])
        if current is None or (
            int(next_record["wins"]) + int(next_record["leads"])
            > int(current["wins"]) + int(current["leads"])
        ):
            party_results[party_meta["partyId"]] = next_record
    return party_results


def _fetch_status_sets(
    base_url: str, party_results_from_page: dict[str, dict[str, int | str]]
) -> tuple[set[str], set[str]]:
    final_ids: set[str] = set()
    leading_ids: set[str] = set()

    for party in party_results_from_page.values():
        numeric_id = str(party.get("partyNumericId", "")).strip()
        if not numeric_id:
            continue

        if int(party.get("wins", 0)) > 0:
            elected_html, _ = fetch_html(
                urljoin(base_url, f"/party/{numeric_id}/elected?lng=eng")
            )
            for match in CONSTITUENCY_LINK_RE.finditer(elected_html):
                final_ids.add(
                    f"{match.group('district_slug').replace('-', '')}-{match.group('region_num')}"
                )

        if int(party.get("leads", 0)) > 0:
            leading_html, _ = fetch_html(
                urljoin(base_url, f"/party/{numeric_id}/leading?lng=eng")
            )
            for match in CONSTITUENCY_LINK_RE.finditer(leading_html):
                leading_ids.add(
                    f"{match.group('district_slug').replace('-', '')}-{match.group('region_num')}"
                )

    leading_ids.difference_update(final_ids)
    return final_ids, leading_ids


def _build_summary(
    snapshots: list[dict[str, object]],
    fetched_at: str,
    party_results_from_page: dict[str, dict[str, int | str]] | None = None,
) -> dict[str, object]:
    party_totals: dict[str, dict[str, object]] = defaultdict(
        lambda: {
            "partyId": "others",
            "partyName": "Others",
            "partyShortName": "OTH",
            "partyColor": "#666666",
            "seatsWon": 0,
            "seatsLeading": 0,
            "totalVotes": 0,
        }
    )

    counted = 0
    total_votes_cast = 0
    for snapshot in snapshots:
        total_votes_cast += int(snapshot["totalVotes"])
        if snapshot["status"] in {"counting", "final"}:
            counted += 1
        for index, candidate in enumerate(snapshot["candidates"]):
            party_meta = _party_meta(str(candidate["partyName"]))
            record = party_totals[party_meta["partyId"]]
            record["partyId"] = party_meta["partyId"]
            record["partyName"] = candidate["partyName"]
            record["partyShortName"] = party_meta["partyShortName"]
            record["partyColor"] = party_meta["partyColor"]
            record["totalVotes"] += int(candidate["votes"])
            if index == 0 and not party_results_from_page:
                if snapshot["status"] == "final":
                    record["seatsWon"] += 1
                elif snapshot["status"] == "counting":
                    record["seatsLeading"] += 1

    if party_results_from_page:
        for party_id, counts in party_results_from_page.items():
            record = party_totals[party_id]
            record["partyId"] = party_id
            record["seatsWon"] = counts["wins"]
            record["seatsLeading"] = counts["leads"]

    party_results = sorted(
        party_totals.values(),
        key=lambda item: (int(item["seatsWon"]), int(item["seatsLeading"]), int(item["totalVotes"])),
        reverse=True,
    )
    return {
        # House of Representatives: 275 total seats = 165 constituency (FPTP) + 110 PR
        "totalSeats": 275,
        "totalConstituencies": 165,
        "countedConstituencies": counted,
        "totalVotesCast": total_votes_cast,
        "timestamp": fetched_at,
        "partyResults": party_results,
        "sourceId": "ekantipur",
        "sourceName": "Ekantipur Election",
        "sourceFetchedAt": fetched_at,
    }


def run_ecn() -> dict[str, object]:
    fetched_at = iso_now()
    source_health = {
        "sourceId": "ekantipur",
        "sourceName": "Ekantipur Election",
        "lastUpdate": fetched_at,
        "errorRate": 0,
        "status": "live",
        "updateCount": 0,
    }

    try:
        root_html, fetcher_name = fetch_html(ECN_BASE_URL)
        party_results_from_page = _parse_party_results(root_html)
        final_ids, leading_ids = _fetch_status_sets(ECN_BASE_URL, party_results_from_page)
        targets = _constituency_urls(ECN_BASE_URL, root_html)
        snapshots: list[dict[str, object]] = []
        failures: list[str] = []
        for index, target in enumerate(targets):
            try:
                page_html, _ = fetch_html(str(target["url"]))
                snapshot = _parse_constituency_page(
                    page_html,
                    int(target["provinceId"]),
                    str(target["districtName"]),
                    int(target["regionNum"]),
                    fetched_at,
                    final_ids,
                    leading_ids,
                )
                if snapshot["candidates"]:
                    snapshots.append(snapshot)
                if index < len(targets) - 1 and SCRAPLING_REQUEST_DELAY_MS > 0:
                    time.sleep(SCRAPLING_REQUEST_DELAY_MS / 1000)
            except Exception as exc:
                failures.append(f"{target['url']}: {exc}")

        for snapshot in snapshots:
            post_snapshot(snapshot).raise_for_status()
        summary = _build_summary(snapshots, fetched_at, party_results_from_page)
        post_summary(summary).raise_for_status()
        source_health["updateCount"] = len(snapshots)
        source_health["errorRate"] = 1 if failures else 0
        source_health["status"] = "error" if failures and not snapshots else "live"
        post_source_health(source_health).raise_for_status()
        return {
            "ok": True,
            "mode": fetcher_name,
            "url": ECN_BASE_URL,
            "targets": len(targets),
            "snapshotsPosted": len(snapshots),
            "summaryPosted": True,
            "failures": failures[:10],
        }
    except Exception as exc:
        source_health["errorRate"] = 1
        source_health["status"] = "error"
        post_source_health(source_health).raise_for_status()
        return {"ok": False, "url": ECN_BASE_URL, "error": str(exc)}


def main() -> None:
    print(json.dumps(run_ecn()))


if __name__ == "__main__":
    main()
