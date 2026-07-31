"""Mocked security and integration coverage for problem media caching."""
from __future__ import annotations

import asyncio
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException
from PIL import Image
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from models import Base, ProblemMediaCache
import problem_catalog
from problem_identity import resolve_problem_identity
import problem_media_service as media
from problem_detail_service import normalize_problem_detail
from routes import code_execution, scrape


def image_bytes(fmt="PNG", *, metadata=False):
    output = io.BytesIO()
    image = Image.new("RGB", (3, 2), (12, 34, 56))
    kwargs = {}
    if metadata and fmt == "PNG":
        from PIL.PngImagePlugin import PngInfo
        info = PngInfo()
        info.add_text("Comment", "secret metadata")
        kwargs["pnginfo"] = info
    image.save(output, format=fmt, **kwargs)
    return output.getvalue()


class FakeStreamResponse:
    def __init__(self, body=b"", status=200, content_type="image/png", headers=None, chunks=None):
        self.status_code = status
        self.headers = {"content-type": content_type, **(headers or {})}
        self._body = body
        self._chunks = chunks

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")

    async def aiter_bytes(self):
        for chunk in self._chunks if self._chunks is not None else [self._body]:
            yield chunk


class AsyncContext:
    def __init__(self, value):
        self.value = value

    async def __aenter__(self):
        return self.value

    async def __aexit__(self, *_):
        return False


class FakeClient:
    def __init__(self, response):
        self.response = response
        self.stream_calls = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        return False

    def stream(self, method, url):
        self.stream_calls.append((method, url))
        return AsyncContext(self.response)


class MediaTestBase:
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        path = Path(self.temp.name) / "media.sqlite3"
        self.database_path = path
        self.engine = create_engine(f"sqlite:///{path.as_posix()}", connect_args={"check_same_thread": False})
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, expire_on_commit=False)

    def tearDown(self):
        self.engine.dispose()
        for suffix in ("", "-wal", "-shm"):
            try:
                Path(str(self.database_path) + suffix).unlink()
            except FileNotFoundError:
                pass
        self.temp.cleanup()

    def register(self, platform="luogu", source="https://cdn.luogu.com.cn/a.png"):
        identity = resolve_problem_identity(platform, "P1001" if platform == "luogu" else ("two-sum" if platform == "leetcode" else "21878"))
        detail = media.register_problem_media(
            {"description": f'<p>x</p><img src="{source}" alt="diagram">'}, identity, self.Session,
        )
        return detail["media"][0]["key"]


class ExtractionTests(MediaTestBase, unittest.TestCase):
    def test_html_and_markdown_locations_are_rewritten_and_registered(self):
        identity = resolve_problem_identity("luogu", "P1001")
        detail = media.register_problem_media({
            "description": '<p>A</p><img src="//cdn.luogu.com.cn/a.png" alt="A">',
            "hints": ["before ![B](https://img.luogu.com.cn/b.webp) after"],
        }, identity, self.Session)
        self.assertEqual(len(detail["media"]), 2)
        self.assertNotIn("cdn.luogu.com.cn/a.png", detail["description"])
        self.assertIn("/api/code/problem-media/", detail["description"])
        self.assertIn("/api/code/problem-media/", detail["hints"][0])
        self.assertNotIn("source_url", detail["media"][0])
        with self.Session() as session:
            self.assertEqual(session.scalar(func.count(ProblemMediaCache.id)), 2)
            self.assertEqual(session.query(ProblemMediaCache.media_key).distinct().count(), 2)

    def test_registration_is_idempotent_and_keeps_manifest_references(self):
        identity = resolve_problem_identity("leetcode", "two-sum")
        value = "![one](https://assets.leetcode-cn.com/a.png) ![two](https://assets.leetcode-cn.com/a.png)"
        first = media.register_problem_media({"description": value}, identity, self.Session)
        second = media.register_problem_media(first, identity, self.Session)
        self.assertEqual(len(first["media"]), 1)
        self.assertEqual(first["media"], second["media"])
        with self.Session() as session:
            row = session.query(ProblemMediaCache).one()
            self.assertEqual(len(row.manifest["references"]), 2)
            self.assertNotIn("media_key", row.manifest)
            self.assertTrue(row.media_key)
            self.assertTrue(all("source_url" not in ref for ref in row.manifest["references"]))

    def test_exact_allowlist_https_port_and_userinfo(self):
        valid = media._normalized_source_url("/a.png", "https://www.luogu.com.cn/problem/P1001", "luogu")
        self.assertEqual(valid, "https://www.luogu.com.cn/a.png")
        bad = (
            "http://cdn.luogu.com.cn/a.png",
            "https://cdn.luogu.com.cn:444/a.png",
            "https://user@cdn.luogu.com.cn/a.png",
            "https://cdn.luogu.com.cn.attacker.test/a.png",
            "data:image/png;base64,abc",
        )
        for url in bad:
            with self.subTest(url=url), self.assertRaises(ValueError):
                media._normalized_source_url(url, "https://www.luogu.com.cn/problem/P1001", "luogu")

    def test_parser_preserves_only_statement_image_locations(self):
        parsed = scrape._parse_nowcoder_detail("""
          <img src="https://static.nowcoder.com/outside.png">
          <div class="terminal-topic"><div class="subject-des">A<img data-src="/inside.png" alt="map"></div></div>
        """)
        self.assertEqual(parsed["media"], [{
            "source_url": "/inside.png", "alt": "map", "field": "description", "ordinal": 0,
        }])

    def test_normalization_is_pure_and_live_registration_is_explicit(self):
        identity = resolve_problem_identity("nowcoder", "21878")
        raw = {
            "description": "statement",
            "media": [{"source_url": "https://static.nowcoder.com/a.png", "field": "description"}],
        }
        normalized = normalize_problem_detail(raw, identity, "live")
        with self.Session() as session:
            self.assertEqual(session.scalar(func.count(ProblemMediaCache.id)), 0)
        detail = media.register_problem_media(normalized, identity, self.Session)
        self.assertRegex(detail["media"][0]["key"], r"^[0-9a-f]{64}$")
        self.assertNotIn("source_url", detail["media"][0])

    def test_catalog_preserves_media_candidates(self):
        raw = {"schema_version": 2, "skills": [], "problems": [{
            "pid": "1", "id": "nowcoder-1", "title": "x",
            "url": "https://ac.nowcoder.com/acm/problem/1",
            "detail": {"description": "x", "media": [{"source_url": "/a.png"}]},
        }]}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "catalog.json"
            path.write_text(json.dumps(raw), encoding="utf-8")
            problem_catalog.load_nowcoder_catalog.cache_clear()
            with patch.object(problem_catalog, "_CATALOG_PATH", path):
                loaded = problem_catalog.load_nowcoder_catalog()
            problem_catalog.load_nowcoder_catalog.cache_clear()
        self.assertEqual(loaded["problems"][0]["media"], [{"source_url": "/a.png"}])


class ValidationTests(unittest.TestCase):
    def test_png_jpeg_webp_are_decoded_and_metadata_stripped(self):
        for fmt, content_type in (("PNG", "image/png"), ("JPEG", "image/jpeg"), ("WEBP", "image/webp")):
            with self.subTest(fmt=fmt):
                clean, actual_type, width, height = media._validate_and_strip_image(
                    image_bytes(fmt, metadata=True), content_type,
                )
                self.assertEqual(actual_type, content_type)
                self.assertEqual((width, height), (3, 2))
                with Image.open(io.BytesIO(clean)) as image:
                    self.assertNotIn("Comment", image.info)

    def test_invalid_mismatch_animation_and_oversize_are_rejected(self):
        with self.assertRaises(ValueError):
            media._validate_and_strip_image(b"<html>bad</html>", "image/png")
        with self.assertRaises(ValueError):
            media._validate_and_strip_image(image_bytes("PNG"), "image/jpeg")
        with self.assertRaises(ValueError):
            media._validate_and_strip_image(b"x" * (media.MAX_MEDIA_BYTES + 1), "image/png")
        frames = [Image.new("RGB", (2, 2), color) for color in ("red", "blue")]
        output = io.BytesIO()
        frames[0].save(output, format="WEBP", save_all=True, append_images=frames[1:])
        with self.assertRaises(ValueError):
            media._validate_and_strip_image(output.getvalue(), "image/webp")

    @patch("problem_media_service.socket.getaddrinfo")
    def test_dns_private_reserved_and_mixed_answers_are_rejected(self, lookup):
        for addresses in (["127.0.0.1"], ["10.0.0.1"], ["169.254.1.1"], ["::1"], ["192.0.2.1"], ["93.184.216.34", "127.0.0.1"]):
            lookup.return_value = [(None, None, None, None, (address, 443)) for address in addresses]
            with self.subTest(addresses=addresses), self.assertRaises(ValueError):
                media._resolve_public_addresses("cdn.luogu.com.cn")


class ServingTests(MediaTestBase, unittest.IsolatedAsyncioTestCase):
    async def test_unknown_and_malformed_keys_are_404_without_network(self):
        for key in ("bad", "a" * 64):
            with self.subTest(key=key), self.assertRaises(HTTPException) as raised:
                await media.serve_problem_media(key, self.Session)
            self.assertEqual(raised.exception.status_code, 404)

    async def test_download_uses_no_redirects_cookies_or_environment_and_streams(self):
        key = self.register()
        response = FakeStreamResponse(image_bytes("PNG"))
        client = FakeClient(response)
        with patch("problem_media_service._resolve_public_addresses", return_value=("93.184.216.34",)) as dns, \
             patch("problem_media_service.httpx.AsyncClient", return_value=client) as factory:
            served = await media.serve_problem_media(key, self.Session)
        self.assertEqual(served.media_type, "image/png")
        kwargs = factory.call_args.kwargs
        self.assertFalse(kwargs["follow_redirects"])
        self.assertIsNone(kwargs["cookies"])
        self.assertFalse(kwargs["trust_env"])
        self.assertEqual(client.stream_calls, [("GET", "https://cdn.luogu.com.cn/a.png")])
        self.assertEqual(dns.call_count, 2)
        self.assertEqual(served.headers["x-content-type-options"], "nosniff")
        self.assertIn("immutable", served.headers["cache-control"])
        self.assertEqual(served.headers["cross-origin-resource-policy"], "same-origin")

    async def test_redirect_and_streaming_caps_fail_and_set_cooldown(self):
        for response in (
            FakeStreamResponse(status=302, headers={"location": "https://cdn.luogu.com.cn/b.png"}),
            FakeStreamResponse(headers={"content-length": str(media.MAX_MEDIA_BYTES + 1)}),
            FakeStreamResponse(chunks=[b"x" * media.MAX_MEDIA_BYTES, b"x"]),
        ):
            key = self.register(source=f"https://cdn.luogu.com.cn/{id(response)}.png")
            with patch("problem_media_service._resolve_public_addresses", return_value=("93.184.216.34",)), \
                 patch("problem_media_service.httpx.AsyncClient", return_value=FakeClient(response)):
                with self.assertRaises(HTTPException) as raised:
                    await media.serve_problem_media(key, self.Session)
            self.assertEqual(raised.exception.status_code, 502)
            with self.assertRaises(HTTPException) as cooldown:
                await media.serve_problem_media(key, self.Session)
            self.assertEqual(cooldown.exception.status_code, 503)

    async def test_per_key_singleflight_persists_blob_and_restart_avoids_network(self):
        key = self.register()
        started = asyncio.Event()
        release = asyncio.Event()
        calls = 0

        async def download(*_):
            nonlocal calls
            calls += 1
            started.set()
            await release.wait()
            return image_bytes("PNG"), "image/png", 3, 2

        with patch("problem_media_service._download", side_effect=download):
            first = asyncio.create_task(media.serve_problem_media(key, self.Session))
            await started.wait()
            second = asyncio.create_task(media.serve_problem_media(key, self.Session))
            await asyncio.sleep(0)
            release.set()
            responses = await asyncio.gather(first, second)
        self.assertEqual(calls, 1)
        self.assertEqual(responses[0].body, responses[1].body)
        self.assertNotIn(key, media._locks)
        with self.Session() as session:
            row = session.query(ProblemMediaCache).one()
            self.assertEqual(row.manifest["status"], "ready")
            self.assertEqual(row.content, responses[0].body)
        with patch("problem_media_service._download", AsyncMock(side_effect=AssertionError("no network"))) as download_mock:
            restarted = await media.serve_problem_media(key, self.Session)
        download_mock.assert_not_awaited()
        self.assertEqual(restarted.body, responses[0].body)

    async def test_route_passes_only_opaque_key_to_service(self):
        expected = MagicMock()
        with patch.object(code_execution, "serve_problem_media", AsyncMock(return_value=expected)) as serve:
            result = await code_execution.get_problem_media("a" * 64)
        self.assertIs(result, expected)
        serve.assert_awaited_once_with("a" * 64, session_factory=code_execution.SessionLocal)


if __name__ == "__main__":
    unittest.main()
