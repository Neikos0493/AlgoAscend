"""Canonical identities and URLs for supported problem platforms."""
from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import unquote, urlparse


_PLATFORM_ALIASES = {
    "luogu": ("luogu-",),
    "leetcode": ("leetcode-",),
    "nowcoder": ("nowcoder-", "nc-skill-"),
}

_NATIVE_PATTERNS = {
    "luogu": re.compile(r"[A-Za-z0-9_]+"),
    "leetcode": re.compile(r"[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*"),
    "nowcoder": re.compile(r"\d+"),
}


@dataclass(frozen=True)
class ProblemIdentity:
    platform: str
    native_id: str

    @property
    def canonical_id(self) -> str:
        return f"{self.platform}-{self.native_id}"

    @property
    def canonical_url(self) -> str:
        if self.platform == "luogu":
            return f"https://www.luogu.com.cn/problem/{self.native_id}"
        if self.platform == "leetcode":
            return f"https://leetcode.cn/problems/{self.native_id}/"
        return f"https://ac.nowcoder.com/acm/problem/{self.native_id}"


def _native_id_from_url(platform: str, raw_url: str) -> str:
    parsed = urlparse(raw_url)
    host = (parsed.hostname or "").lower()
    path = unquote(parsed.path).rstrip("/")

    if platform == "luogu" and host in {"luogu.com.cn", "www.luogu.com.cn"}:
        match = re.search(r"/problem/([^/]+)$", path, re.IGNORECASE)
    elif platform == "leetcode" and host in {"leetcode.cn", "www.leetcode.cn", "leetcode.com", "www.leetcode.com"}:
        match = re.search(r"/problems/([^/]+)$", path, re.IGNORECASE)
    elif platform == "nowcoder" and host in {"nowcoder.com", "www.nowcoder.com", "ac.nowcoder.com"}:
        match = re.search(r"/acm/problem/(\d+)$", path, re.IGNORECASE)
    else:
        match = None

    return match.group(1) if match else ""


def resolve_problem_identity(platform: str, value: str = "", url: str = "") -> ProblemIdentity:
    """Resolve native, canonical, legacy, or known-host URL input to one identity."""
    normalized_platform = (platform or "").strip().lower()
    if normalized_platform not in _PLATFORM_ALIASES:
        raise ValueError(f"unsupported platform: {platform}")

    native_id = ""
    for candidate_url in (url, value):
        if candidate_url and "://" in candidate_url:
            native_id = _native_id_from_url(normalized_platform, candidate_url.strip())
            if native_id:
                break

    if not native_id:
        native_id = (value or "").strip()
        lowered = native_id.lower()
        for prefix in _PLATFORM_ALIASES[normalized_platform]:
            if lowered.startswith(prefix):
                native_id = native_id[len(prefix):]
                break

    pattern = _NATIVE_PATTERNS[normalized_platform]
    if not native_id or pattern.fullmatch(native_id) is None:
        raise ValueError(f"invalid {normalized_platform} problem identity")

    if normalized_platform == "leetcode":
        native_id = native_id.lower()
    elif normalized_platform == "luogu":
        native_id = native_id.upper()

    return ProblemIdentity(normalized_platform, native_id)


def normalize_resource_identity(resource: dict, platform: str) -> dict:
    """Add stable pid/native aliases without changing a consumer-facing id."""
    original_id = str(resource.get("id", "") or "")
    identity = resolve_problem_identity(
        platform,
        value=str(resource.get("pid", resource.get("native_id", original_id)) or ""),
        url=str(resource.get("url", "") or ""),
    )
    normalized = dict(resource)
    normalized["id"] = original_id or identity.canonical_id
    normalized["pid"] = identity.native_id
    normalized["native_id"] = identity.native_id
    normalized["canonical_id"] = identity.canonical_id
    normalized["url"] = identity.canonical_url
    return normalized
