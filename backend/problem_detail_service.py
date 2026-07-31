"""Structured local-first problem detail lookup for supported platforms."""
from __future__ import annotations

import asyncio
from copy import deepcopy
from typing import Awaitable, Callable

from sqlalchemy.exc import IntegrityError

from database import SessionLocal
from models import ProblemDetailCache
from problem_catalog import find_catalog_problem, normalize_samples
from problem_identity import ProblemIdentity, resolve_problem_identity
from problem_media_service import register_problem_media
from nowcoder_http import has_nowcoder_cookie


DetailFetcher = Callable[[str], Awaitable[dict]]
SessionFactory = Callable[[], object]

# Concurrent misses for one canonical problem share the same lookup/fetch/persist task.
_inflight: dict[str, asyncio.Task[tuple[dict, bool]]] = {}
_inflight_lock: asyncio.Lock | None = None
_inflight_loop = None


def has_meaningful_detail(detail: dict) -> bool:
    """Return whether a detail payload contains reusable statement content."""
    return any(
        detail.get(key) not in (None, "", [])
        for key in (
            "description", "input_description", "output_description",
            "notes", "constraints", "samples", "hints",
        )
    )


def normalize_problem_detail(
    detail: dict | None,
    identity: ProblemIdentity,
    source: str,
) -> dict:
    """Purely return the stable detail API schema regardless of the source."""
    raw = detail if isinstance(detail, dict) else {}
    samples = normalize_samples(raw.get("samples"))

    hints = raw.get("hints", [])
    if not isinstance(hints, list):
        hints = []
    result = {
        "id": str(raw.get("id", "") or identity.canonical_id),
        "pid": identity.native_id,
        "native_id": identity.native_id,
        "platform": identity.platform,
        "title": str(raw.get("title", "") or ""),
        "description": str(raw.get("description", "") or ""),
        "input_description": str(raw.get("input_description", "") or ""),
        "output_description": str(raw.get("output_description", "") or ""),
        "notes": str(raw.get("notes", "") or ""),
        "constraints": str(raw.get("constraints", "") or ""),
        "difficulty": str(raw.get("difficulty", "") or ""),
        "tags": list(dict.fromkeys(str(tag).strip() for tag in raw.get("tags", []) if str(tag).strip())) if isinstance(raw.get("tags"), list) else [],
        "samples": samples,
        "hints": [str(hint) for hint in hints if str(hint).strip()],
        "url": str(raw.get("url", "") or identity.canonical_url),
        "source": source,
        "schema_version": int(raw.get("schema_version", 1) or 1),
    }
    if isinstance(raw.get("media"), list):
        # Source candidates are consumed and replaced by safe public descriptors below.
        result["media"] = deepcopy(raw["media"])
    for key in ("detail_status", "detail_fetched_at", "warning"):
        if raw.get(key):
            result[key] = str(raw[key])
    for key in ("time_limit", "space_limit", "accepted", "submitted", "ac_rate"):
        if raw.get(key) is not None:
            result[key] = raw[key]
    if raw.get("error"):
        result["error"] = str(raw["error"])
    return result


def get_local_problem_detail(identity: ProblemIdentity) -> dict | None:
    """Resolve locally bundled details before any live network request."""
    item = find_catalog_problem(identity.platform, identity.native_id)
    if not item:
        return None
    detail = normalize_problem_detail(item, identity, "catalog")
    # Failed/summary-only records may still fall back to a live fetcher.
    if detail.get("detail_status") != "failed" and has_meaningful_detail(detail):
        return detail
    return None


def _read_durable_detail(identity: ProblemIdentity, session_factory: SessionFactory) -> dict | None:
    """Read and detach a cached detail while keeping session lifetime synchronous."""
    session = session_factory()
    try:
        row = session.query(ProblemDetailCache).filter_by(canonical_id=identity.canonical_id).first()
        if row is None or not isinstance(row.detail, dict):
            return None
        detail = normalize_problem_detail(row.detail, identity, "database")
        return detail if has_meaningful_detail(detail) and not detail.get("error") else None
    finally:
        session.close()


def _persist_durable_detail(
    identity: ProblemIdentity,
    detail: dict,
    session_factory: SessionFactory,
) -> dict:
    """Insert a successful result, returning the canonical winner on a race."""
    session = session_factory()
    try:
        # Successful live ingestion deliberately rewrites/registers media and stores
        # detail plus manifests in one transaction. Read and fallback paths stay pure.
        persisted_detail = register_problem_media(detail, identity, session=session)
        schema_version = int(persisted_detail.get("schema_version", 1) or 1)
        session.add(ProblemDetailCache(
            canonical_id=identity.canonical_id,
            platform=identity.platform,
            native_id=identity.native_id,
            canonical_url=identity.canonical_url,
            detail=deepcopy(persisted_detail),
            schema_version=schema_version,
            source=str(persisted_detail.get("source", "live")),
        ))
        try:
            session.commit()
            return persisted_detail
        except IntegrityError:
            # Another process may have inserted this canonical key after our lookup.
            session.rollback()
            winner = session.query(ProblemDetailCache).filter_by(canonical_id=identity.canonical_id).first()
            if winner is None or not isinstance(winner.detail, dict):
                raise
            return normalize_problem_detail(winner.detail, identity, "database")
    finally:
        session.close()


def _release_inflight(key: str, completed: asyncio.Task) -> None:
    """Release a completed flight even when every waiter was cancelled."""
    if _inflight.get(key) is completed:
        _inflight.pop(key, None)


def _singleflight_lock() -> asyncio.Lock:
    """Return a lock bound to the active loop (safe across isolated test loops)."""
    global _inflight_lock, _inflight_loop
    loop = asyncio.get_running_loop()
    if _inflight_lock is None or _inflight_loop is not loop:
        _inflight.clear()
        _inflight_lock = asyncio.Lock()
        _inflight_loop = loop
    return _inflight_lock


async def _resolve_problem_detail(
    identity: ProblemIdentity,
    fetchers: dict[str, DetailFetcher],
    session_factory: SessionFactory,
) -> tuple[dict, bool]:
    # Durable on-demand results take precedence over bundled catalog snapshots.
    # Each synchronous cache unit is offloaded and closes before any network await.
    durable = await asyncio.to_thread(_read_durable_detail, identity, session_factory)
    if durable:
        return durable, True

    local = await asyncio.to_thread(get_local_problem_detail, identity)
    if local:
        return local, True

    fetcher = fetchers.get(identity.platform)
    if not fetcher:
        return normalize_problem_detail(
            {"error": "不支持的平台"}, identity, "unavailable",
        ), False

    # Nowcoder is known to require authentication; avoid a guaranteed WAF request.
    if identity.platform == "nowcoder" and not has_nowcoder_cookie():
        live = {"error": "未配置 NOWCODER_COOKIE，已跳过牛客实时请求；本地题库仍可使用"}
    else:
        try:
            live = await fetcher(identity.native_id)
        except Exception as exc:
            live = {"error": f"获取失败: {str(exc)[:200]}"}

    detail = normalize_problem_detail(live, identity, "live")
    if detail.get("error"):
        summary = find_catalog_problem(identity.platform, identity.native_id)
        if summary:
            fallback = normalize_problem_detail(summary, identity, "catalog_summary")
            fallback["description"] = "本地题库尚未缓存完整题面。实时访问可选配置 NOWCODER_COOKIE，或点击下方原题链接查看。"
            fallback["warning"] = detail["error"]
            return fallback, False
        return detail, False

    if not has_meaningful_detail(detail):
        return detail, False
    if identity.platform == "nowcoder" and detail.get("detail_status") == "partial":
        # Keep partial statements visible, but retry later instead of freezing an
        # incomplete parser result in the durable cache.
        return detail, False

    # Persistence is success-only. No session existed while the fetch was awaited.
    persisted = await asyncio.to_thread(
        _persist_durable_detail, identity, detail, session_factory,
    )
    return persisted, True


async def get_problem_detail(
    platform: str,
    pid: str = "",
    url: str = "",
    fetchers: dict[str, DetailFetcher] | None = None,
    session_factory: SessionFactory | None = None,
) -> tuple[dict, bool]:
    """Return ``(detail, cacheable)`` using local, durable, then live sources."""
    identity = resolve_problem_identity(platform, pid, url)
    factory = session_factory or SessionLocal
    lock = _singleflight_lock()

    async with lock:
        task = _inflight.get(identity.canonical_id)
        if task is None:
            task = asyncio.create_task(_resolve_problem_detail(identity, fetchers or {}, factory))
            _inflight[identity.canonical_id] = task
            task.add_done_callback(
                lambda completed, key=identity.canonical_id: _release_inflight(key, completed)
            )

    detail, cacheable = await asyncio.shield(task)
    return deepcopy(detail), cacheable
