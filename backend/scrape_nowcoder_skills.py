"""Build and optionally enrich the schema-v2 Nowcoder ACM catalog."""
from __future__ import annotations

import argparse
import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

import httpx
from bs4 import BeautifulSoup

import config as _app_config  # noqa: F401 - load backend/.env before creating the client
from problem_catalog import CATALOG_SCHEMA_VERSION
from routes.scrape import NOWCODER_LIST_URL, _build_nowcoder_headers, _parse_nowcoder_detail

PROBLEM_LIST_URL = NOWCODER_LIST_URL
SKILL_LIST_URL = "https://ac.nowcoder.com/acm/skill/acm"
PAGE_SIZE = 50
MAX_PAGES = 20
SCHEMA_VERSION = CATALOG_SCHEMA_VERSION
OUTPUT_PATH = Path(__file__).with_name("nowcoder_skills_result.json")
MIN_CATALOG_RETENTION_RATIO = 0.8


class CatalogValidationError(RuntimeError):
    """Raised when a crawl is unsafe to promote over the prior catalog."""


DETAIL_FIELDS = (
    "title",
    "description",
    "input_description",
    "output_description",
    "notes",
    "hints",
    "constraints",
    "samples",
    "time_limit",
    "space_limit",
    "accepted",
    "submitted",
    "ac_rate",
    "media",
)


def create_client() -> httpx.Client:
    client = httpx.Client(headers=_build_nowcoder_headers(), follow_redirects=True, timeout=20)
    client.get("https://ac.nowcoder.com/")
    client.headers["Referer"] = "https://ac.nowcoder.com/"
    return client


def _validate_response(response, context: str) -> str:
    """Reject HTTP errors, WAF pages, and empty HTML before parsing."""
    response.raise_for_status()
    html = response.text or ""
    lowered = html[:3000].lower()
    if "aliyun_waf" in lowered or "aliyun waf" in lowered:
        raise CatalogValidationError(f"{context}: Nowcoder WAF blocked the request")
    if not html.strip():
        raise CatalogValidationError(f"{context}: empty response")
    return html


def scrape_skills(client: httpx.Client) -> list[dict]:
    """Scrape all skill categories from the main page."""
    print("[Step 1] 爬取技能分类列表...")
    response = client.get(SKILL_LIST_URL)
    soup = BeautifulSoup(_validate_response(response, "skill list"), "html.parser")

    skills = []
    seen = set()
    parsed_counts = 0
    links = soup.find_all("a", href=re.compile(r"/acm/skill/detail/acm/\d+"))
    for link in links:
        href = link["href"]
        if href in seen:
            continue
        seen.add(href)
        tag_id = href.rstrip("/").split("/")[-1]
        text = link.get_text(strip=True)
        match = re.match(r"(.+?)([\d,]+)人练习共([\d,]+)道题目", text)
        if match:
            name = match.group(1).strip()
            practice_count = int(match.group(2).replace(",", ""))
            problem_count = int(match.group(3).replace(",", ""))
            parsed_counts += 1
        else:
            name = text
            practice_count = 0
            problem_count = 0
        skills.append({
            "tag_id": tag_id,
            "name": name,
            "practice_count": practice_count,
            "problem_count": problem_count,
        })

    if not links or not skills or parsed_counts == 0:
        raise CatalogValidationError("skill list: expected skill/count markup was not found")
    skills.sort(key=lambda skill: -skill["problem_count"])
    print(f"  {len(skills)} 个技能分类, 预估 {sum(s['problem_count'] for s in skills)} 题")
    return skills


def scrape_problem_detail(client: httpx.Client, pid: str) -> dict:
    """Fetch structured statement fields for one catalog problem."""
    response = client.get(f"https://ac.nowcoder.com/acm/problem/{pid}")
    response.raise_for_status()
    parsed = _parse_nowcoder_detail(response.text)
    if parsed.get("waf_blocked"):
        raise RuntimeError("Nowcoder WAF blocked the detail request")
    return {
        key: parsed[key]
        for key in DETAIL_FIELDS
        if parsed.get(key) not in (None, "", [])
    }


def scrape_problems_by_tag(client: httpx.Client, tag_id: str) -> list[dict]:
    """Scrape summary records for every list page under one tag."""
    problems = []
    seen = set()
    for page in range(1, MAX_PAGES + 1):
        response = client.get(PROBLEM_LIST_URL, params={
            "tagId": tag_id,
            "page": str(page),
            "pageSize": str(PAGE_SIZE),
        })
        html = _validate_response(response, f"problem list tag={tag_id} page={page}")
        soup = BeautifulSoup(html, "html.parser")
        table = soup.find("table")
        if not table:
            raise CatalogValidationError(
                f"problem list tag={tag_id} page={page}: expected list table was not found"
            )
        rows = table.select("tr[data-problemid]")
        if not rows:
            if page == 1:
                return []
            break

        new_in_page = 0
        for row in rows:
            pid = row.get("data-problemid", "").strip()
            if not pid or pid in seen:
                continue
            cells = row.find_all("td")
            if len(cells) < 4:
                continue
            nc_id = cells[0].get_text(strip=True)
            title_link = cells[1].find("a", class_="title")
            title = title_link.get_text(strip=True) if title_link else cells[1].get_text(strip=True)[:60]
            tags = [anchor.get_text(strip=True) for anchor in cells[1].find_all("a", class_="tag-label")]
            try:
                pass_count = int(cells[3].get_text(strip=True).replace(",", "") or "0")
            except ValueError:
                pass_count = 0

            seen.add(pid)
            problems.append({
                "id": f"nowcoder-{pid}",
                "pid": pid,
                "native_id": pid,
                "nc_id": nc_id,
                "title": title,
                "tags": tags,
                "pass_count": pass_count,
                "url": f"https://ac.nowcoder.com/acm/problem/{pid}",
            })
            new_in_page += 1

        if new_in_page == 0 or len(rows) < PAGE_SIZE:
            break
        if page % 5 == 0:
            time.sleep(0.3)
    return problems


def _detail_status(detail: dict | None) -> str:
    if not isinstance(detail, dict) or not any(detail.get(key) not in (None, "", []) for key in DETAIL_FIELDS):
        return "failed"
    has_statement = bool(detail.get("description"))
    has_io = bool(
        detail.get("samples")
        or (detail.get("input_description") and detail.get("output_description"))
    )
    return "complete" if has_statement and has_io else "partial"


def _record_detail(record: dict) -> dict:
    """Read nested details, migrating successful schema-v2 flat fields in memory."""
    nested = record.get("detail")
    if isinstance(nested, dict):
        return dict(nested)
    return {
        key: record[key]
        for key in DETAIL_FIELDS
        if record.get(key) not in (None, "", [])
    }


def load_existing_catalog(path: Path) -> dict | None:
    """Load only schema-v2 output, so unrelated legacy files are never resumed."""
    try:
        with path.open("r", encoding="utf-8") as handle:
            catalog = json.load(handle)
    except (OSError, json.JSONDecodeError, TypeError):
        return None
    if not isinstance(catalog, dict) or catalog.get("schema_version") != SCHEMA_VERSION:
        return None
    if not isinstance(catalog.get("problems"), list):
        return None
    return catalog


def merge_existing_details(problems: list[dict], existing: dict | None) -> int:
    """Copy prior detail state into freshly scraped summaries by native ID."""
    if not existing:
        return 0
    previous = {
        str(item.get("native_id", item.get("pid", ""))): item
        for item in existing.get("problems", [])
        if isinstance(item, dict)
    }
    resumed = 0
    for problem in problems:
        old = previous.get(str(problem.get("native_id", problem.get("pid", ""))))
        if not old:
            continue
        detail = _record_detail(old)
        if detail:
            problem["detail"] = detail
        status = old.get("detail_status") or _detail_status(detail)
        if status in {"complete", "partial", "failed"}:
            problem["detail_status"] = status
        if old.get("detail_fetched_at"):
            problem["detail_fetched_at"] = old["detail_fetched_at"]
        resumed += 1
    return resumed


def atomic_write_catalog(path: Path, catalog: dict) -> None:
    """Write a complete JSON checkpoint and atomically replace the destination."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_name(f"{path.name}.tmp")
    try:
        with temp_path.open("w", encoding="utf-8") as handle:
            json.dump(catalog, handle, ensure_ascii=False, indent=2)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_path, path)
    finally:
        if temp_path.exists():
            temp_path.unlink()


def enrich_catalog_details(
    catalog: dict,
    client: httpx.Client,
    *,
    refresh: bool = False,
    rate_seconds: float = 1.0,
    checkpoint_every: int = 25,
    retries: int = 1,
    output_path: Path | None = None,
    sleeper: Callable[[float], None] = time.sleep,
    clock: Callable[[], float] = time.monotonic,
    timestamp: Callable[[], str] | None = None,
) -> dict[str, int]:
    """Resume detail enrichment with throttling, conservative retry, and checkpoints."""
    timestamp = timestamp or (lambda: datetime.now(timezone.utc).isoformat())
    counts = {
        "total": len(catalog.get("problems", [])),
        "skipped": 0,
        "attempted": 0,
        "complete": 0,
        "partial": 0,
        "failed": 0,
        "retained": 0,
        "checkpoints": 0,
    }
    last_request_at: float | None = None

    for problem in catalog.get("problems", []):
        previous_detail = _record_detail(problem)
        previous_status = problem.get("detail_status") or _detail_status(previous_detail)
        if previous_detail:
            problem["detail"] = previous_detail
        if previous_status == "complete" and not refresh:
            problem["detail_status"] = "complete"
            counts["skipped"] += 1
            continue

        counts["attempted"] += 1
        fetched_detail = None
        last_error = None
        for attempt in range(max(0, retries) + 1):
            if last_request_at is not None and rate_seconds > 0:
                sleeper(max(0.0, rate_seconds - (clock() - last_request_at)))
            try:
                fetched_detail = scrape_problem_detail(client, str(problem["pid"]))
                last_request_at = clock()
                break
            except Exception as exc:  # Detail failures must not abort the catalog.
                last_request_at = clock()
                last_error = str(exc)[:200]
                if attempt < max(0, retries):
                    sleeper(min(5.0, max(rate_seconds, 0.25) * (2 ** attempt)))

        fetched_at = timestamp()
        status = _detail_status(fetched_detail)
        if status in {"complete", "partial"}:
            problem["detail"] = fetched_detail
            problem["detail_status"] = status
            problem["detail_fetched_at"] = fetched_at
            problem.pop("detail_error", None)
            counts[status] += 1
        else:
            counts["failed"] += 1
            if previous_detail:
                problem["detail"] = previous_detail
                problem["detail_status"] = previous_status if previous_status in {"complete", "partial"} else _detail_status(previous_detail)
                counts["retained"] += 1
            else:
                problem["detail_status"] = "failed"
                problem["detail_fetched_at"] = fetched_at
            if last_error:
                problem["detail_error"] = last_error

        if output_path and checkpoint_every > 0 and counts["attempted"] % checkpoint_every == 0:
            atomic_write_catalog(output_path, catalog)
            counts["checkpoints"] += 1

    final_statuses = {"complete": 0, "partial": 0, "failed": 0}
    for problem in catalog.get("problems", []):
        status = problem.get("detail_status")
        if status in final_statuses:
            final_statuses[status] += 1
    counts.update({f"catalog_{key}": value for key, value in final_statuses.items()})
    return counts


def _merge_problem_memberships(problems: list[dict]) -> list[dict]:
    """Deduplicate summaries by native ID while preserving every skill membership."""
    merged: dict[str, dict] = {}
    for problem in problems:
        pid = str(problem.get("native_id", problem.get("pid", "")))
        if not pid:
            continue
        tag_id = str(problem.get("skill_tag_id", ""))
        skill_name = str(problem.get("skill_name", ""))
        current = merged.get(pid)
        if current is None:
            current = dict(problem)
            current["skill_tag_ids"] = []
            current["skill_names"] = []
            merged[pid] = current
        if tag_id and tag_id not in current["skill_tag_ids"]:
            current["skill_tag_ids"].append(tag_id)
        if skill_name and skill_name not in current["skill_names"]:
            current["skill_names"].append(skill_name)
        current["tags"] = list(dict.fromkeys([
            *(current.get("tags") or []), *(problem.get("tags") or []),
        ]))
    return list(merged.values())


def validate_catalog_candidate(
    skills: list[dict],
    problems: list[dict],
    existing: dict | None,
    required_failures: list[str],
) -> None:
    """Prevent an incomplete crawl from replacing the last known-good catalog."""
    if required_failures:
        raise CatalogValidationError(
            "required skill categories failed: " + "; ".join(required_failures[:10])
        )
    if not skills or not problems:
        raise CatalogValidationError("catastrophic crawl: catalog contains no skills or problems")
    previous_count = len(existing.get("problems", [])) if existing else 0
    minimum = int(previous_count * MIN_CATALOG_RETENTION_RATIO)
    if previous_count and len(problems) < minimum:
        raise CatalogValidationError(
            f"catalog coverage dropped from {previous_count} to {len(problems)} "
            f"(< {MIN_CATALOG_RETENTION_RATIO:.0%})"
        )


def _catalog_output(skills: list[dict], problems: list[dict]) -> dict:
    return {
        "schema_version": SCHEMA_VERSION,
        "source": SKILL_LIST_URL,
        "total_skills": len(skills),
        "total_problems": len(problems),
        "skills": [
            {key: skill[key] for key in ("tag_id", "name", "problem_count", "practice_count")}
            for skill in skills
        ],
        "problems": problems,
    }


def main(
    include_details: bool = False,
    refresh_details: bool = False,
    detail_rate_seconds: float = 1.0,
    checkpoint_every: int = 25,
    detail_retries: int = 1,
    output_path: Path = OUTPUT_PATH,
):
    """Rebuild the catalog; bulk detail requests are strictly opt-in."""
    print("=" * 50)
    print("牛客网 ACM 技能页 爬虫")
    print("=" * 50)

    existing = load_existing_catalog(output_path)
    client = create_client()
    try:
        skills = scrape_skills(client)
        all_problems = []
        required_failures = []
        print("\n[Step 2] 逐技能爬取题目...")
        for index, skill in enumerate(skills):
            tag_id = skill["tag_id"]
            name = skill["name"]
            expected = skill["problem_count"]
            print(f"  [{index + 1:>3}/{len(skills)}] {name[:30]:30s} tag={tag_id} expect={expected:>4} ", end="", flush=True)
            try:
                problems = scrape_problems_by_tag(client, tag_id)
                for problem in problems:
                    problem["skill_name"] = name
                    problem["skill_tag_id"] = tag_id
                all_problems.extend(problems)
                if expected > 0 and not problems:
                    required_failures.append(f"{name} ({tag_id}): expected {expected}, got 0")
                print(f"-> got {len(problems):>4}")
            except Exception as exc:
                required_failures.append(f"{name} ({tag_id}): {str(exc)[:160]}")
                print(f"-> ERROR: {exc}")
            if (index + 1) % 20 == 0:
                time.sleep(1)

        unique = _merge_problem_memberships(all_problems)
        validate_catalog_candidate(skills, unique, existing, required_failures)

        resumed = merge_existing_details(unique, existing)
        output = _catalog_output(skills, unique)
        detail_counts = None
        if include_details or refresh_details:
            print(f"\n[Step 3] 补充题目详情（恢复 {resumed} 条已有记录）...")
            detail_counts = enrich_catalog_details(
                output,
                client,
                refresh=refresh_details,
                rate_seconds=max(0.0, detail_rate_seconds),
                checkpoint_every=max(0, checkpoint_every),
                retries=max(0, detail_retries),
                output_path=output_path,
            )
        atomic_write_catalog(output_path, output)
    finally:
        client.close()

    print(f"\n{'=' * 50}")
    print("完成!")
    print(f"  技能: {len(skills)}")
    print(f"  题目(去重前): {len(all_problems)}")
    print(f"  题目(去重后): {len(unique)}")
    if detail_counts:
        print(
            "  详情: "
            f"attempted={detail_counts['attempted']} skipped={detail_counts['skipped']} "
            f"complete={detail_counts['complete']} partial={detail_counts['partial']} "
            f"failed={detail_counts['failed']} retained={detail_counts['retained']} "
            f"checkpoints={detail_counts['checkpoints']} "
            f"catalog_complete={detail_counts['catalog_complete']} "
            f"catalog_partial={detail_counts['catalog_partial']} "
            f"catalog_failed={detail_counts['catalog_failed']}"
        )
    print(f"  已保存: {output_path} ({len(json.dumps(output, ensure_ascii=False)):,} bytes)")
    return unique


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Build the schema-v2 Nowcoder problem catalog")
    parser.add_argument("--include-details", action="store_true", help="opt in to bulk detail enrichment")
    parser.add_argument("--refresh-details", action="store_true", help="refetch details, including complete records")
    parser.add_argument("--detail-rate-seconds", type=float, default=1.0, help="minimum delay between detail requests")
    parser.add_argument("--checkpoint-every", type=int, default=25, help="atomically checkpoint after this many detail records; 0 disables periodic checkpoints")
    parser.add_argument("--detail-retries", type=int, default=1, help="retries per failed detail request")
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH, help="catalog output path")
    return parser


def cli(argv: list[str] | None = None):
    args = build_arg_parser().parse_args(argv)
    return main(
        include_details=args.include_details,
        refresh_details=args.refresh_details,
        detail_rate_seconds=args.detail_rate_seconds,
        checkpoint_every=args.checkpoint_every,
        detail_retries=args.detail_retries,
        output_path=args.output,
    )


if __name__ == "__main__":
    cli()
