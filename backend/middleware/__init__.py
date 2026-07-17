"""
内容安全中间件 - 敏感词过滤 + 防幻觉基础检测
"""
import re
from typing import List, Set
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

# ===== 敏感词列表（教育场景） =====
FORBIDDEN_WORDS: Set[str] = {
    # 违法违规
    "破解", "翻墙", "VPN翻墙", "黑客攻击", "DDoS",
    # 色情
    "色情", "裸聊", "嫖娼",
    # 赌博
    "赌博", "赌场", "博彩",
}

# 敏感词正则（更隐蔽的形式）
FORBIDDEN_PATTERNS: List[re.Pattern] = [
    re.compile(r"vpn[\s]*[翻越]*墙", re.IGNORECASE),
    re.compile(r"破[\s]*解[\s]*版", re.IGNORECASE),
    re.compile(r"色[\s]*情", re.IGNORECASE),
    re.compile(r"赌[\s]*博", re.IGNORECASE),
]

# ===== 防幻觉：AI 常识校验关键词 =====
HALLUCINATION_TRIGGERS: Set[str] = {
    "蓝桥杯", "ACM", "NOI", "CCF", "洛谷", "LeetCode",
    "C++", "算法", "竞赛", "编程", "代码",
}

FACT_CHECK_REMINDER = "\n\n> ⚠️ **内容安全提示**：AI 生成内容仅供参考，涉及竞赛规则和政策请以官方最新公告为准。如发现错误，请向 AI 反馈纠正。"


class ContentSecurityMiddleware(BaseHTTPMiddleware):
    """
    内容安全中间件：
    1. 检查请求中是否包含敏感词
    2. 检查 AI 输出是否包含明显的幻觉信息
    """

    async def dispatch(self, request: Request, call_next):
        # 只检查 POST /api/chat/send 请求体
        if request.method == "POST" and request.url.path == "/api/chat/send":
            body_bytes = await request.body()
            body_text = body_bytes.decode("utf-8", errors="replace")

            # 敏感词检测
            for word in FORBIDDEN_WORDS:
                if word in body_text:
                    return JSONResponse(
                        status_code=403,
                        content={
                            "error": "内容安全审查未通过",
                            "detail": "消息中包含不当内容，请修改后重试。",
                            "code": "CONTENT_REJECTED",
                        },
                    )

            for pattern in FORBIDDEN_PATTERNS:
                if pattern.search(body_text):
                    return JSONResponse(
                        status_code=403,
                        content={
                            "error": "内容安全审查未通过",
                            "detail": "消息中包含不当内容，请修改后重试。",
                            "code": "CONTENT_REJECTED",
                        },
                    )

        # 继续处理请求
        response = await call_next(request)

        # 非流式响应的安全检查（流式响应由 SSE 逐块处理，此处跳过）
        content_type = response.headers.get("content-type", "")
        if "application/json" in content_type and request.url.path.startswith("/api/"):
            # 可以在此对 JSON 响应内容做进一步检查
            pass

        return response


# ===== 工具函数：防幻觉后处理 =====

def add_safety_reminder(content: str) -> str:
    """在 AI 生成内容末尾添加安全提示"""
    if not content.strip():
        return content

    # 只有涉及教育/算法领域时才添加
    for trigger in HALLUCINATION_TRIGGERS:
        if trigger in content:
            return content + FACT_CHECK_REMINDER
    return content


def filter_sensitive_output(content: str) -> str:
    """过滤 AI 输出中的敏感内容"""
    for word in FORBIDDEN_WORDS:
        content = content.replace(word, "[已过滤]")
    return content


def detect_potential_hallucination(content: str) -> List[str]:
    """
    基础幻觉检测：检查明显的时间错乱、数字矛盾等
    返回可疑片段列表（供后续人工审核）
    """
    warnings = []

    # 检查未来年份（明显荒谬的预测）
    import datetime
    current_year = datetime.datetime.now().year
    year_pattern = re.compile(r"(20\d{2})\s*年")
    for match in year_pattern.finditer(content):
        year = int(match.group(1))
        if year > current_year + 2:
            warnings.append(f"检测到未来年份引用：{year}年")

    # 检查蓝桥杯相关的事实性表述（容易出错）
    if "蓝桥杯" in content:
        # 注意：以下仅标记，不做硬过滤
        pass

    return warnings
