"""
资源爬取路由 — 从洛谷/力扣/牛客爬取算法竞赛题目资源
通过后端代理绕过浏览器 CORS 限制，返回标准化资源列表
爬取失败时自动回退到本地内置题库（108道经典算法题）
"""
import asyncio
import re

import httpx
from bs4 import BeautifulSoup, NavigableString
from fastapi import APIRouter, Query

from nowcoder_http import build_nowcoder_headers
from problem_catalog import get_nowcoder_categories, normalize_samples, search_nowcoder_catalog
from problem_identity import normalize_resource_identity, resolve_problem_identity
from .problem_bank import (
    LUOGU_PROBLEMS, LEETCODE_PROBLEMS, NOWCODER_PROBLEMS,
    PLATFORM_ICONS, PLATFORM_NAMES,
)

router = APIRouter(prefix="/api/resources/scrape", tags=["scrape"])

COMMON_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}

BROWSER_HEADERS = {
    **COMMON_HEADERS,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Referer": "https://www.luogu.com.cn/",
    "Origin": "https://www.luogu.com.cn",
}

LEETCODE_HEADERS = {
    **COMMON_HEADERS,
    "Referer": "https://leetcode.cn/",
    "Origin": "https://leetcode.cn",
    "Content-Type": "application/json",
}

# ===== 难度映射 =====

LUOGU_DIFFICULTY_MAP = {
    1: "入门", 2: "普及-", 3: "普及/提高-",
    4: "普及+/提高", 5: "提高+/省选-", 6: "省选/NOI-", 7: "NOI/NOI+/CTSC",
}

LEETCODE_DIFFICULTY_MAP = {
    "EASY": "简单", "MEDIUM": "中等", "HARD": "困难",
}


# ===== 洛谷 =====

@router.get("/luogu")
async def scrape_luogu(
    keyword: str = Query("", description="搜索关键词（如：动态规划、图论）"),
    difficulty: int = Query(0, ge=0, le=7, description="难度筛选 0=全部 1-7"),
    page: int = Query(1, ge=1, le=10),
    limit: int = Query(20, ge=1, le=50),
):
    """
    从洛谷爬取题目列表
    洛谷 API: https://www.luogu.com.cn/problem/list?_contentOnly=1
    """
    headers = {**COMMON_HEADERS, "x-luogu-type": "content-only"}

    # 构建搜索参数
    params = {
        "_contentOnly": "1",
        "page": str(page),
    }
    if keyword:
        params["keyword"] = keyword
    if difficulty > 0:
        params["difficulty"] = str(difficulty)

    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(
                "https://www.luogu.com.cn/problem/list",
                params=params,
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as e:
        return {"status": "error", "platform": "luogu", "message": f"洛谷请求失败: {str(e)[:200]}"}
    except Exception as e:
        return {"status": "error", "platform": "luogu", "message": f"解析失败: {str(e)[:200]}"}

    problems = data.get("currentData", {}).get("problems", {}).get("result", [])
    total = data.get("currentData", {}).get("problems", {}).get("count", 0)

    resources = []
    for p in problems[:limit]:
        diff = LUOGU_DIFFICULTY_MAP.get(p.get("difficulty"), "未知")
        tags = p.get("tags", []) or []
        identity = resolve_problem_identity("luogu", str(p.get("pid", "")))
        resources.append({
            "id": identity.canonical_id,
            "pid": identity.native_id,
            "native_id": identity.native_id,
            "title": p.get("title", "未知题目"),
            "platform": "luogu",
            "platform_name": "洛谷",
            "platform_icon": "🏔️",
            "difficulty": diff,
            "tags": tags,
            "url": identity.canonical_url,
            "accepted": p.get("acceptedCount", 0),
            "submitted": p.get("submitCount", 0),
            "ac_rate": round(
                p.get("acceptedCount", 0) / max(p.get("submitCount", 1), 1) * 100, 1
            ) if p.get("submitCount") else None,
        })

    return {
        "status": "ok",
        "platform": "luogu",
        "total": total,
        "page": page,
        "resources": resources,
    }


# ===== 力扣 =====

LEETCODE_GRAPHQL_URL = "https://leetcode.cn/graphql/"

PROBLEMSET_QUERY = """
query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
  problemsetQuestionList: questionList(
    categorySlug: $categorySlug
    limit: $limit
    skip: $skip
    filters: $filters
  ) {
    total: totalNum
    questions: data {
      acRate
      difficulty
      title
      titleCn
      titleSlug
      topicTags {
        name
        nameTranslated
        slug
      }
    }
  }
}
"""


@router.get("/leetcode")
async def scrape_leetcode(
    difficulty: str = Query("", description="难度筛选: EASY/MEDIUM/HARD，留空=全部"),
    keyword: str = Query("", description="搜索标签关键词"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
):
    """
    从力扣中国站爬取题目列表
    使用 GraphQL API: https://leetcode.cn/graphql/
    """
    filters = {}
    if difficulty:
        filters["difficulty"] = difficulty.upper()
    if keyword:
        filters["tags"] = [keyword]

    variables = {
        "categorySlug": "",
        "skip": skip,
        "limit": limit,
        "filters": filters,
    }

    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.post(
                LEETCODE_GRAPHQL_URL,
                json={"query": PROBLEMSET_QUERY, "variables": variables},
                headers=LEETCODE_HEADERS,
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as e:
        return {"status": "error", "platform": "leetcode", "message": f"力扣请求失败: {str(e)[:200]}"}
    except Exception as e:
        return {"status": "error", "platform": "leetcode", "message": f"解析失败: {str(e)[:200]}"}

    if not isinstance(data, dict):
        return {"status": "error", "platform": "leetcode", "message": "力扣 GraphQL 返回无效数据", "total": 0, "skip": skip, "resources": []}
    if data.get("errors"):
        errors = data["errors"] if isinstance(data["errors"], list) else []
        messages = [str(error.get("message", "")) for error in errors if isinstance(error, dict)]
        message = "; ".join(filter(None, messages)) or "未知 GraphQL 错误"
        return {"status": "error", "platform": "leetcode", "message": f"力扣 GraphQL 错误: {message[:200]}", "total": 0, "skip": skip, "resources": []}
    payload = data.get("data")
    qlist = payload.get("problemsetQuestionList") if isinstance(payload, dict) else None
    if not isinstance(qlist, dict):
        return {"status": "error", "platform": "leetcode", "message": "力扣 GraphQL 未返回题目列表", "total": 0, "skip": skip, "resources": []}
    questions = qlist.get("questions") if isinstance(qlist.get("questions"), list) else []
    total = qlist.get("total", 0)

    resources = []
    for q in questions:
        diff_key = q.get("difficulty", "EASY")
        tags = [
            t.get("nameTranslated") or t.get("name", "")
            for t in (q.get("topicTags") or [])
        ]
        identity = resolve_problem_identity("leetcode", str(q.get("titleSlug", "")))
        resources.append({
            "id": identity.canonical_id,
            "pid": identity.native_id,
            "native_id": identity.native_id,
            "title": q.get("titleCn") or q.get("title", "未知题目"),
            "platform": "leetcode",
            "platform_name": "力扣",
            "platform_icon": "💻",
            "difficulty": LEETCODE_DIFFICULTY_MAP.get(diff_key, diff_key),
            "tags": tags,
            "url": identity.canonical_url,
            "ac_rate": round(q.get("acRate", 0), 1),
            "accepted": None,
            "submitted": None,
        })

    return {
        "status": "ok",
        "platform": "leetcode",
        "total": total,
        "skip": skip,
        "resources": resources,
    }


# ===== 牛客（HTML 解析） =====

NOWCODER_LIST_URL = "https://ac.nowcoder.com/acm/problem/list"
NOWCODER_DETAIL_URL = "https://ac.nowcoder.com/acm/problem/{pid}"

# 难度标签 → 文本映射（牛客列表页 td 中的文本）
NOWCODER_DIFF_MAP = {
    "入门": "入门", "简单": "简单", "中等": "中等", "较难": "困难", "困难": "困难",
    "1": "简单", "2": "中等", "3": "困难",
}


def _is_nowcoder_waf(html: str) -> bool:
    lowered = html[:2000].lower()
    return "aliyun_waf" in lowered or "aliyun waf" in lowered


def _clean_text(node, preserve_boundary_whitespace: bool = False) -> str:
    """Extract readable text without flattening nested ``pre``/``br`` content."""
    if not node:
        return ""
    if getattr(node, "name", None) == "pre":
        text = node.get_text("\n", strip=False)
    else:
        text = node.get_text("\n", strip=not preserve_boundary_whitespace)
    text = str(text).replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text if preserve_boundary_whitespace else text.strip()


def _build_nowcoder_headers():
    """Compatibility wrapper around the shared Nowcoder request headers."""
    return build_nowcoder_headers()


def _parse_nowcoder_list(html: str) -> list[dict]:
    """Parse data-bearing Nowcoder rows without depending on table headers."""
    if _is_nowcoder_waf(html):
        return []
    soup = BeautifulSoup(html, "html.parser")
    rows = soup.select("tr[data-problemid]")
    problems = []
    for row in rows:
        pid = str(row.get("data-problemid", "")).strip()
        if not pid.isdigit():
            continue

        cells = row.find_all("td", recursive=False)
        title_link = row.select_one("a.title, a[href*='/acm/problem/']")
        if not title_link and len(cells) > 1:
            title_link = cells[1].find("a")
        title = title_link.get_text(" ", strip=True) if title_link else ""
        if not title and len(cells) > 1:
            title = cells[1].get_text(" ", strip=True)

        tags = list(dict.fromkeys(
            anchor.get_text(" ", strip=True)
            for anchor in row.select("a.tag-label, a.js-tag")
            if anchor.get_text(" ", strip=True)
        ))

        difficulty_node = row.select_one("[data-difficulty], .difficulty, .level-label")
        raw_diff = ""
        if difficulty_node:
            raw_diff = str(difficulty_node.get("data-difficulty", "") or difficulty_node.get_text(" ", strip=True))
        if not raw_diff:
            raw_diff = next((
                cell.get_text(" ", strip=True)
                for cell in cells
                if cell.get_text(" ", strip=True) in NOWCODER_DIFF_MAP
            ), "")
        difficulty = NOWCODER_DIFF_MAP.get(raw_diff, raw_diff)

        accepted = None
        pass_node = row.select_one("[data-pass-count], .pass-count")
        if pass_node:
            raw_count = str(pass_node.get("data-pass-count", "") or pass_node.get_text(" ", strip=True))
            match = re.search(r"\d+", raw_count.replace(",", ""))
            accepted = int(match.group()) if match else None
        elif len(cells) >= 4:
            raw_count = cells[-2].get_text(" ", strip=True).replace(",", "")
            accepted = int(raw_count) if raw_count.isdigit() else None

        problems.append({
            "id": pid,
            "title": title,
            "difficulty": difficulty,
            "tags": tags,
            "accepted": accepted,
        })
    return problems


_NOWCODER_HEADING_TAGS = ("h1", "h2", "h3", "h4", "h5", "strong", "div")
_NOWCODER_SECTION_LABELS = {
    "description": ("题目描述", "描述"),
    "input_description": ("输入描述", "输入格式"),
    "output_description": ("输出描述", "输出格式"),
    "notes": ("备注", "说明"),
    "hints": ("提示", "Hint", "Hints"),
    "constraints": ("数据范围", "数据范围及提示", "约束", "限制"),
    "sample_input": ("样例输入", "样例输入1", "示例输入", "输入样例"),
    "sample_output": ("样例输出", "样例输出1", "示例输出", "输出样例"),
}


def _normalize_heading(text: str) -> str:
    return re.sub(r"[\s：:]+$", "", text.strip())


def _heading_key(node) -> str | None:
    text = _normalize_heading(node.get_text(" ", strip=True))
    for key, labels in _NOWCODER_SECTION_LABELS.items():
        if text in labels:
            return key
        if key in {"sample_input", "sample_output"} and any(
            re.fullmatch(re.escape(label) + r"\s*\d+", text) for label in labels
        ):
            return key
    return None


def _section_content(heading) -> str:
    """Collect meaningful sibling text until the next recognized heading."""
    parts = []
    for sibling in heading.next_siblings:
        if isinstance(sibling, NavigableString):
            text = str(sibling).strip()
        else:
            if sibling.name in _NOWCODER_HEADING_TAGS and _heading_key(sibling):
                break
            text = _clean_text(sibling)
        if text:
            parts.append(text)
    return "\n".join(parts).strip()


def _heading_sections(root) -> list[tuple[str, str]]:
    sections = []
    for heading in root.find_all(_NOWCODER_HEADING_TAGS):
        key = _heading_key(heading)
        if key and not any(_heading_key(parent) for parent in heading.parents if parent is not root):
            content = _section_content(heading)
            if content:
                sections.append((key, content))
    return sections


def _numbered_heading_samples(root) -> list[dict]:
    """Pair numbered sample headings without shifting when one half is absent."""
    indexed: dict[int, dict] = {}
    found_numbered = False
    for heading in root.find_all(_NOWCODER_HEADING_TAGS):
        key = _heading_key(heading)
        if key not in {"sample_input", "sample_output"}:
            continue
        match = re.search(r"(\d+)\s*$", _normalize_heading(heading.get_text(" ", strip=True)))
        if not match:
            continue
        found_numbered = True
        sample = indexed.setdefault(int(match.group(1)), {"input": "", "output": ""})
        sample["input" if key == "sample_input" else "output"] = _section_content(heading)
    if not found_numbered:
        return []
    return [indexed[index] for index in sorted(indexed)]


def _ordered_node_samples(root) -> list[dict]:
    """Pair class-based samples in DOM order so a missing half does not shift later pairs."""
    samples = []
    for node in root.select(
        ".sample-input, .input-data, [data-role='sample-input'], "
        ".sample-output, .output-data, [data-role='sample-output']"
    ):
        classes = set(node.get("class", []))
        role = str(node.get("data-role", ""))
        is_input = bool(classes & {"sample-input", "input-data"}) or role == "sample-input"
        value = _clean_text(node, preserve_boundary_whitespace=True)
        if is_input:
            samples.append({"input": value, "output": ""})
            continue
        target = next((sample for sample in reversed(samples) if not sample["output"]), None)
        if target is None:
            samples.append({"input": "", "output": value})
        else:
            target["output"] = value
    return samples


def _preserve_statement_images(root) -> list[dict]:
    """Record image positions without downloading or accepting arbitrary attributes."""
    images = []
    for ordinal, image in enumerate(root.find_all("img")):
        source = str(image.get("src") or image.get("data-src") or "").strip()
        if not source:
            continue
        section = "description"
        previous = image.find_previous(_NOWCODER_HEADING_TAGS)
        if previous:
            section = _heading_key(previous) or section
        alt = str(image.get("alt") or "").replace("]", "").strip()
        images.append({
            "source_url": source,
            "alt": alt,
            "field": section,
            "ordinal": ordinal,
        })
        # Keep the diagram at its original statement position. The media service
        # later rewrites this source to an opaque same-origin cache URL.
        image.replace_with(f"\n![{alt}](<{source}>)\n")
    return images


def _parse_nowcoder_detail(html: str) -> dict:
    """Parse statement sections, limits, samples, counters, and image locations."""
    if _is_nowcoder_waf(html):
        return {"waf_blocked": True}
    soup = BeautifulSoup(html, "html.parser")
    root = soup.select_one(".terminal-topic, .subject-item-wrap") or soup
    detail: dict = {}
    images = _preserve_statement_images(root)
    if images:
        detail["media"] = images

    title_node = root.select_one("h1.subject-title, .subject-title, .topic-title")
    if not title_node:
        title_node = next((node for node in root.find_all("h1") if not _heading_key(node)), None)
    if title_node:
        detail["title"] = title_node.get_text(" ", strip=True)

    sections = _heading_sections(root)
    section_values: dict[str, list[str]] = {}
    for key, content in sections:
        section_values.setdefault(key, []).append(content)

    description_node = root.select_one(
        ".subject-des, .topic-des, .question-content, [data-role='description']"
    )
    description = _clean_text(description_node) or "\n".join(section_values.get("description", []))
    if description:
        detail["description"] = description
    for key in ("input_description", "output_description", "notes", "constraints"):
        values = section_values.get(key, [])
        if values:
            detail[key] = "\n".join(values)
    hints = section_values.get("hints", [])
    if hints:
        detail["hints"] = hints

    for span in root.find_all(["span", "li", "div"]):
        text = span.get_text(" ", strip=True)
        if text.startswith("时间限制"):
            detail["time_limit"] = re.sub(r"^时间限制\s*[：:]?\s*", "", text).strip()
        elif text.startswith("空间限制"):
            detail["space_limit"] = re.sub(r"^空间限制\s*[：:]?\s*", "", text).strip()

    node_samples = _ordered_node_samples(root)
    numbered_samples = _numbered_heading_samples(root)
    if node_samples:
        raw_samples = node_samples
    elif numbered_samples:
        raw_samples = numbered_samples
    else:
        sample_inputs = section_values.get("sample_input", [])
        sample_outputs = section_values.get("sample_output", [])
        sample_count = max(len(sample_inputs), len(sample_outputs))
        raw_samples = [
            {
                "input": sample_inputs[index] if index < len(sample_inputs) else "",
                "output": sample_outputs[index] if index < len(sample_outputs) else "",
            }
            for index in range(sample_count)
        ]
    samples = normalize_samples(raw_samples)
    if samples:
        detail["samples"] = samples

    text = root.get_text(" ", strip=True).replace(",", "")
    accepted_match = re.search(r"(?:通过人数|通过数|通过)\s*[：:]?\s*(\d+)", text)
    submitted_match = re.search(r"(?:提交人数|提交数|提交)\s*[：:]?\s*(\d+)", text)
    if accepted_match:
        detail["accepted"] = int(accepted_match.group(1))
    if submitted_match:
        detail["submitted"] = int(submitted_match.group(1))
    if detail.get("submitted"):
        detail["ac_rate"] = round(detail.get("accepted", 0) / detail["submitted"] * 100, 1)
    return detail


async def _scrape_nowcoder_list_page(keyword: str, difficulty: int, page: int, page_size: int) -> tuple[list[dict], int]:
    """爬取一页牛客列表，返回 (题目列表, 是否有更多页)"""
    headers = _build_nowcoder_headers()

    params = {
        "keyword": keyword,
        "difficulty": str(difficulty) if difficulty > 0 else "0",
        "status": "all",
        "order": "id",
        "asc": "true",
        "pageSize": str(page_size),
        "page": str(page),
    }

    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        resp = await client.get(NOWCODER_LIST_URL, params=params, headers=headers)
        resp.raise_for_status()
        html = resp.text

    problems = _parse_nowcoder_list(html)

    if not problems:
        if _is_nowcoder_waf(html):
            raise RuntimeError("被牛客实时访问限制拦截；本地题库仍可使用，实时访问可选配置 NOWCODER_COOKIE")
        return [], False

    # 判断是否有下一页：当前页满且 HTML 中有分页器
    has_more = len(problems) >= page_size

    return problems, has_more


async def _fetch_nowcoder_enrichment(pid: str) -> dict:
    """Fetch one detail page; callers intentionally tolerate an empty result."""
    identity = resolve_problem_identity("nowcoder", pid)
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        response = await client.get(identity.canonical_url, headers=_build_nowcoder_headers())
        response.raise_for_status()
    detail = _parse_nowcoder_detail(response.text)
    return {} if detail.get("waf_blocked") else detail


async def _enrich_nowcoder_problems(problems: list[dict]) -> list[dict]:
    """Optionally enrich a bounded result page without failing base results."""
    semaphore = asyncio.Semaphore(4)

    async def enrich(problem: dict) -> dict:
        merged = dict(problem)
        async with semaphore:
            try:
                detail = await _fetch_nowcoder_enrichment(problem["id"])
            except Exception:
                return merged
        for key in ("title", "accepted", "submitted", "ac_rate", "time_limit", "space_limit"):
            if detail.get(key) not in (None, ""):
                merged[key] = detail[key]
        return merged

    return list(await asyncio.gather(*(enrich(problem) for problem in problems)))


@router.get("/nowcoder")
async def scrape_nowcoder(
    keyword: str = Query("", description="搜索关键词"),
    difficulty: int = Query(0, ge=0, le=3, description="难度 0=全部 1=简单 2=中等 3=困难"),
    page: int = Query(1, ge=1, le=10),
    limit: int = Query(20, ge=1, le=50),
    enrich: bool = Query(False, description="是否补充详情元数据（会增加网络请求）"),
):
    """
    从牛客竞赛爬取题目列表。
    使用 BS4 解析列表页 HTML（参考 CSDN 博客方法）。

    牛客可能限制实时请求；内置题库无需凭据，实时访问可选通过
    后端环境变量 NOWCODER_COOKIE 配置。
    """
    try:
        problems, _ = await _scrape_nowcoder_list_page(keyword, difficulty, page, limit)
        if not problems:
            return {
                "status": "empty",
                "platform": "nowcoder",
                "message": "未找到题目；本地题库仍可使用，实时访问可选配置 NOWCODER_COOKIE",
                "total": 0,
                "page": page,
                "resources": [],
            }
    except RuntimeError as e:
        # Cookie 缺失导致 WAF 拦截
        return {
            "status": "waf_blocked",
            "platform": "nowcoder",
            "message": str(e),
            "total": 0,
            "page": page,
            "resources": [],
        }
    except httpx.HTTPError as e:
        return {"status": "error", "platform": "nowcoder", "message": f"请求失败: {str(e)[:200]}", "total": 0, "page": page, "resources": []}
    except Exception as e:
        return {"status": "error", "platform": "nowcoder", "message": f"解析失败: {str(e)[:200]}", "total": 0, "page": page, "resources": []}

    if enrich:
        problems = await _enrich_nowcoder_problems(problems[:limit])

    resources = []
    for p in problems[:limit]:
        identity = resolve_problem_identity("nowcoder", p["id"])
        resources.append({
            "id": identity.canonical_id,
            "pid": identity.native_id,
            "native_id": identity.native_id,
            "canonical_id": identity.canonical_id,
            "title": p["title"],
            "platform": "nowcoder",
            "platform_name": "牛客竞赛",
            "platform_icon": "🐮",
            "difficulty": p["difficulty"],
            "tags": p["tags"],
            "url": identity.canonical_url,
            "accepted": p.get("accepted"),
            "submitted": p.get("submitted"),
            "ac_rate": p.get("ac_rate"),
            **({"time_limit": p["time_limit"]} if p.get("time_limit") else {}),
            **({"space_limit": p["space_limit"]} if p.get("space_limit") else {}),
        })

    return {
        "status": "ok",
        "platform": "nowcoder",
        "total": len(resources),
        "page": page,
        "source": "live",
        "resources": resources,
    }


# ===== 本地题库（爬取失败时的回退方案） =====

def _filter_bank(problems: list, keyword: str = "", difficulty: str = "", tags: list = None) -> list:
    """筛选内置题库"""
    result = problems
    if keyword:
        kw = keyword.lower()
        result = [p for p in result if
                  kw in p["title"].lower() or
                  any(kw in t.lower() for t in p.get("tags", []))]
    if difficulty:
        result = [p for p in result if p["difficulty"] == difficulty
                  or difficulty.lower() in p["difficulty"].lower()]
    if tags:
        result = [p for p in result if
                  any(any(t.lower() in pt.lower() for pt in p.get("tags", [])) for t in tags)]
    return result


def _bank_response(problems: list, platform: str, keyword: str = "", difficulty: str = "", page: int = 1, limit: int = 20):
    """将内置题库包装为标准响应"""
    filtered = _filter_bank(problems, keyword, difficulty)
    total = len(filtered)
    start = (page - 1) * limit
    paged = filtered[start:start + limit]

    resources = []
    for p in paged:
        try:
            normalized = normalize_resource_identity(p, platform)
        except ValueError:
            normalized = p
        resource = {
            "id": normalized["id"],
            "title": p["title"],
            "platform": platform,
            "platform_name": PLATFORM_NAMES.get(platform, platform),
            "platform_icon": PLATFORM_ICONS.get(platform, ""),
            "difficulty": p["difficulty"],
            "tags": p.get("tags", []),
            "url": normalized["url"],
            "accepted": None,
            "submitted": None,
            "ac_rate": None,
        }
        for key in ("pid", "native_id", "canonical_id"):
            if normalized.get(key):
                resource[key] = normalized[key]
        resources.append(resource)

    return {
        "status": "ok",
        "platform": platform,
        "source": "local_bank",
        "total": total,
        "page": page,
        "resources": resources,
    }


@router.get("/bank/luogu")
async def bank_luogu(
    keyword: str = Query(""),
    difficulty: str = Query(""),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """直接从内置题库加载洛谷题目（离线可用）"""
    return _bank_response(LUOGU_PROBLEMS, "luogu", keyword, difficulty, page, limit)


@router.get("/bank/leetcode")
async def bank_leetcode(
    keyword: str = Query(""),
    difficulty: str = Query(""),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """直接从内置题库加载力扣题目（离线可用）"""
    return _bank_response(LEETCODE_PROBLEMS, "leetcode", keyword, difficulty, page, limit)


@router.get("/bank/nowcoder")
async def bank_nowcoder(
    keyword: str = Query(""),
    difficulty: str = Query(""),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    tag_id: str = Query("", description="稳定的牛客技能分类 ID"),
):
    """直接从内置题库加载牛客题目（离线可用）。"""
    if not tag_id:
        return _bank_response(NOWCODER_PROBLEMS, "nowcoder", keyword, difficulty, page, limit)

    catalog_items, _ = search_nowcoder_catalog(keyword=keyword, tag_id=tag_id, page=1, limit=10000)
    if not catalog_items:
        return _bank_response([], "nowcoder", "", difficulty, page, limit)
    compatible_items = []
    difficulty_by_pid = {}
    for item in NOWCODER_PROBLEMS:
        try:
            pid = normalize_resource_identity(item, "nowcoder")["pid"]
            difficulty_by_pid[pid] = item.get("difficulty", "")
        except ValueError:
            continue
    for item in catalog_items:
        compatible_items.append({
            **item,
            "difficulty": difficulty_by_pid.get(item["pid"], ""),
            "tags": item.get("tags", []),
        })
    return _bank_response(compatible_items, "nowcoder", "", difficulty, page, limit)


@router.get("/catalog/nowcoder")
async def catalog_nowcoder(
    keyword: str = Query(""),
    tag_id: str = Query(""),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """Expose the generated Nowcoder catalog with stable category filtering."""
    items, total = search_nowcoder_catalog(keyword, tag_id, page, limit)
    resources = []
    for item in items:
        resources.append({
            "id": item["id"],
            "pid": item["pid"],
            "native_id": item["native_id"],
            "title": item.get("title", ""),
            "platform": "nowcoder",
            "platform_name": PLATFORM_NAMES["nowcoder"],
            "platform_icon": PLATFORM_ICONS["nowcoder"],
            "difficulty": "",
            "tags": item.get("tags", []),
            "url": item["url"],
            "accepted": item.get("pass_count"),
            "submitted": None,
            "ac_rate": None,
            "tag_id": item.get("skill_tag_id", ""),
            "nc_id": item.get("nc_id", ""),
        })
    return {
        "status": "ok",
        "platform": "nowcoder",
        "source": "catalog",
        "total": total,
        "page": page,
        "resources": resources,
    }


@router.get("/catalog/nowcoder/categories")
async def catalog_nowcoder_categories():
    """List stable Nowcoder skill categories from the bundled catalog."""
    categories = get_nowcoder_categories()
    return {
        "status": "ok",
        "platform": "nowcoder",
        "source": "catalog",
        "total": len(categories),
        "categories": categories,
    }
