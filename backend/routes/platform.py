"""
竞赛平台数据代理路由 — 绕过浏览器 CORS 限制
通过后端直接请求 Codeforces/AtCoder/洛谷/牛客 API
"""
import re
import json
import httpx
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/platform", tags=["platform"])


class FetchRequest(BaseModel):
    platform: str   # codeforces | atcoder | luogu
    handle: str


# ===== Codeforces =====

async def _fetch_codeforces(handle: str) -> dict:
    """Codeforces: https://codeforces.com/api/user.info?handles={handle}"""
    url = f"https://codeforces.com/api/user.info?handles={handle}"
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") != "OK":
            raise ValueError(data.get("comment", "Codeforces user not found"))
        user = data["result"][0]
        return {
            "rating": user.get("rating"),
            "maxRating": user.get("maxRating"),
            "rank": user.get("rank"),
            "problemsSolved": None,
            "contestsParticipated": None,
            "acceptanceRate": None,
            "streak": None,
            "extra": {
                "handle": user.get("handle", handle),
                "contribution": user.get("contribution", 0),
                "friendOfCount": user.get("friendOfCount", 0),
                "avatar": user.get("avatar", ""),
                "titlePhoto": user.get("titlePhoto", ""),
            },
        }


# ===== AtCoder =====

def _atcoder_rank(rating: int) -> str:
    if rating >= 2800: return "赤 (Red)"
    if rating >= 2400: return "橙 (Orange)"
    if rating >= 2000: return "黄 (Yellow)"
    if rating >= 1600: return "青 (Blue)"
    if rating >= 1200: return "水 (Cyan)"
    if rating >= 800:  return "绿 (Green)"
    if rating >= 400:  return "茶 (Brown)"
    return "灰 (Gray)"


async def _fetch_atcoder(handle: str) -> dict:
    """AtCoder: history/json + kenkoooo API"""
    rating = None
    max_rating = None
    contests = 0

    async with httpx.AsyncClient(timeout=15) as client:
        # 获取比赛历史(含rating)
        history_url = f"https://atcoder.jp/users/{handle}/history/json"
        try:
            resp = await client.get(history_url)
            if resp.status_code == 200:
                history = resp.json()
                contests = len(history)
                if history:
                    rating = history[-1].get("NewRating")
                    max_rating = max(h.get("NewRating", 0) for h in history)
        except Exception:
            pass  # 用户可能没有比赛记录

        # 获取 AC 数量（AtCoder Problems API）
        solved = None
        try:
            ac_url = f"https://kenkoooo.com/atcoder/atcoder-api/v3/user/ac_count?user={handle}"
            ac_resp = await client.get(ac_url)
            if ac_resp.status_code == 200:
                ac_data = ac_resp.json()
                solved = ac_data.get("count")
        except Exception:
            pass

    return {
        "rating": rating,
        "maxRating": max_rating,
        "rank": _atcoder_rank(rating) if rating else None,
        "problemsSolved": solved,
        "contestsParticipated": contests if contests > 0 else None,
        "acceptanceRate": None,
        "streak": None,
        "extra": {"handle": handle},
    }


# ===== 洛谷 =====

async def _fetch_luogu(handle: str) -> dict:
    """洛谷: 搜索 API → 用户数据 API（需要 UA 伪装）"""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 AlgoAscend/1.0",
        "x-luogu-type": "content-only",
    }

    async with httpx.AsyncClient(timeout=15) as client:
        # Step 1: 搜索用户获取 uid
        search_url = f"https://www.luogu.com.cn/api/user/search?keyword={handle}"
        resp = await client.get(search_url, headers=headers)
        resp.raise_for_status()
        search_data = resp.json()
        users = search_data.get("users") or []
        matched = next(
            (u for u in users if u.get("name", "").lower() == handle.lower() or str(u.get("uid")) == handle),
            None,
        )
        if not matched:
            raise ValueError(f"未找到洛谷用户: {handle}")
        uid = matched["uid"]

        # Step 2: 获取用户详细数据
        user_url = f"https://www.luogu.com.cn/user/{uid}?_contentOnly=1"
        resp = await client.get(user_url, headers=headers)
        resp.raise_for_status()
        user_data = resp.json()
        profile = user_data.get("currentData", {}).get("user") or {}

        submitted = profile.get("submittedProblemCount")
        passed = profile.get("passedProblemCount")

        acceptance = None
        if passed is not None and submitted is not None and submitted > 0:
            acceptance = round(passed / submitted * 100)

        return {
            "rating": profile.get("rating"),
            "maxRating": None,
            "rank": profile.get("color"),
            "problemsSolved": passed,
            "contestsParticipated": None,
            "acceptanceRate": acceptance,
            "streak": None,
            "extra": {
                "uid": uid,
                "name": matched.get("name", handle),
                "followerCount": profile.get("followerCount", 0),
                "followingCount": profile.get("followingCount", 0),
                "slogan": profile.get("slogan", ""),
                "blogAddress": profile.get("blogAddress", ""),
            },
        }


# ===== 牛客 =====

async def _fetch_nowcoder(uid: str) -> dict:
    """
    牛客竞赛: 解析个人主页 HTML 中的 __INITIAL_STATE__ JSON
    用户需提供 UID（数字ID），从个人主页 URL 获取：
    https://ac.nowcoder.com/acm/contest/profile/{uid}
    """
    uid = uid.strip()
    if not uid.isdigit():
        raise ValueError("牛客网请提供数字 UID（从个人主页 URL 中获取，如 https://ac.nowcoder.com/acm/contest/profile/123456）")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    }

    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        # Step 1: 获取个人主页，提取 __INITIAL_STATE__
        profile_url = f"https://ac.nowcoder.com/acm/contest/profile/{uid}"
        resp = await client.get(profile_url, headers=headers)
        resp.raise_for_status()
        html = resp.text

        init_state = _extract_init_state(html)
        if not init_state:
            raise ValueError("无法解析牛客网用户数据，页面可能已改版")

        # 从 __INITIAL_STATE__ 提取用户数据
        profile = init_state.get("profile") or init_state.get("userData") or init_state.get("userInfo") or {}
        rating_info = init_state.get("ratingData") or init_state.get("ratingInfo") or {}

        rating = rating_info.get("rating") or profile.get("rating")
        max_rating = rating_info.get("maxRating") or rating_info.get("max_rating") or profile.get("maxRating")

        # 做题统计
        solved = None
        submitted = None
        practice_info = init_state.get("practiceData") or init_state.get("userPracticeInfo") or {}
        if practice_info:
            solved = practice_info.get("acCount") or practice_info.get("solved") or practice_info.get("acceptedCount")
            submitted = practice_info.get("submitCount") or practice_info.get("totalCount")

        # Step 2: 尝试获取刷题记录页（可选，用于统计准确率）
        if solved is None or submitted is None:
            try:
                practice_url = f"https://ac.nowcoder.com/acm/contest/profile/{uid}/practice-coding"
                prac_resp = await client.get(practice_url, headers=headers)
                if prac_resp.status_code == 200:
                    prac_state = _extract_init_state(prac_resp.text)
                    if prac_state:
                        records = (
                            prac_state.get("records")
                            or prac_state.get("submissionList")
                            or prac_state.get("practiceList")
                            or []
                        )
                        if records:
                            solved = len([r for r in records if r.get("verdict") == "AC" or r.get("status") == 1])
                            submitted = len(records)
            except Exception:
                pass

        acceptance_rate = round(solved / max(submitted, 1) * 100) if solved is not None and submitted else None

        # 段位映射
        rank = None
        if rating:
            if rating >= 2200:
                rank = "王者"
            elif rating >= 2000:
                rank = "星耀"
            elif rating >= 1800:
                rank = "钻石"
            elif rating >= 1600:
                rank = "铂金"
            elif rating >= 1400:
                rank = "黄金"
            elif rating >= 1200:
                rank = "白银"
            else:
                rank = "青铜"

        return {
            "rating": rating,
            "maxRating": max_rating,
            "rank": rank,
            "problemsSolved": solved,
            "contestsParticipated": None,
            "acceptanceRate": acceptance_rate,
            "streak": None,
            "extra": {
                "uid": uid,
                "nickname": profile.get("nickname") or profile.get("name") or uid,
                "profileUrl": profile_url,
            },
        }


def _extract_init_state(html: str) -> dict | None:
    """从 HTML 中提取 window.__INITIAL_STATE__ 的 JSON 数据"""
    # 尝试多种正则模式
    patterns = [
        r"window\.__INITIAL_STATE__\s*=\s*({.*?});\s*(?:window\.|</script>)",
        r"window\.__INITIAL_STATE__\s*=\s*({.*?})\s*</script>",
        r"__INITIAL_STATE__\s*=\s*({.*?});",
        r"window\.__NUXT__\s*=\s*({.*?});",
    ]
    for pattern in patterns:
        match = re.search(pattern, html, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group(1))
                if isinstance(data, dict) and len(data) > 2:
                    return data
            except (json.JSONDecodeError, KeyError):
                continue
    return None


# ===== 统一入口 =====

FETCHERS = {
    "codeforces": _fetch_codeforces,
    "atcoder": _fetch_atcoder,
    "luogu": _fetch_luogu,
    "nowcoder": _fetch_nowcoder,
}


@router.post("/fetch")
async def fetch_platform_stats(req: FetchRequest):
    """
    通过后端代理拉取竞赛平台数据（绕过浏览器 CORS）
    
    支持平台：codeforces, atcoder, luogu, nowcoder
    """
    fetcher = FETCHERS.get(req.platform)
    if not fetcher:
        return {
            "status": "error",
            "message": f"不支持的平台: {req.platform}。仅支持 codeforces/atcoder/luogu/nowcoder",
        }

    try:
        stats = await fetcher(req.handle)
        return {
            "status": "ok",
            "platform": req.platform,
            "handle": req.handle,
            "stats": stats,
        }
    except httpx.HTTPStatusError as e:
        return {
            "status": "error",
            "message": f"API 请求失败 (HTTP {e.response.status_code})",
        }
    except httpx.TimeoutException:
        return {
            "status": "error",
            "message": "请求超时，请检查网络连接后重试",
        }
    except ValueError as e:
        return {
            "status": "error",
            "message": str(e),
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"拉取失败: {str(e)[:200]}",
        }
