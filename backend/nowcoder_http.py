"""Shared HTTP settings for requests to Nowcoder ACM."""
from __future__ import annotations

import os

NOWCODER_ORIGIN = "https://ac.nowcoder.com"
NOWCODER_HOME_URL = f"{NOWCODER_ORIGIN}/"
NOWCODER_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
NOWCODER_HEADERS = {
    "User-Agent": NOWCODER_USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Referer": NOWCODER_HOME_URL,
    "Origin": NOWCODER_ORIGIN,
}

def get_nowcoder_cookie() -> str:
    """Return the optional manually configured Nowcoder cookie."""
    return os.environ.get("NOWCODER_COOKIE", "").strip()


def has_nowcoder_cookie() -> bool:
    return bool(get_nowcoder_cookie())


def build_nowcoder_headers(*, include_process_cookie: bool = True) -> dict[str, str]:
    """Return fresh headers, optionally adding the configured cookie."""
    headers = dict(NOWCODER_HEADERS)
    if include_process_cookie:
        cookie = get_nowcoder_cookie()
        if cookie:
            headers["Cookie"] = cookie
    return headers
