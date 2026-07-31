"""Built-in unittest coverage for the backend scraper repair."""
from __future__ import annotations

import asyncio
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import problem_catalog
from models import Base, ProblemDetailCache, ProblemMediaCache
from problem_catalog import find_catalog_problem, get_nowcoder_categories, load_nowcoder_catalog, search_nowcoder_catalog
from problem_detail_service import get_problem_detail as resolve_problem_detail, normalize_problem_detail
from problem_identity import normalize_resource_identity, resolve_problem_identity
from routes import code_execution, knowledge, scrape
import scrape_nowcoder_skills as catalog_scraper


class ConfigAndClientTests(unittest.TestCase):
    def test_nowcoder_client_uses_configured_cookie(self):
        client = MagicMock()
        client.headers = {}
        with patch.dict("os.environ", {"NOWCODER_COOKIE": "session=value"}), \
             patch("httpx.Client", return_value=client) as client_factory:
            created = catalog_scraper.create_client()
        self.assertIs(created, client)
        self.assertEqual(client_factory.call_args.kwargs["headers"]["Cookie"], "session=value")
        self.assertEqual(client.headers["Referer"], "https://ac.nowcoder.com/")
        client.get.assert_called_once_with("https://ac.nowcoder.com/")

    def test_user_code_environment_excludes_backend_secrets(self):
        with patch.dict(os.environ, {
            "NOWCODER_COOKIE": "cookie-secret",
            "LLM_API_KEY": "llm-secret",
            "VITE_DEEPSEEK_API_KEY": "frontend-secret",
            "PATH": "compiler-path",
        }, clear=True):
            child_env = code_execution._user_code_environment()
        self.assertNotIn("NOWCODER_COOKIE", child_env)
        self.assertNotIn("LLM_API_KEY", child_env)
        self.assertNotIn("VITE_DEEPSEEK_API_KEY", child_env)
        self.assertEqual(child_env["PATH"], "compiler-path")


class CanonicalIdentityTests(unittest.TestCase):
    def test_native_canonical_legacy_and_url_resolve_equally(self):
        values = (
            resolve_problem_identity("nowcoder", "21878"),
            resolve_problem_identity("nowcoder", "nowcoder-21878"),
            resolve_problem_identity("nowcoder", "nc-skill-21878"),
            resolve_problem_identity("nowcoder", url="https://ac.nowcoder.com/acm/problem/21878"),
        )
        self.assertEqual({value.canonical_id for value in values}, {"nowcoder-21878"})
        self.assertEqual(values[0].canonical_url, "https://ac.nowcoder.com/acm/problem/21878")

    def test_known_platform_identity_is_not_double_prefixed(self):
        identity = resolve_problem_identity("luogu", "luogu-P1001")
        self.assertEqual(identity.native_id, "P1001")
        self.assertEqual(identity.canonical_id, "luogu-P1001")

    def test_unknown_host_is_rejected(self):
        with self.assertRaises(ValueError):
            resolve_problem_identity("nowcoder", url="https://example.com/acm/problem/21878")

    def test_normalization_preserves_changed_legacy_id(self):
        normalized = normalize_resource_identity({
            "id": "nc-skill-21878",
            "url": "https://ac.nowcoder.com/acm/problem/21878",
        }, "nowcoder")
        self.assertEqual(normalized["id"], "nc-skill-21878")
        self.assertEqual(normalized["pid"], "21878")
        self.assertEqual(normalized["native_id"], "21878")
        self.assertEqual(normalized["canonical_id"], "nowcoder-21878")


class StructuredParsingTests(unittest.TestCase):
    LIST_HTML = """
    <table class="no-border">
      <tr data-problemid="21878">
        <td>NC100</td>
        <td><a class="title" href="/acm/problem/21878"><strong>两数之和</strong></a>
            <a class="tag-label js-tag">数组</a></td>
        <td><span class="difficulty">中等</span></td>
        <td class="pass-count">1,234</td><td>操作</td>
      </tr>
    </table>
    """

    def test_list_parser_does_not_discard_headerless_first_row(self):
        problems = scrape._parse_nowcoder_list(self.LIST_HTML)
        self.assertEqual(len(problems), 1)
        self.assertEqual(problems[0]["id"], "21878")
        self.assertEqual(problems[0]["title"], "两数之和")
        self.assertEqual(problems[0]["tags"], ["数组"])
        self.assertEqual(problems[0]["accepted"], 1234)

    def test_list_parser_handles_header_and_waf(self):
        html = self.LIST_HTML.replace("<table", "<table><thead><tr><th>题目</th></tr></thead><tbody", 1).replace("</table>", "</tbody></table>")
        self.assertEqual(len(scrape._parse_nowcoder_list(html)), 1)
        self.assertEqual(scrape._parse_nowcoder_list('<META NAME="ALIYUN_WAF_AA">'), [])

    def test_detail_parser_preserves_structure(self):
        html = """
        <div class="terminal-topic">
          <h1 class="subject-title">两数之和</h1>
          <span>时间限制：1秒</span><span>空间限制：64MB</span>
          <div class="subject-des"><p>给定两个整数。</p><p>输出它们的和。</p></div>
          <pre class="sample-input">1 2</pre><pre class="sample-output">3</pre>
          <div>通过人数：30 提交人数：50</div>
        </div>
        """
        detail = scrape._parse_nowcoder_detail(html)
        self.assertEqual(detail["title"], "两数之和")
        self.assertEqual(detail["description"], "给定两个整数。\n输出它们的和。")
        self.assertEqual(detail["time_limit"], "1秒")
        self.assertEqual(detail["space_limit"], "64MB")
        self.assertEqual(detail["samples"], [{"input": "1 2", "output": "3"}])
        self.assertEqual(detail["ac_rate"], 60.0)

    def test_detail_parser_separates_statement_sections_from_samples(self):
        html = """
        <div class="terminal-topic">
          <h2>题目描述</h2><div><p>计算答案。</p></div>
          <h2>输入描述：</h2><div>第一行 n<br><pre>1 &lt;= n &lt;= 10</pre></div>
          <h2>输出描述</h2><div><p>输出答案</p></div>
          <h2>数据范围及提示</h2><div>n 为整数<br>不要溢出</div>
          <h2>备注</h2><div>多组数据</div>
          <h2>提示</h2><div>使用前缀和</div>
          <h2>样例输入 1</h2><pre>2<br>1 2</pre>
          <h2>样例输出 1</h2><pre>3</pre>
        </div>
        """
        detail = scrape._parse_nowcoder_detail(html)
        self.assertEqual(detail["description"], "计算答案。")
        self.assertEqual(detail["input_description"], "第一行 n\n1 <= n <= 10")
        self.assertEqual(detail["output_description"], "输出答案")
        self.assertEqual(detail["constraints"], "n 为整数\n不要溢出")
        self.assertEqual(detail["notes"], "多组数据")
        self.assertEqual(detail["hints"], ["使用前缀和"])
        self.assertEqual(detail["samples"], [{"input": "2\n1 2", "output": "3"}])

    def test_detail_parser_includes_direct_text_after_heading(self):
        detail = scrape._parse_nowcoder_detail(
            '<div class="terminal-topic"><h2>输入描述</h2>第一行是 n<h2>输出描述</h2>输出答案</div>'
        )
        self.assertEqual(detail["input_description"], "第一行是 n")
        self.assertEqual(detail["output_description"], "输出答案")

    def test_detail_parser_keeps_multiline_samples_and_unmatched_input(self):
        html = """
        <div class="terminal-topic">
          <div class="subject-des">测试多组样例</div>
          <pre class="sample-input"> 2\r\n1 2\r\n</pre>
          <pre class="sample-output">3\r\n</pre>
          <pre class="sample-input">4\n5 6\n</pre>
        </div>
        """
        detail = scrape._parse_nowcoder_detail(html)
        self.assertEqual(detail["samples"], [
            {"input": " 2\n1 2\n", "output": "3\n"},
            {"input": "4\n5 6\n", "output": ""},
        ])

    def test_numbered_samples_do_not_shift_when_one_output_is_missing(self):
        detail = scrape._parse_nowcoder_detail("""
        <div class="terminal-topic">
          <div class="subject-des">题面</div>
          <h2>样例输入 1</h2><pre>one</pre>
          <h2>样例输入 2</h2><pre>two</pre>
          <h2>样例输出 2</h2><pre>answer-two</pre>
        </div>
        """)
        self.assertEqual(detail["samples"], [
            {"input": "one", "output": ""},
            {"input": "two", "output": "answer-two"},
        ])

    def test_sample_normalization_deduplicates_and_preserves_whitespace(self):
        samples = problem_catalog.normalize_samples([
            {"input": " 1\r\n2\r\n", "output": "3\r\n"},
            {"stdin": " 1\n2\n", "expected": "3\n"},
            {"input": "", "output": ""},
        ])
        self.assertEqual(samples, [{"input": " 1\n2\n", "output": "3\n"}])

    def test_oversized_sample_does_not_hide_later_valid_sample(self):
        with patch.object(problem_catalog, "MAX_PUBLIC_SAMPLE_BYTES", 5):
            samples = problem_catalog.normalize_samples([
                {"input": "too-large", "output": "value"},
                {"input": "1", "output": "2"},
            ])
        self.assertEqual(samples, [{"input": "1", "output": "2"}])


class CatalogTests(unittest.TestCase):
    def test_catalog_categories_and_tag_filter(self):
        categories = get_nowcoder_categories()
        self.assertGreater(len(categories), 0)
        tag_id = categories[0]["tag_id"]
        items, total = search_nowcoder_catalog(tag_id=tag_id, page=1, limit=5)
        self.assertGreater(total, 0)
        self.assertLessEqual(len(items), 5)
        self.assertTrue(all(item["skill_tag_id"] == tag_id for item in items))
        self.assertEqual(len({item["id"] for item in items}), len(items))
        self.assertTrue(all(item["pid"] == item["native_id"] for item in items))

    def test_catalog_route_keeps_compatible_response_shape(self):
        bank = scrape._bank_response([{
            "id": "nc-skill-21878",
            "title": "测试题",
            "difficulty": "简单",
            "tags": ["数组"],
            "url": "https://ac.nowcoder.com/acm/problem/21878",
        }], "nowcoder")
        self.assertTrue({"status", "platform", "source", "total", "page", "resources"} <= bank.keys())
        self.assertTrue({"id", "title", "platform", "platform_name", "platform_icon", "difficulty", "tags", "url", "accepted", "submitted", "ac_rate"} <= bank["resources"][0].keys())
        self.assertEqual(bank["resources"][0]["id"], "nc-skill-21878")
        self.assertEqual(bank["resources"][0]["pid"], "21878")
        self.assertEqual(bank["resources"][0]["canonical_id"], "nowcoder-21878")

    def test_knowledge_route_keeps_legacy_public_ids_unchanged(self):
        self.assertTrue(knowledge.load_nc_problems())
        problem = knowledge._nc_problems[0]
        self.assertTrue(problem["id"].startswith("nc-skill-"))
        self.assertNotIn("canonical_id", problem)

    def test_catalog_migrates_legacy_schema_and_exposes_detail_fields(self):
        catalog = load_nowcoder_catalog()
        self.assertEqual(catalog["schema_version"], 2)
        problem = find_catalog_problem("nowcoder", "21878")
        self.assertIsNotNone(problem)
        self.assertEqual(problem["pid"], "21878")
        self.assertIn("description", problem)
        self.assertIn("samples", problem)


class CatalogEnrichmentTests(unittest.TestCase):
    def _catalog(self, *problems):
        return {"schema_version": 2, "skills": [], "problems": [dict(problem) for problem in problems]}

    def test_cli_defaults_do_not_enable_bulk_details(self):
        args = catalog_scraper.build_arg_parser().parse_args([])
        self.assertFalse(args.include_details)
        self.assertFalse(args.refresh_details)
        with patch.object(catalog_scraper, "main", return_value=[]) as main:
            catalog_scraper.cli([])
        self.assertFalse(main.call_args.kwargs["include_details"])
        self.assertFalse(main.call_args.kwargs["refresh_details"])

    def test_resume_skips_complete_and_retries_partial(self):
        catalog = self._catalog(
            {"pid": "1", "detail": {"description": "d", "samples": [{"input": "1", "output": "1"}]}, "detail_status": "complete"},
            {"pid": "2", "detail": {"description": "old"}, "detail_status": "partial"},
        )
        with patch.object(catalog_scraper, "scrape_problem_detail", return_value={"description": "new", "input_description": "n"}) as fetch:
            counts = catalog_scraper.enrich_catalog_details(
                catalog, MagicMock(), rate_seconds=0, retries=0,
                sleeper=lambda _: None, timestamp=lambda: "2026-07-31T00:00:00+00:00",
            )
        fetch.assert_called_once_with(unittest.mock.ANY, "2")
        self.assertEqual(counts["skipped"], 1)
        self.assertEqual(counts["partial"], 1)
        self.assertEqual(counts["catalog_complete"], 1)
        self.assertEqual(counts["catalog_partial"], 1)
        self.assertEqual(catalog["problems"][1]["detail_fetched_at"], "2026-07-31T00:00:00+00:00")

    def test_refresh_failure_retains_previous_success_and_checkpoints_atomically(self):
        catalog = self._catalog({
            "pid": "1",
            "detail": {"description": "old", "samples": [{"input": "1", "output": "1"}]},
            "detail_status": "complete",
            "detail_fetched_at": "old-time",
        })
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "catalog.json"
            with patch.object(catalog_scraper, "scrape_problem_detail", side_effect=RuntimeError("blocked")) as fetch:
                counts = catalog_scraper.enrich_catalog_details(
                    catalog, MagicMock(), refresh=True, rate_seconds=0,
                    checkpoint_every=1, retries=1, output_path=output,
                    sleeper=lambda _: None, timestamp=lambda: "new-time",
                )
            self.assertEqual(fetch.call_count, 2)
            self.assertEqual(counts["failed"], 1)
            self.assertEqual(counts["retained"], 1)
            self.assertEqual(counts["checkpoints"], 1)
            self.assertEqual(catalog["problems"][0]["detail"]["description"], "old")
            self.assertEqual(catalog["problems"][0]["detail_status"], "complete")
            self.assertEqual(catalog["problems"][0]["detail_fetched_at"], "old-time")
            self.assertTrue(output.exists())
            self.assertFalse(output.with_name("catalog.json.tmp").exists())
            self.assertEqual(json.loads(output.read_text(encoding="utf-8"))["problems"][0]["detail"]["description"], "old")

    def test_merge_existing_nested_detail_state(self):
        problems = [{"pid": "1", "native_id": "1"}]
        existing = self._catalog({
            "pid": "1", "detail": {"description": "saved", "input_description": "n"},
            "detail_status": "partial", "detail_fetched_at": "saved-time",
        })
        self.assertEqual(catalog_scraper.merge_existing_details(problems, existing), 1)
        self.assertEqual(problems[0]["detail"]["description"], "saved")
        self.assertEqual(problems[0]["detail_status"], "partial")

    def test_catalog_loader_reads_nested_detail_and_status(self):
        raw = {
            "schema_version": 2,
            "source": "test",
            "skills": [],
            "problems": [{
                "id": "nowcoder-1", "pid": "1", "native_id": "1", "title": "summary",
                "url": "https://ac.nowcoder.com/acm/problem/1", "tags": [],
                "detail": {
                    "title": "detail title", "description": "statement",
                    "input_description": "n", "output_description": "answer",
                    "hints": ["hint"], "samples": [{"input": "1", "output": "1"}],
                },
                "detail_status": "complete", "detail_fetched_at": "saved-time",
            }],
        }
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "catalog.json"
            path.write_text(json.dumps(raw), encoding="utf-8")
            problem_catalog.load_nowcoder_catalog.cache_clear()
            with patch.object(problem_catalog, "_CATALOG_PATH", path):
                catalog = problem_catalog.load_nowcoder_catalog()
            problem_catalog.load_nowcoder_catalog.cache_clear()
        item = catalog["problems"][0]
        self.assertEqual(item["description"], "statement")
        self.assertEqual(item["input_description"], "n")
        self.assertEqual(item["detail_status"], "complete")
        self.assertEqual(item["detail_fetched_at"], "saved-time")

    def test_catalog_normalizes_null_lists_and_deduplicates_aliases(self):
        raw = {
            "schema_version": 2,
            "skills": None,
            "problems": [
                {"id": "nc-skill-1", "pid": "1", "title": "first"},
                {"id": "nowcoder-1", "native_id": "1", "title": "duplicate"},
            ],
        }
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "catalog.json"
            path.write_text(json.dumps(raw), encoding="utf-8")
            problem_catalog.load_nowcoder_catalog.cache_clear()
            with patch.object(problem_catalog, "_CATALOG_PATH", path):
                catalog = problem_catalog.load_nowcoder_catalog()
            problem_catalog.load_nowcoder_catalog.cache_clear()
        self.assertEqual(catalog["skills"], [])
        self.assertEqual(len(catalog["problems"]), 1)
        self.assertEqual(catalog["problems"][0]["canonical_id"], "nowcoder-1")

    def test_membership_merge_preserves_all_skill_categories(self):
        merged = catalog_scraper._merge_problem_memberships([
            {"pid": "1", "native_id": "1", "skill_tag_id": "10", "skill_name": "数组", "tags": ["模拟"]},
            {"pid": "1", "native_id": "1", "skill_tag_id": "20", "skill_name": "哈希", "tags": ["映射"]},
        ])
        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0]["skill_tag_ids"], ["10", "20"])
        self.assertEqual(merged[0]["skill_names"], ["数组", "哈希"])
        self.assertEqual(merged[0]["tags"], ["模拟", "映射"])

    def test_catalog_candidate_rejects_required_failures_and_coverage_drop(self):
        with self.assertRaises(catalog_scraper.CatalogValidationError):
            catalog_scraper.validate_catalog_candidate([{"tag_id": "1"}], [{"pid": "1"}], None, ["failed"])
        existing = {"problems": [{"pid": str(index)} for index in range(10)]}
        with self.assertRaises(catalog_scraper.CatalogValidationError):
            catalog_scraper.validate_catalog_candidate([{"tag_id": "1"}], [{"pid": str(index)} for index in range(7)], existing, [])

    def test_skill_parser_validates_markup_and_comma_counts(self):
        response = MagicMock()
        response.text = '<a href="/acm/skill/detail/acm/1">数组1,234人练习共2,345道题目</a>'
        response.raise_for_status.return_value = None
        skills = catalog_scraper.scrape_skills(MagicMock(get=MagicMock(return_value=response)))
        self.assertEqual(skills[0]["practice_count"], 1234)
        self.assertEqual(skills[0]["problem_count"], 2345)
        response.text = "<html>login</html>"
        with self.assertRaises(catalog_scraper.CatalogValidationError):
            catalog_scraper.scrape_skills(MagicMock(get=MagicMock(return_value=response)))


class OptionalEnrichmentTests(unittest.IsolatedAsyncioTestCase):
    BASE_PROBLEM = {"id": "21878", "title": "基础标题", "difficulty": "中等", "tags": ["数组"], "accepted": None}

    async def test_enrichment_disabled_makes_no_detail_request(self):
        with patch.object(scrape, "_scrape_nowcoder_list_page", AsyncMock(return_value=([dict(self.BASE_PROBLEM)], False))), patch.object(scrape, "_fetch_nowcoder_enrichment", AsyncMock()) as fetch:
            response = await scrape.scrape_nowcoder(keyword="", difficulty=0, page=1, limit=20, enrich=False)
        fetch.assert_not_awaited()
        self.assertEqual(response["resources"][0]["id"], "nowcoder-21878")
        self.assertEqual(response["resources"][0]["pid"], "21878")
        self.assertEqual(response["source"], "live")

    async def test_enrichment_merges_success_and_tolerates_failure(self):
        problems = [dict(self.BASE_PROBLEM), {**self.BASE_PROBLEM, "id": "21879"}]
        fetch = AsyncMock(side_effect=[{"accepted": 30, "submitted": 50, "ac_rate": 60.0}, RuntimeError("blocked")])
        with patch.object(scrape, "_scrape_nowcoder_list_page", AsyncMock(return_value=(problems, False))), patch.object(scrape, "_fetch_nowcoder_enrichment", fetch):
            response = await scrape.scrape_nowcoder(keyword="", difficulty=0, page=1, limit=20, enrich=True)
        self.assertEqual(response["resources"][0]["accepted"], 30)
        self.assertIsNone(response["resources"][1]["accepted"])
        self.assertEqual(len(response["resources"]), 2)


class DetailRouteTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp_directory = tempfile.TemporaryDirectory()
        database_path = Path(self.temp_directory.name) / "detail-cache.sqlite3"
        self.engine = create_engine(
            f"sqlite:///{database_path.as_posix()}",
            connect_args={"check_same_thread": False},
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, expire_on_commit=False)
        self.route_session_patch = patch.object(code_execution, "SessionLocal", self.Session)
        self.service_session_patch = patch("problem_detail_service.SessionLocal", self.Session)
        self.cookie_patch = patch.dict("os.environ", {"NOWCODER_COOKIE": "test-cookie"})
        self.route_session_patch.start()
        self.service_session_patch.start()
        self.cookie_patch.start()

    async def asyncTearDown(self):
        self.cookie_patch.stop()
        self.service_session_patch.stop()
        self.route_session_patch.stop()
        self.engine.dispose()
        self.temp_directory.cleanup()

    async def test_canonical_cache_key_is_shared_by_legacy_and_url_inputs(self):
        detail = {"title": "测试", "description": "内容", "samples": [], "url": "https://ac.nowcoder.com/acm/problem/21878"}
        with patch.object(code_execution, "_fetch_nowcoder_detail", AsyncMock(return_value=detail)) as fetch:
            first = await code_execution.get_problem_detail("nowcoder", "nc-skill-21878", "")
            second = await code_execution.get_problem_detail("nowcoder", "", "https://ac.nowcoder.com/acm/problem/21878")
        self.assertEqual(
            {key: value for key, value in first.items() if key != "source"},
            {key: value for key, value in second.items() if key != "source"},
        )
        self.assertEqual((first["source"], second["source"]), ("live", "database"))
        fetch.assert_awaited_once_with("21878")
        with self.Session() as session:
            self.assertEqual(session.scalar(func.count(ProblemDetailCache.id)), 1)

    async def test_error_detail_is_structured_and_not_cached(self):
        failed = AsyncMock(return_value={"error": "blocked", "description": ""})
        with patch.dict("os.environ", {"NOWCODER_COOKIE": "test-cookie"}), \
             patch.object(code_execution, "_fetch_nowcoder_detail", failed):
            first = await code_execution.get_problem_detail("nowcoder", "999999", "")
            second = await code_execution.get_problem_detail("nowcoder", "999999", "")
        self.assertEqual(first["pid"], "999999")
        self.assertEqual(first["samples"], [])
        self.assertEqual(first["source"], "live")
        self.assertIn("error", first)
        self.assertEqual(first, second)
        self.assertEqual(failed.await_count, 2)
        with self.Session() as session:
            self.assertEqual(session.scalar(func.count(ProblemDetailCache.id)), 0)

    async def test_durable_cache_singleflight_and_success_only_persistence(self):
        calls = 0
        started = asyncio.Event()
        release = asyncio.Event()

        async def fetch(_pid):
            nonlocal calls
            calls += 1
            started.set()
            await release.wait()
            return {"title": "持久题", "description": "可缓存题面"}

        with patch("problem_detail_service.get_local_problem_detail", return_value=None):
            first_task = asyncio.create_task(resolve_problem_detail(
                "luogu", "P9876", fetchers={"luogu": fetch}, session_factory=self.Session,
            ))
            await started.wait()
            second_task = asyncio.create_task(resolve_problem_detail(
                "luogu", "luogu-P9876", fetchers={"luogu": fetch}, session_factory=self.Session,
            ))
            await asyncio.sleep(0)
            release.set()
            first, second = await asyncio.gather(first_task, second_task)

            self.assertEqual(calls, 1)
            self.assertEqual(first, second)
            with self.Session() as session:
                self.assertEqual(session.scalar(func.count(ProblemDetailCache.id)), 1)

            cached, cacheable = await resolve_problem_detail(
                "luogu", "P9876",
                fetchers={"luogu": AsyncMock(side_effect=AssertionError("must not fetch"))},
                session_factory=self.Session,
            )
            self.assertTrue(cacheable)
            self.assertEqual(cached["description"], "可缓存题面")
            self.assertEqual(cached["source"], "database")

            failed, cacheable = await resolve_problem_detail(
                "luogu", "P9877",
                fetchers={"luogu": AsyncMock(return_value={"error": "offline"})},
                session_factory=self.Session,
            )
            self.assertFalse(cacheable)
            self.assertIn("error", failed)
            with self.Session() as session:
                self.assertEqual(session.scalar(func.count(ProblemDetailCache.id)), 1)

    async def test_nowcoder_without_cookie_short_circuits_before_fetch(self):
        fetch = AsyncMock(return_value={"description": "should not happen"})
        with patch.dict("os.environ", {}, clear=True), \
             patch("problem_detail_service.get_local_problem_detail", return_value=None), \
             patch("problem_detail_service.find_catalog_problem", return_value=None):
            detail, cacheable = await resolve_problem_detail(
                "nowcoder", "999998", fetchers={"nowcoder": fetch}, session_factory=self.Session,
            )
        fetch.assert_not_awaited()
        self.assertFalse(cacheable)
        self.assertIn("NOWCODER_COOKIE", detail["error"])

    def test_cache_models_include_media_key_and_schema_version(self):
        media_columns = {column.name for column in ProblemMediaCache.__table__.columns}
        detail_columns = {column.name for column in ProblemDetailCache.__table__.columns}
        self.assertTrue({"media_key", "manifest", "content"} <= media_columns)
        self.assertIn("schema_version", detail_columns)
        self.assertTrue(ProblemMediaCache.__table__.c.media_key.unique)

    async def test_local_detail_precedes_live_fetch(self):
        identity = resolve_problem_identity("nowcoder", "21878")
        local = normalize_problem_detail({"title": "本地题", "description": "本地描述"}, identity, "catalog")
        fetch = AsyncMock(return_value={"description": "网络描述"})
        with patch("problem_detail_service.get_local_problem_detail", return_value=local):
            detail, cacheable = await resolve_problem_detail("nowcoder", "21878", fetchers={"nowcoder": fetch})
        fetch.assert_not_awaited()
        self.assertEqual(detail["description"], "本地描述")
        self.assertTrue(cacheable)

    async def test_catalog_summary_explains_nowcoder_live_failure(self):
        summary = {"id": "nc-skill-21878", "title": "本地标题", "tags": ["数组"]}
        fetch = AsyncMock(return_value={"description": "", "error": "被牛客 WAF 拦截"})
        with patch("problem_detail_service.get_local_problem_detail", return_value=None), \
             patch("problem_detail_service.find_catalog_problem", return_value=summary):
            detail, cacheable = await resolve_problem_detail("nowcoder", "21878", fetchers={"nowcoder": fetch})
        self.assertEqual(detail["source"], "catalog_summary")
        self.assertEqual(detail["title"], "本地标题")
        self.assertIn("NOWCODER_COOKIE", detail["description"])
        self.assertNotIn("error", detail)
        self.assertEqual(detail["warning"], "被牛客 WAF 拦截")
        self.assertFalse(cacheable)

    async def test_nowcoder_fetch_rebuilds_trusted_canonical_url(self):
        response = unittest.mock.MagicMock()
        response.text = '<div class="terminal-topic"><div class="subject-des">描述</div></div>'
        response.raise_for_status.return_value = None
        client = AsyncMock()
        client.get.return_value = response
        context = unittest.mock.MagicMock()
        context.__aenter__ = AsyncMock(return_value=client)
        context.__aexit__ = AsyncMock(return_value=None)
        with patch("httpx.AsyncClient", return_value=context):
            detail = await code_execution._fetch_nowcoder_detail("nowcoder-21878")
        called_url = client.get.await_args.args[0]
        self.assertEqual(called_url, "https://ac.nowcoder.com/acm/problem/21878")
        self.assertEqual(detail["description"], "描述")

    async def test_nowcoder_detail_reports_partial_when_safely_bounded(self):
        with patch.object(code_execution, "_NOWCODER_DETAIL_FIELD_BYTES", 8), \
             patch.object(code_execution, "_NOWCODER_DETAIL_TOTAL_BYTES", 32):
            detail = code_execution._bound_nowcoder_detail({
                "description": "一段超过限制的牛客题面",
                "samples": [{"input": "1", "output": "2"}],
            })
        self.assertEqual(detail["detail_status"], "partial")
        self.assertIn("warning", detail)
        self.assertEqual(detail["samples"], [{"input": "1", "output": "2"}])

    async def test_partial_nowcoder_detail_is_visible_but_retried(self):
        fetch = AsyncMock(return_value={
            "description": "部分题面",
            "detail_status": "partial",
            "warning": "题面过长",
        })
        with patch("problem_detail_service.get_local_problem_detail", return_value=None):
            for _ in range(2):
                detail, cacheable = await resolve_problem_detail(
                    "nowcoder", "999997", fetchers={"nowcoder": fetch}, session_factory=self.Session,
                )
                self.assertEqual(detail["warning"], "题面过长")
                self.assertEqual(detail["detail_status"], "partial")
                self.assertFalse(cacheable)
        self.assertEqual(fetch.await_count, 2)
        with self.Session() as session:
            self.assertEqual(session.scalar(func.count(ProblemDetailCache.id)), 0)

    async def test_nowcoder_unrecognized_page_is_not_persisted(self):
        response = MagicMock()
        response.text = "<html><body>please sign in</body></html>"
        response.raise_for_status.return_value = None
        client = AsyncMock()
        client.get.return_value = response
        context = MagicMock()
        context.__aenter__ = AsyncMock(return_value=client)
        context.__aexit__ = AsyncMock(return_value=None)
        with patch("httpx.AsyncClient", return_value=context):
            live = await code_execution._fetch_nowcoder_detail("21878")
        self.assertIn("error", live)
        self.assertEqual(live["description"], "")

        fetch = AsyncMock(return_value=live)
        with patch("problem_detail_service.get_local_problem_detail", return_value=None), \
             patch("problem_detail_service.find_catalog_problem", return_value=None):
            for _ in range(2):
                detail, cacheable = await resolve_problem_detail(
                    "nowcoder", "21878", fetchers={"nowcoder": fetch},
                    session_factory=self.Session,
                )
                self.assertFalse(cacheable)
                self.assertIn("error", detail)
        self.assertEqual(fetch.await_count, 2)
        with self.Session() as session:
            self.assertEqual(session.scalar(func.count(ProblemDetailCache.id)), 0)

    async def test_structured_fields_are_complete_and_cacheable(self):
        fetch = AsyncMock(return_value={"input_description": "n", "output_description": "answer"})
        detail, cacheable = await resolve_problem_detail("luogu", "P1001", fetchers={"luogu": fetch})
        self.assertEqual(detail["input_description"], "n")
        self.assertTrue(cacheable)

    async def test_luogu_http_empty_and_network_errors_are_not_cached(self):
        for response_value, side_effect in (
            (MagicMock(status_code=503), None),
            (MagicMock(status_code=200, json=MagicMock(return_value={"currentData": {"problem": None}})), None),
            (None, RuntimeError("offline")),
        ):
            if response_value is not None:
                response_value.json = getattr(response_value, "json", MagicMock(return_value={}))
            client = AsyncMock()
            client.get.return_value = response_value
            client.get.side_effect = side_effect
            context = MagicMock()
            context.__aenter__ = AsyncMock(return_value=client)
            context.__aexit__ = AsyncMock(return_value=None)
            with patch("httpx.AsyncClient", return_value=context):
                detail = await code_execution._fetch_luogu_detail("P1001")
            self.assertIn("error", detail)
            normalized, cacheable = await resolve_problem_detail("luogu", "P1001", fetchers={"luogu": AsyncMock(return_value=detail)})
            self.assertIn("error", normalized)
            self.assertFalse(cacheable)

    async def test_leetcode_graphql_null_and_errors_are_structured(self):
        for payload in (
            {"data": {"question": None}},
            {"errors": [{"message": "denied"}], "data": None},
        ):
            response = MagicMock()
            response.raise_for_status.return_value = None
            response.json.return_value = payload
            client = AsyncMock()
            client.post.return_value = response
            context = MagicMock()
            context.__aenter__ = AsyncMock(return_value=client)
            context.__aexit__ = AsyncMock(return_value=None)
            with patch("httpx.AsyncClient", return_value=context):
                detail = await code_execution._fetch_leetcode_detail("two-sum")
            self.assertIn("error", detail)
            self.assertEqual(detail["samples"], [])

    async def test_leetcode_list_graphql_null_is_route_error(self):
        response = MagicMock()
        response.raise_for_status.return_value = None
        response.json.return_value = {"data": {"problemsetQuestionList": None}}
        client = AsyncMock()
        client.post.return_value = response
        context = MagicMock()
        context.__aenter__ = AsyncMock(return_value=client)
        context.__aexit__ = AsyncMock(return_value=None)
        with patch("httpx.AsyncClient", return_value=context):
            result = await scrape.scrape_leetcode(difficulty="", keyword="", skip=0, limit=20)
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["platform"], "leetcode")
        self.assertEqual(result["resources"], [])


if __name__ == "__main__":
    unittest.main()
