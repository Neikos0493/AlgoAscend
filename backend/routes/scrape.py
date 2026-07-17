"""
资源爬取路由 — 从洛谷/力扣/牛客爬取算法竞赛题目资源
通过后端代理绕过浏览器 CORS 限制，返回标准化资源列表
爬取失败时自动回退到本地内置题库（108道经典算法题）
"""
import os
import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, Query
from typing import Optional
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
        resources.append({
            "id": f"luogu-{p.get('pid', '')}",
            "title": p.get("title", "未知题目"),
            "platform": "luogu",
            "platform_name": "洛谷",
            "platform_icon": "🏔️",
            "difficulty": diff,
            "tags": tags,
            "url": f"https://www.luogu.com.cn/problem/{p.get('pid', '')}",
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

    qlist = data.get("data", {}).get("problemsetQuestionList", {})
    questions = qlist.get("questions", [])
    total = qlist.get("total", 0)

    resources = []
    for q in questions:
        diff_key = q.get("difficulty", "EASY")
        tags = [
            t.get("nameTranslated") or t.get("name", "")
            for t in (q.get("topicTags") or [])
        ]
        resources.append({
            "id": f"leetcode-{q.get('titleSlug', '')}",
            "title": q.get("titleCn") or q.get("title", "未知题目"),
            "platform": "leetcode",
            "platform_name": "力扣",
            "platform_icon": "💻",
            "difficulty": LEETCODE_DIFFICULTY_MAP.get(diff_key, diff_key),
            "tags": tags,
            "url": f"https://leetcode.cn/problems/{q.get('titleSlug', '')}/",
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


def _build_nowcoder_headers():
    """构建牛客请求头，优先使用环境变量中的 Cookie 绕过 WAF"""
    headers = {
        **COMMON_HEADERS,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Referer": "https://ac.nowcoder.com/",
        "Origin": "https://ac.nowcoder.com",
    }
    cookie = os.environ.get("NOWCODER_COOKIE", "")
    if cookie:
        headers["Cookie"] = cookie
    return headers


def _parse_nowcoder_list(html: str) -> list[dict]:
    """
    用 BeautifulSoup 解析牛客题目列表页 HTML。
    参考 https://blog.csdn.net/qq_45882682/article/details/122697529

    列表页结构：<table class="no-border"> → <tr data-problemid="...">
      - 第 1 个 td: 题号
      - 第 2 个 td: 标题（含 <a> 链接）
      - 第 4 个 td: 难度文本（如"中等""简单"）
      - <a class="tag-label js-tag">: 知识点标签
    """
    soup = BeautifulSoup(html, "html.parser")

    # 检测 WAF 拦截
    if soup.find("meta", attrs={"name": "aliyun_waf_aa"}) is not None:
        return []  # 被 WAF 拦截，返回空让调用方回退

    table = soup.find("table", class_="no-border")
    if not table:
        return []

    problems = []
    for tr in table.find_all("tr")[1:]:  # 跳过表头
        pid = tr.get("data-problemid", "")
        if not pid:
            continue

        tds = tr.find_all("td")
        title = ""
        if len(tds) >= 2:
            link = tds[1].find("a")
            title = link.get_text(strip=True) if link else tds[1].get_text(strip=True)

        difficulty = ""
        if len(tds) >= 4:
            raw_diff = tds[3].get_text(strip=True)
            difficulty = NOWCODER_DIFF_MAP.get(raw_diff, raw_diff)

        tag_links = tr.find_all("a", class_=lambda c: c and "tag-label" in c)
        tags = [a.get_text(strip=True) for a in tag_links]

        problems.append({
            "id": pid,
            "title": title,
            "difficulty": difficulty,
            "tags": tags,
        })

    return problems


def _parse_nowcoder_detail(html: str) -> dict:
    """
    解析牛客题目详情页 HTML。
    提取时间/空间限制、通过数/提交数等元信息。
    """
    soup = BeautifulSoup(html, "html.parser")

    detail = {}
    main_content = soup.find("div", class_="terminal-topic")
    if main_content:
        # 题号 + 时间/空间限制
        subject_wrap = main_content.find("div", class_="subject-item-wrap")
        if subject_wrap:
            spans = subject_wrap.find_all("span")
            for span in spans:
                text = span.get_text(strip=True)
                if text.startswith("时间限制"):
                    detail["time_limit"] = text.replace("时间限制：", "").strip()
                elif text.startswith("空间限制"):
                    detail["space_limit"] = text.replace("空间限制：", "").strip()

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
        # 检查是否被 WAF 拦截
        if "aliyun_waf" in html[:500]:
            raise RuntimeError("被牛客 WAF 拦截（需要 Cookie）。请在 .env 中设置 NOWCODER_COOKIE")
        # 空结果
        return [], False

    # 判断是否有下一页：当前页满且 HTML 中有分页器
    has_more = len(problems) >= page_size

    return problems, has_more


@router.get("/nowcoder")
async def scrape_nowcoder(
    keyword: str = Query("", description="搜索关键词"),
    difficulty: int = Query(0, ge=0, le=3, description="难度 0=全部 1=简单 2=中等 3=困难"),
    page: int = Query(1, ge=1, le=10),
    limit: int = Query(20, ge=1, le=50),
):
    """
    从牛客竞赛爬取题目列表。
    使用 BS4 解析列表页 HTML（参考 CSDN 博客方法）。

    注意：牛客有阿里云 WAF 防护，无 Cookie 时会被拦截。
    解决方法：在 .env 中添加 NOWCODER_COOKIE=你的Cookie
    （登录牛客后从浏览器 DevTools → Network → 请求头复制）
    未配置时自动回退到本地题库。
    """
    try:
        problems, _ = await _scrape_nowcoder_list_page(keyword, difficulty, page, limit)
        if not problems:
            return {
                "status": "empty",
                "platform": "nowcoder",
                "message": "未找到题目（可能需要 Cookie）",
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
        return {"status": "error", "platform": "nowcoder", "message": f"请求失败: {str(e)[:200]}"}
    except Exception as e:
        return {"status": "error", "platform": "nowcoder", "message": f"解析失败: {str(e)[:200]}"}

    # 对每个题目尝试获取详情（可选，仅获取前几个以减少请求）
    # 列表页已经包含标题+难度+标签，足够展示
    resources = []
    for p in problems[:limit]:
        pid = p["id"]
        resources.append({
            "id": f"nowcoder-{pid}",
            "title": p["title"],
            "platform": "nowcoder",
            "platform_name": "牛客竞赛",
            "platform_icon": "🐮",
            "difficulty": p["difficulty"],
            "tags": p["tags"],
            "url": f"https://ac.nowcoder.com/acm/problem/{pid}",
            "accepted": None,
            "submitted": None,
            "ac_rate": None,
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
        resources.append({
            "id": p["id"],
            "title": p["title"],
            "platform": platform,
            "platform_name": PLATFORM_NAMES.get(platform, platform),
            "platform_icon": PLATFORM_ICONS.get(platform, ""),
            "difficulty": p["difficulty"],
            "tags": p.get("tags", []),
            "url": p["url"],
            "accepted": None,
            "submitted": None,
            "ac_rate": None,
        })

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
):
    """直接从内置题库加载牛客题目（离线可用）"""
    return _bank_response(NOWCODER_PROBLEMS, "nowcoder", keyword, difficulty, page, limit)
