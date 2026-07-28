"""错题本 CRUD 路由"""
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from database import get_db_sync
from models import ErrorNotebookEntry

router = APIRouter(prefix="/api/error-notebook", tags=["error-notebook"])


class ErrorNotebookCreate(BaseModel):
    problem_id: str = ""
    problem_title: str = ""
    problem_platform: str = ""
    problem_url: str = ""
    difficulty: str = ""
    tags: list = []
    user_approach: str = ""
    error_reasons: str = ""
    better_solution: str = ""
    notes: str = ""
    submission_id: int = None
    submission_code: str = ""


class ErrorNotebookUpdate(BaseModel):
    problem_title: str = None
    user_approach: str = None
    error_reasons: str = None
    better_solution: str = None
    notes: str = None
    difficulty: str = None
    tags: list = None


@router.get("/{student_id}")
async def list_entries(
    student_id: int,
    platform: str = Query(None),
    difficulty: str = Query(None),
    tag: str = Query(None),
):
    db = get_db_sync()
    try:
        q = db.query(ErrorNotebookEntry).filter(
            ErrorNotebookEntry.student_id == student_id
        )
        if platform:
            q = q.filter(ErrorNotebookEntry.problem_platform == platform)
        if difficulty:
            q = q.filter(ErrorNotebookEntry.difficulty == difficulty)
        entries = q.order_by(ErrorNotebookEntry.updated_at.desc()).all()
        # 前端本地按 tag 过滤
        result = [e.to_dict() for e in entries]
        if tag:
            result = [r for r in result if tag in (r.get("tags") or [])]
        return result
    finally:
        db.close()


@router.get("/{student_id}/{entry_id}")
async def get_entry(student_id: int, entry_id: int):
    db = get_db_sync()
    try:
        entry = db.query(ErrorNotebookEntry).filter(
            ErrorNotebookEntry.id == entry_id,
            ErrorNotebookEntry.student_id == student_id,
        ).first()
        if not entry:
            raise HTTPException(404, "条目不存在")
        return entry.to_dict()
    finally:
        db.close()


@router.post("/{student_id}")
async def create_entry(student_id: int, data: ErrorNotebookCreate):
    db = get_db_sync()
    try:
        entry = ErrorNotebookEntry(
            student_id=student_id,
            problem_id=data.problem_id,
            problem_title=data.problem_title,
            problem_platform=data.problem_platform,
            problem_url=data.problem_url,
            difficulty=data.difficulty,
            tags=data.tags,
            user_approach=data.user_approach,
            error_reasons=data.error_reasons,
            better_solution=data.better_solution,
            notes=data.notes,
            submission_id=data.submission_id,
            submission_code=data.submission_code,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry.to_dict()
    finally:
        db.close()


@router.put("/{student_id}/{entry_id}")
async def update_entry(student_id: int, entry_id: int, data: ErrorNotebookUpdate):
    db = get_db_sync()
    try:
        entry = db.query(ErrorNotebookEntry).filter(
            ErrorNotebookEntry.id == entry_id,
            ErrorNotebookEntry.student_id == student_id,
        ).first()
        if not entry:
            raise HTTPException(404, "条目不存在")
        updates = data.model_dump(exclude_none=True)
        for k, v in updates.items():
            setattr(entry, k, v)
        entry.updated_at = datetime.utcnow()
        db.commit()
        return entry.to_dict()
    finally:
        db.close()


@router.delete("/{student_id}/{entry_id}")
async def delete_entry(student_id: int, entry_id: int):
    db = get_db_sync()
    try:
        entry = db.query(ErrorNotebookEntry).filter(
            ErrorNotebookEntry.id == entry_id,
            ErrorNotebookEntry.student_id == student_id,
        ).first()
        if not entry:
            raise HTTPException(404, "条目不存在")
        db.delete(entry)
        db.commit()
        return {"ok": True}
    finally:
        db.close()
