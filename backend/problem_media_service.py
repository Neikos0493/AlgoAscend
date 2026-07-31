"""Secure, on-demand problem image registration, caching, and serving."""
from __future__ import annotations

import asyncio
import hashlib
import io
import ipaddress
import re
import socket
from contextlib import asynccontextmanager
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from typing import Callable
from urllib.parse import urljoin, urlsplit, urlunsplit

import httpx
from bs4 import BeautifulSoup
from fastapi import HTTPException, Response
from PIL import Image, UnidentifiedImageError
from sqlalchemy.exc import IntegrityError

from database import SessionLocal
from models import ProblemMediaCache
from problem_identity import ProblemIdentity


MAX_MEDIA_BYTES = 5 * 1024 * 1024
MAX_IMAGE_PIXELS = 25_000_000
DOWNLOAD_CONCURRENCY = 4
FAILURE_COOLDOWN_SECONDS = 60
MEDIA_PATH_PREFIX = "/api/code/problem-media/"
MEDIA_KEY_RE = re.compile(r"^[0-9a-f]{64}$")
MARKDOWN_IMAGE_RE = re.compile(r"!\[([^\]\r\n]*)\]\((?:<([^>\r\n]+)>|([^\s)]+))(?:\s+[\"'][^\r\n]*[\"'])?\)")
STRUCTURED_TEXT_FIELDS = (
    "description", "input_description", "output_description", "notes", "constraints",
)

# Deliberately exact hostnames. Subdomain/suffix matching is not used.
PLATFORM_MEDIA_HOSTS: dict[str, frozenset[str]] = {
    "luogu": frozenset({
        "www.luogu.com.cn", "cdn.luogu.com.cn", "fecdn.luogu.com.cn",
        "img.luogu.com.cn",
    }),
    "leetcode": frozenset({
        "leetcode.cn", "assets.leetcode-cn.com", "pic.leetcode-cn.com",
        "static.leetcode-cn.com",
    }),
    "nowcoder": frozenset({
        "ac.nowcoder.com", "static.nowcoder.com", "uploadfiles.nowcoder.com",
        "image.nowcoder.com",
    }),
}
ALLOWED_CONTENT_TYPES = {
    "image/png": "PNG",
    "image/jpeg": "JPEG",
    "image/webp": "WEBP",
}
FORMAT_CONTENT_TYPES = {value: key for key, value in ALLOWED_CONTENT_TYPES.items()}

SessionFactory = Callable[[], object]

# Entries carry a user count so a completed holder cannot remove a lock that still
# has waiters. The final user removes the entry.
_locks: dict[str, tuple[asyncio.Lock, int]] = {}
_locks_guard: asyncio.Lock | None = None
_locks_loop = None
_download_semaphore: asyncio.Semaphore | None = None


def _normalized_source_url(source_url: str, base_url: str, platform: str) -> str:
    """Resolve and validate a manifest URL without performing DNS or I/O."""
    absolute = urljoin(base_url, str(source_url or "").strip())
    parsed = urlsplit(absolute)
    host = (parsed.hostname or "").lower().rstrip(".")
    try:
        port = parsed.port
    except ValueError as exc:
        raise ValueError("invalid media port") from exc
    if parsed.scheme.lower() != "https":
        raise ValueError("problem media requires HTTPS")
    if parsed.username is not None or parsed.password is not None:
        raise ValueError("problem media URL must not contain userinfo")
    if port not in (None, 443):
        raise ValueError("problem media requires port 443")
    if host not in PLATFORM_MEDIA_HOSTS.get(platform, frozenset()):
        raise ValueError("problem media host is not allowed")
    if not parsed.path.startswith("/"):
        raise ValueError("invalid media path")
    # Fragments are local document state and must never influence cache identity.
    return urlunsplit(("https", host, parsed.path, parsed.query, ""))


def _media_key(canonical_id: str, source_url: str) -> str:
    return hashlib.sha256(f"{canonical_id}\0{source_url}".encode("utf-8")).hexdigest()


def _reference(key: str, field: str, ordinal: int, alt: str) -> dict:
    return {
        "key": key,
        "url": f"{MEDIA_PATH_PREFIX}{key}",
        "alt": alt[:500],
        "field": field,
        "ordinal": ordinal,
    }


def _register_source(
    raw_url: str,
    identity: ProblemIdentity,
    field: str,
    ordinal: int,
    alt: str,
    registrations: dict[str, dict],
) -> dict | None:
    """Validate one HTML/Markdown/structured source and collect its references."""
    try:
        source_url = _normalized_source_url(raw_url, identity.canonical_url, identity.platform)
    except ValueError:
        return None
    key = _media_key(identity.canonical_id, source_url)
    reference = _reference(key, field, ordinal, alt)
    registration = registrations.setdefault(key, {"source_url": source_url, "references": []})
    marker = (reference["field"], reference["ordinal"], reference["alt"])
    if not any(
        (item["field"], item["ordinal"], item["alt"]) == marker
        for item in registration["references"]
    ):
        registration["references"].append(reference)
    return reference


def _upsert_manifests(
    session,
    identity: ProblemIdentity,
    registrations: dict[str, dict],
) -> None:
    """Upsert all collected references in one caller-owned transaction."""
    if not registrations:
        return
    rows = session.query(ProblemMediaCache).filter(
        ProblemMediaCache.media_key.in_(registrations),
    ).all()
    rows_by_key = {row.media_key: row for row in rows}
    for key, registration in registrations.items():
        row = rows_by_key.get(key)
        if row is None:
            session.add(ProblemMediaCache(
                media_key=key,
                canonical_id=identity.canonical_id,
                source_url=registration["source_url"],
                manifest={"status": "registered", "references": registration["references"]},
            ))
            continue
        manifest = dict(row.manifest or {})
        references = list(manifest.get("references") or [])
        markers = {
            (item.get("field"), item.get("ordinal"), item.get("alt"))
            for item in references if isinstance(item, dict)
        }
        for reference in registration["references"]:
            marker = (reference["field"], reference["ordinal"], reference["alt"])
            if marker not in markers:
                references.append(reference)
                markers.add(marker)
        manifest["references"] = references
        manifest.setdefault("status", "ready" if row.content else "registered")
        row.manifest = manifest


def _rewrite_html_images(
    value: str,
    identity: ProblemIdentity,
    field: str,
    start_ordinal: int,
    registrations: dict[str, dict],
) -> tuple[str, list[dict], int]:
    if "<img" not in value.lower():
        return value, [], start_ordinal
    soup = BeautifulSoup(value, "html.parser")
    found = []
    ordinal = start_ordinal
    for image in soup.find_all("img"):
        raw_url = str(image.get("src") or image.get("data-src") or "").strip()
        if not raw_url:
            image.decompose()
            continue
        internal_match = re.fullmatch(re.escape(MEDIA_PATH_PREFIX) + r"([0-9a-f]{64})", raw_url)
        alt = str(image.get("alt") or "").strip()
        if internal_match:
            reference = _reference(internal_match.group(1), field, ordinal, alt)
        else:
            reference = _register_source(
                raw_url, identity, field, ordinal, alt, registrations,
            )
            if reference is None:
                image.decompose()
                continue
        image.attrs = {
            "src": reference["url"], "alt": reference["alt"],
            "loading": "lazy", "decoding": "async",
        }
        found.append(reference)
        ordinal += 1
    return str(soup), found, ordinal


def _rewrite_markdown_images(
    value: str,
    identity: ProblemIdentity,
    field: str,
    start_ordinal: int,
    registrations: dict[str, dict],
) -> tuple[str, list[dict], int]:
    found = []
    ordinal = start_ordinal

    def replace(match: re.Match) -> str:
        nonlocal ordinal
        raw_url = match.group(2) or match.group(3) or ""
        alt = match.group(1).strip()
        internal_match = re.fullmatch(re.escape(MEDIA_PATH_PREFIX) + r"([0-9a-f]{64})", raw_url)
        if internal_match:
            reference = _reference(internal_match.group(1), field, ordinal, alt)
        else:
            reference = _register_source(
                raw_url, identity, field, ordinal, alt, registrations,
            )
            if reference is None:
                return ""
        found.append(reference)
        ordinal += 1
        return f"![{reference['alt']}]({reference['url']})"

    return MARKDOWN_IMAGE_RE.sub(replace, value), found, ordinal


def prepare_problem_media(detail: dict, identity: ProblemIdentity) -> tuple[dict, dict[str, dict]]:
    """Purely rewrite media references and return pending durable registrations."""
    result = deepcopy(detail)
    registrations: dict[str, dict] = {}
    public_manifest = []
    ordinal = 0

    def rewrite(value: str, field: str) -> str:
        nonlocal ordinal
        rewritten, html_found, ordinal = _rewrite_html_images(
            value, identity, field, ordinal, registrations,
        )
        rewritten, markdown_found, ordinal = _rewrite_markdown_images(
            rewritten, identity, field, ordinal, registrations,
        )
        public_manifest.extend(html_found)
        public_manifest.extend(markdown_found)
        return rewritten

    for field in STRUCTURED_TEXT_FIELDS:
        value = result.get(field)
        if isinstance(value, str) and value:
            result[field] = rewrite(value, field)
    hints = result.get("hints")
    if isinstance(hints, list):
        result["hints"] = [
            rewrite(value, f"hints.{index}") if isinstance(value, str) else value
            for index, value in enumerate(hints)
        ]

    raw_media = result.get("media")
    if isinstance(raw_media, list):
        for item in raw_media:
            if not isinstance(item, dict):
                continue
            raw_url = str(item.get("source_url") or item.get("src") or "").strip()
            existing_key = str(item.get("key") or "")
            field = str(item.get("field") or "description")[:100]
            alt = str(item.get("alt") or "").strip()
            item_ordinal = int(item.get("ordinal") if item.get("ordinal") is not None else ordinal)
            if not raw_url and MEDIA_KEY_RE.fullmatch(existing_key):
                public_manifest.append(_reference(existing_key, field, item_ordinal, alt))
                ordinal += 1
                continue
            if not raw_url:
                continue
            reference = _register_source(
                raw_url, identity, field, item_ordinal, alt, registrations,
            )
            if reference is not None:
                public_manifest.append(reference)
                ordinal += 1

    deduped = []
    seen = set()
    for item in public_manifest:
        if item["key"] not in seen:
            seen.add(item["key"])
            deduped.append(item)
    if deduped:
        result["media"] = deduped
    elif "media" in result:
        result["media"] = [
            item for item in result["media"]
            if isinstance(item, dict) and MEDIA_KEY_RE.fullmatch(str(item.get("key", "")))
        ]
    return result, registrations


def register_problem_media(
    detail: dict,
    identity: ProblemIdentity,
    session_factory: SessionFactory | None = None,
    *,
    session=None,
) -> dict:
    """Rewrite and batch-register media, optionally in a caller-owned transaction."""
    result, registrations = prepare_problem_media(detail, identity)
    if session is not None:
        _upsert_manifests(session, identity, registrations)
        return result

    factory = session_factory or SessionLocal
    owned_session = factory()
    try:
        _upsert_manifests(owned_session, identity, registrations)
        owned_session.commit()
        return result
    except IntegrityError:
        owned_session.rollback()
        # A concurrent registration may have won. Re-read and merge once in a new
        # transaction so all references remain represented.
        _upsert_manifests(owned_session, identity, registrations)
        owned_session.commit()
        return result
    finally:
        owned_session.close()


def _resolve_public_addresses(host: str) -> tuple[str, ...]:
    try:
        records = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    except OSError as exc:
        raise ValueError("problem media DNS lookup failed") from exc
    addresses = tuple(dict.fromkeys(record[4][0] for record in records))
    if not addresses:
        raise ValueError("problem media DNS returned no addresses")
    for raw in addresses:
        address = ipaddress.ip_address(raw.split("%", 1)[0])
        if not address.is_global:
            raise ValueError("problem media DNS resolved to a private or reserved address")
    return addresses


def _validate_and_strip_image(raw: bytes, upstream_type: str) -> tuple[bytes, str, int, int]:
    declared = upstream_type.split(";", 1)[0].strip().lower()
    if declared not in ALLOWED_CONTENT_TYPES:
        raise ValueError("unsupported problem media content type")
    if len(raw) > MAX_MEDIA_BYTES:
        raise ValueError("problem media exceeds 5 MiB")

    try:
        with Image.open(io.BytesIO(raw)) as image:
            width, height = image.size
            if width <= 0 or height <= 0 or width * height > MAX_IMAGE_PIXELS:
                raise ValueError("problem media dimensions are not allowed")
            image.verify()
        with Image.open(io.BytesIO(raw)) as image:
            width, height = image.size
            if width <= 0 or height <= 0 or width * height > MAX_IMAGE_PIXELS:
                raise ValueError("problem media dimensions are not allowed")
            image.load()
            image_format = str(image.format or "").upper()
            if image_format not in FORMAT_CONTENT_TYPES:
                raise ValueError("unsupported problem media format")
            if ALLOWED_CONTENT_TYPES[declared] != image_format:
                raise ValueError("problem media type does not match decoded format")
            if getattr(image, "n_frames", 1) != 1 or getattr(image, "is_animated", False):
                raise ValueError("animated problem media is not allowed")

            if image_format == "JPEG":
                mode = "L" if image.mode == "L" else "RGB"
            else:
                mode = image.mode if image.mode in {"1", "L", "LA", "RGB", "RGBA"} else "RGBA"
            clean = Image.new(mode, image.size)
            clean.paste(image.convert(mode))
            output = io.BytesIO()
            save_options = {"format": image_format}
            if image_format == "JPEG":
                save_options.update(quality=90, optimize=True)
            elif image_format == "PNG":
                save_options.update(optimize=True)
            elif image_format == "WEBP":
                save_options.update(quality=90, method=4)
            clean.save(output, **save_options)
            sanitized = output.getvalue()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ValueError("invalid problem media image") from exc

    if len(sanitized) > MAX_MEDIA_BYTES:
        raise ValueError("sanitized problem media exceeds 5 MiB")
    return sanitized, FORMAT_CONTENT_TYPES[image_format], width, height


def _safe_headers(content_hash: str) -> dict[str, str]:
    return {
        "Cache-Control": "public, max-age=31536000, immutable",
        "ETag": f'"{content_hash}"',
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Cross-Origin-Resource-Policy": "same-origin",
        "Content-Disposition": "inline",
    }


def _response(content: bytes | None, media_type: str, content_hash: str) -> Response:
    if media_type not in ALLOWED_CONTENT_TYPES or not content:
        raise HTTPException(status_code=404, detail="problem media is not available")
    digest = content_hash or hashlib.sha256(content).hexdigest()
    return Response(content=content, media_type=media_type, headers=_safe_headers(digest))


def _read_row(media_key: str, session_factory: SessionFactory):
    session = session_factory()
    try:
        row = session.query(ProblemMediaCache).filter_by(media_key=media_key).first()
        if row is None:
            return None
        return {
            "canonical_id": row.canonical_id,
            "source_url": row.source_url,
            "manifest": deepcopy(row.manifest or {}),
            "content": bytes(row.content) if row.content else None,
            "media_type": str(row.media_type or ""),
            "content_hash": str(row.content_hash or ""),
        }
    finally:
        session.close()


def _detached_response(data: dict) -> Response:
    return _response(data.get("content"), data.get("media_type", ""), data.get("content_hash", ""))


def _runtime_primitives() -> tuple[asyncio.Lock, asyncio.Semaphore]:
    global _locks_guard, _locks_loop, _download_semaphore
    loop = asyncio.get_running_loop()
    if _locks_guard is None or _locks_loop is not loop:
        _locks.clear()
        _locks_guard = asyncio.Lock()
        _download_semaphore = asyncio.Semaphore(DOWNLOAD_CONCURRENCY)
        _locks_loop = loop
    return _locks_guard, _download_semaphore


@asynccontextmanager
async def _locked_key(media_key: str):
    guard, _ = _runtime_primitives()
    async with guard:
        lock, users = _locks.get(media_key, (asyncio.Lock(), 0))
        _locks[media_key] = (lock, users + 1)
    try:
        async with lock:
            yield
    finally:
        async with guard:
            current = _locks.get(media_key)
            if current and current[0] is lock:
                if current[1] <= 1:
                    _locks.pop(media_key, None)
                else:
                    _locks[media_key] = (lock, current[1] - 1)


def _cooldown_active(manifest: dict) -> bool:
    value = manifest.get("retry_after")
    if not value:
        return False
    try:
        retry_after = datetime.fromisoformat(str(value))
        if retry_after.tzinfo is None:
            retry_after = retry_after.replace(tzinfo=timezone.utc)
        return retry_after > datetime.now(timezone.utc)
    except (TypeError, ValueError):
        return False


def _store_failure(media_key: str, message: str, session_factory: SessionFactory) -> None:
    session = session_factory()
    try:
        row = session.query(ProblemMediaCache).filter_by(media_key=media_key).first()
        if row:
            manifest = dict(row.manifest or {})
            manifest.update({
                "status": "failed",
                "error": message[:300],
                "retry_after": (datetime.now(timezone.utc) + timedelta(seconds=FAILURE_COOLDOWN_SECONDS)).isoformat(),
            })
            row.manifest = manifest
            session.commit()
    finally:
        session.close()


def _store_success(
    media_key: str,
    content: bytes,
    media_type: str,
    width: int,
    height: int,
    session_factory: SessionFactory,
) -> dict:
    session = session_factory()
    try:
        row = session.query(ProblemMediaCache).filter_by(media_key=media_key).first()
        if row is None:
            raise HTTPException(status_code=404, detail="unknown problem media")
        digest = hashlib.sha256(content).hexdigest()
        row.content = content
        row.media_type = media_type
        row.content_hash = digest
        manifest = dict(row.manifest or {})
        manifest.update({
            "status": "ready", "width": width, "height": height,
            "byte_size": len(content), "fetched_at": datetime.now(timezone.utc).isoformat(),
        })
        manifest.pop("error", None)
        manifest.pop("retry_after", None)
        row.manifest = manifest
        # Snapshot scalars before commit because production sessions expire ORM rows.
        canonical_id = str(row.canonical_id)
        source_url = str(row.source_url)
        session.commit()
        return {
            "content": content, "media_type": media_type, "content_hash": digest,
            "canonical_id": canonical_id, "source_url": source_url,
            "manifest": manifest,
        }
    finally:
        session.close()


async def _download(source_url: str, platform: str) -> tuple[bytes, str, int, int]:
    validated_url = _normalized_source_url(source_url, source_url, platform)
    host = urlsplit(validated_url).hostname or ""
    await asyncio.to_thread(_resolve_public_addresses, host)
    timeout = httpx.Timeout(connect=5.0, read=10.0, write=5.0, pool=5.0)
    async with httpx.AsyncClient(
        timeout=timeout,
        follow_redirects=False,
        cookies=None,
        trust_env=False,
        headers={"Accept": "image/png,image/jpeg,image/webp", "User-Agent": "ProblemMediaCache/1.0"},
    ) as client:
        async with client.stream("GET", validated_url) as response:
            if 300 <= response.status_code < 400:
                raise ValueError("problem media redirects are not allowed")
            response.raise_for_status()
            content_type = response.headers.get("content-type", "")
            length_header = response.headers.get("content-length")
            if length_header:
                try:
                    content_length = int(length_header)
                except ValueError as exc:
                    raise ValueError("invalid problem media content length") from exc
                if content_length > MAX_MEDIA_BYTES:
                    raise ValueError("problem media exceeds 5 MiB")
            chunks = []
            size = 0
            async for chunk in response.aiter_bytes():
                size += len(chunk)
                if size > MAX_MEDIA_BYTES:
                    raise ValueError("problem media exceeds 5 MiB")
                chunks.append(chunk)
    # Re-resolve after transfer so a change is detected and rejected for future use.
    await asyncio.to_thread(_resolve_public_addresses, host)
    return await asyncio.to_thread(_validate_and_strip_image, b"".join(chunks), content_type)


async def serve_problem_media(
    media_key: str,
    session_factory: SessionFactory | None = None,
) -> Response:
    """Fetch a registered image at most once concurrently, then serve its DB blob."""
    if not MEDIA_KEY_RE.fullmatch(media_key):
        raise HTTPException(status_code=404, detail="unknown problem media")
    factory = session_factory or SessionLocal
    initial = await asyncio.to_thread(_read_row, media_key, factory)
    if initial is None:
        raise HTTPException(status_code=404, detail="unknown problem media")
    if initial["content"]:
        return _detached_response(initial)
    if _cooldown_active(initial["manifest"]):
        raise HTTPException(status_code=503, detail="problem media is cooling down", headers={"Retry-After": str(FAILURE_COOLDOWN_SECONDS)})

    async with _locked_key(media_key):
        current = await asyncio.to_thread(_read_row, media_key, factory)
        if current is None:
            raise HTTPException(status_code=404, detail="unknown problem media")
        if current["content"]:
            return _detached_response(current)
        if _cooldown_active(current["manifest"]):
            raise HTTPException(status_code=503, detail="problem media is cooling down", headers={"Retry-After": str(FAILURE_COOLDOWN_SECONDS)})

        platform = str(current["canonical_id"]).split("-", 1)[0]
        _, semaphore = _runtime_primitives()
        try:
            async with semaphore:
                content, media_type, width, height = await _download(current["source_url"], platform)
            saved = await asyncio.to_thread(
                _store_success, media_key, content, media_type, width, height, factory,
            )
            return _detached_response(saved)
        except HTTPException:
            raise
        except (httpx.HTTPError, ValueError, OSError) as exc:
            await asyncio.to_thread(_store_failure, media_key, str(exc), factory)
            raise HTTPException(status_code=502, detail="problem media fetch failed") from exc
