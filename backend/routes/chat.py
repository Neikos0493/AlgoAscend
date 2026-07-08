"""
对话路由 - SSE流式对话接口
"""
import json
import asyncio
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from agents.crewai_orchestrator import CrewAIOrchestrator
from database import get_db_sync
from models import Student, StudentProfile, ChatMessage

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    student_id: int = 1
    stream: bool = True


@router.post("/send")
async def send_message(req: ChatRequest):
    """发送消息并获取流式响应"""
    orchestrator = CrewAIOrchestrator(req.student_id)

    async def event_generator():
        try:
            async for chunk in orchestrator.process_message(req.message, stream=req.stream):
                yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0.01)
            yield f"data: {json.dumps({'type': 'done', 'content': ''})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
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
