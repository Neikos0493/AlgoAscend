"""
对话路由 - SSE流式对话接口
"""
import json
import asyncio
import httpx
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from agents.crewai_orchestrator import CrewAIOrchestrator
from agents.crewai_agents import _MODEL_PROVIDER_MAP
from database import get_db_sync
from models import Student, StudentProfile, ChatMessage

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    student_id: int = 1
    stream: bool = True
    model: str = "deepseek-chat"
    api_key: str = ""
    api_base: str = ""
    api_model: str = ""


class CompletionsProxyRequest(BaseModel):
    """OpenAI 兼容代理请求 — 供 noDirectCall 提供商（如讯飞）使用"""
    model: str = ""
    messages: list = []
    tools: list = []
    tool_choice: str = "auto"
    temperature: float = 0.7
    max_tokens: int = 4096
    stream: bool = False
    api_base: str = ""
    api_model: str = ""


@router.post("/send")
async def send_message(req: ChatRequest, request: Request):
    """发送消息并获取流式响应"""
    # 优先使用请求体中的 api_key，其次请求头
    api_key = req.api_key
    if not api_key:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            api_key = auth_header[7:]
    
    # 确保学生存在（首次对话时自动创建）
    db = get_db_sync()
    try:
        student = db.query(Student).filter(Student.id == req.student_id).first()
        if not student:
            student = Student(id=req.student_id, name="", major="", grade="")
            db.add(student)
            db.commit()
    finally:
        db.close()

    orchestrator = CrewAIOrchestrator(req.student_id, api_key, req.model, api_base=req.api_base, api_model=req.api_model)

    async def event_generator():
        try:
            async for chunk in orchestrator.process_message(req.message, stream=req.stream):
                yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0.01)
            yield f"data: {json.dumps({'type': 'done', 'content': ''})}\n\n"
        except Exception as e:
            err_str = str(e)
            # 401 时给出更友好的提示
            if "401" in err_str:
                friendly = "讯飞API认证失败(401)。请确认填入的是「APIPassword」(HTTP协议密码)，不是APIKey/APISecret。获取: console.xfyun.cn → 对应模型 → HTTP服务接口认证信息 → APIPassword"
                yield f"data: {json.dumps({'type': 'error', 'content': friendly})}\n\n"
            else:
                yield f"data: {json.dumps({'type': 'error', 'content': err_str})}\n\n"
        finally:
            orchestrator.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/history/{student_id}")
async def get_history(student_id: int = 1, limit: int = 50):
    """获取对话历史"""
    db = get_db_sync()
    try:
        messages = (
            db.query(ChatMessage)
            .filter(ChatMessage.student_id == student_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
            .all()
        )
        return {"messages": [m.to_dict() for m in reversed(messages)]}
    finally:
        db.close()


@router.delete("/history/{student_id}")
async def clear_history(student_id: int = 1):
    """清空对话历史"""
    db = get_db_sync()
    try:
        db.query(ChatMessage).filter(ChatMessage.student_id == student_id).delete()
        db.commit()
        return {"status": "ok", "message": "对话历史已清空"}
    finally:
        db.close()


@router.post("/completions-proxy")
async def completions_proxy(req: CompletionsProxyRequest, request: Request):
    """透传 OpenAI 兼容请求到 noDirectCall 提供商。
    
    前端 sendMessageWithTools 对于 CORS 受限的提供商（如讯飞）无法直连，
    会走到这个代理端点，后端转发并返回原始 JSON 响应。
    """
    # 从 Authorization header 获取 api_key
    api_key = ""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        api_key = auth_header[7:]

    if not api_key:
        raise HTTPException(401, "缺少 API Key — 请在设置中配置所选模型的鉴权信息")

    # 确定 api_base 和 api_model
    api_base = req.api_base
    api_model = req.api_model or req.model

    if not api_base:
        # fallback: 从 _MODEL_PROVIDER_MAP 查找
        model_lower = req.model.lower()
        if model_lower in _MODEL_PROVIDER_MAP:
            _, api_base, api_model = _MODEL_PROVIDER_MAP[model_lower]
        else:
            raise HTTPException(400, f"无法确定模型 {req.model} 的 API 端点，请传入 api_base")

    # 智能构造 URL：如果已含 /chat/completions 直接用，否则补全
    base_url = api_base.rstrip("/")
    if "/chat/completions" in base_url:
        url = base_url
    elif base_url.endswith("/v1"):
        url = f"{base_url}/chat/completions"
    else:
        url = f"{base_url}/v1/chat/completions"

    body = {
        "model": api_model or req.model,
        "messages": req.messages,
        "temperature": req.temperature,
        "max_tokens": req.max_tokens,
        "stream": req.stream,
    }
    if req.tools:
        body["tools"] = req.tools
        body["tool_choice"] = req.tool_choice

    print(f"[proxy] → {url} | model={body['model']} | messages={len(req.messages)} | tools={len(req.tools)}")

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=body,
        )
        # 透传上游错误
        if resp.status_code >= 400:
            print(f"[proxy] ← 上游错误 {resp.status_code}: {resp.text[:300]}")
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:500])

        print(f"[proxy] ← 200 OK")
        return resp.json()
