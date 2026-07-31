"""Read-only access to bundled problem catalogs."""
from __future__ import annotations

import json
from copy import deepcopy
from functools import lru_cache
from pathlib import Path

from problem_identity import normalize_resource_identity, resolve_problem_identity


_CATALOG_PATH = Path(__file__).with_name("nowcoder_skills_result.json")
CATALOG_SCHEMA_VERSION = 2
MAX_PUBLIC_SAMPLES = 20
MAX_PUBLIC_SAMPLE_BYTES = 256 * 1024


def _as_nonnegative_int(value) -> int:
    try:
        return max(0, int(value or 0))
    except (TypeError, ValueError):
        return 0


def _normalize_sample_text(value) -> str:
    """Normalize transport newlines without changing meaningful sample whitespace."""
    return str(value or "").replace("\r\n", "\n").replace("\r", "\n")


def normalize_samples(value) -> list[dict]:
    """Return bounded, stable, de-duplicated public statement samples."""
    samples = []
    seen: set[tuple[str, str]] = set()
    total_bytes = 0
    if not isinstance(value, list):
        return samples
    for sample in value:
        if not isinstance(sample, dict):
            continue
        sample_input = _normalize_sample_text(sample.get("input", sample.get("stdin", "")))
        sample_output = _normalize_sample_text(sample.get("output", sample.get("expected", "")))
        if not sample_input and not sample_output:
            continue
        key = (sample_input, sample_output)
        if key in seen:
            continue
        sample_bytes = len(sample_input.encode("utf-8")) + len(sample_output.encode("utf-8"))
        if total_bytes + sample_bytes > MAX_PUBLIC_SAMPLE_BYTES:
            continue
        seen.add(key)
        total_bytes += sample_bytes
        samples.append({"input": sample_input, "output": sample_output})
        if len(samples) >= MAX_PUBLIC_SAMPLES:
            break
    return samples


@lru_cache(maxsize=1)
def load_nowcoder_catalog() -> dict:
    """Load schema-v2 catalogs while migrating the legacy list shape in memory."""
    empty = {
        "schema_version": CATALOG_SCHEMA_VERSION,
        "source": "",
        "skills": [],
        "problems": [],
        "problems_by_id": {},
        "problems_by_native_id": {},
    }
    try:
        with _CATALOG_PATH.open("r", encoding="utf-8") as handle:
            raw = json.load(handle)
    except (OSError, json.JSONDecodeError, TypeError):
        return empty
    if not isinstance(raw, dict):
        return empty

    skills = []
    skill_names: dict[str, str] = {}
    raw_skills = raw.get("skills")
    for skill in raw_skills if isinstance(raw_skills, list) else []:
        if not isinstance(skill, dict):
            continue
        tag_id = str(skill.get("tag_id", "")).strip()
        name = str(skill.get("name", "")).strip()
        if tag_id and name:
            skill_names[tag_id] = name
            skills.append({
                "tag_id": tag_id,
                "name": name,
                "problem_count": _as_nonnegative_int(skill.get("problem_count")),
                "practice_count": _as_nonnegative_int(skill.get("practice_count")),
            })

    seen: set[str] = set()
    problems = []
    raw_problems = raw.get("problems")
    for item in raw_problems if isinstance(raw_problems, list) else []:
        if not isinstance(item, dict):
            continue
        try:
            normalized = normalize_resource_identity(item, "nowcoder")
        except ValueError:
            continue
        canonical_id = normalized["canonical_id"]
        if canonical_id in seen:
            continue
        seen.add(canonical_id)
        tag_id = str(item.get("skill_tag_id", item.get("tag_id", "")) or "")
        raw_tag_ids = item.get("skill_tag_ids")
        skill_tag_ids = list(dict.fromkeys(
            str(value).strip() for value in raw_tag_ids
            if str(value).strip()
        )) if isinstance(raw_tag_ids, list) else []
        if tag_id and tag_id not in skill_tag_ids:
            skill_tag_ids.insert(0, tag_id)
        tags = list(dict.fromkeys(
            str(tag).strip() for tag in item.get("tags", [])
            if str(tag).strip()
        )) if isinstance(item.get("tags"), list) else []
        raw_skill_names = item.get("skill_names")
        membership_names = list(dict.fromkeys(
            str(value).strip() for value in raw_skill_names
            if str(value).strip()
        )) if isinstance(raw_skill_names, list) else []
        skill_name = str(item.get("skill_name", "") or skill_names.get(tag_id, ""))
        if skill_name and skill_name not in membership_names:
            membership_names.insert(0, skill_name)
        for membership_name in reversed(membership_names):
            if membership_name and membership_name not in tags:
                tags.insert(0, membership_name)
        detail = item.get("detail") if isinstance(item.get("detail"), dict) else item
        normalized.update({
            "pid": normalized["native_id"],
            "nc_id": str(item.get("nc_id", "") or ""),
            "title": str(detail.get("title", item.get("title", "")) or ""),
            "difficulty": str(item.get("difficulty", "") or ""),
            "tags": tags,
            "skill_tag_id": tag_id,
            "skill_tag_ids": skill_tag_ids,
            "skill_name": skill_name,
            "skill_names": membership_names,
            "pass_count": _as_nonnegative_int(item.get("pass_count", detail.get("accepted"))),
            "description": str(detail.get("description", "") or ""),
            "input_description": str(detail.get("input_description", "") or ""),
            "output_description": str(detail.get("output_description", "") or ""),
            "notes": str(detail.get("notes", "") or ""),
            "constraints": str(detail.get("constraints", "") or ""),
            "samples": normalize_samples(detail.get("samples")),
            "hints": [str(hint) for hint in detail.get("hints", []) if str(hint).strip()] if isinstance(detail.get("hints"), list) else [],
            "media": deepcopy(detail.get("media", [])) if isinstance(detail.get("media"), list) else [],
            "detail_status": str(item.get("detail_status", "") or ""),
            "detail_fetched_at": str(item.get("detail_fetched_at", "") or ""),
        })
        for key in ("time_limit", "space_limit", "accepted", "submitted", "ac_rate"):
            if detail.get(key) is not None:
                normalized[key] = detail[key]
        problems.append(normalized)

    return {
        "schema_version": CATALOG_SCHEMA_VERSION,
        "source": str(raw.get("source", "") or ""),
        "skills": skills,
        "problems": problems,
        "problems_by_id": {item["id"]: item for item in problems},
        "problems_by_native_id": {item["native_id"]: item for item in problems},
    }


def get_nowcoder_categories() -> list[dict]:
    return deepcopy(load_nowcoder_catalog()["skills"])


def search_nowcoder_catalog(
    keyword: str = "",
    tag_id: str = "",
    page: int = 1,
    limit: int = 20,
) -> tuple[list[dict], int]:
    """Search the generated catalog with stable tag identity and pagination."""
    query = keyword.strip().lower()
    category_id = tag_id.strip()
    filtered = []
    for item in load_nowcoder_catalog()["problems"]:
        memberships = item.get("skill_tag_ids") or [item.get("skill_tag_id", "")]
        if category_id and category_id not in memberships:
            continue
        if query:
            searchable = [item.get("title", ""), item.get("nc_id", ""), *item.get("tags", [])]
            if not any(query in str(value).lower() for value in searchable):
                continue
        filtered.append(item)

    total = len(filtered)
    start = max(page - 1, 0) * limit
    return deepcopy(filtered[start:start + limit]), total


def find_catalog_problem(platform: str, value: str = "", url: str = "") -> dict | None:
    """Find a generated-catalog problem by canonical, native, legacy, or URL identity."""
    if platform != "nowcoder":
        return None
    try:
        identity = resolve_problem_identity(platform, value, url)
    except ValueError:
        return None
    catalog = load_nowcoder_catalog()
    item = catalog["problems_by_native_id"].get(identity.native_id)
    return deepcopy(item) if item else None
