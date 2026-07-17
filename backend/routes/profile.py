"""
画像路由
"""
from fastapi import APIRouter
from database import get_db_sync
from models import Student, StudentProfile, ChatMessage

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("/{student_id}")
async def get_profile(student_id: int = 1):
    """获取学生画像"""
    db = get_db_sync()
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        profile = db.query(StudentProfile).filter(
            StudentProfile.student_id == student_id
        ).first()

        if not student:
            return {"error": "学生不存在", "code": 404}

        result = {
            "student": {
                "id": student.id,
                "name": student.name,
                "major": student.major,
                "grade": student.grade,
            },
            "profile": profile.to_dict() if profile else None,
            "dimensions_filled": profile.get_dimension_count() if profile else 0,
            "total_dimensions": 6,
        }
        return result
    finally:
        db.close()


@router.put("/{student_id}")
async def update_student_info(student_id: int, name: str = None, major: str = None, grade: str = None):
    """更新学生基本信息"""
    db = get_db_sync()
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return {"error": "学生不存在", "code": 404}

        if name:
            student.name = name
        if major:
            student.major = major
        if grade:
            student.grade = grade

        db.commit()
        return {"status": "ok", "student": {"id": student.id, "name": student.name, "major": student.major, "grade": student.grade}}
    finally:
        db.close()


@router.delete("/{student_id}/reset")
async def reset_profile(student_id: int = 1):
    """重置学生画像和对话历史（用于重新构建画像）"""
    db = get_db_sync()
    try:
        # 清除画像
        profile = db.query(StudentProfile).filter(
            StudentProfile.student_id == student_id
        ).first()
        if profile:
            db.delete(profile)

        # 清除对话历史
        db.query(ChatMessage).filter(
            ChatMessage.student_id == student_id
        ).delete()

        # 将学生基本信息恢复到默认值
        student = db.query(Student).filter(Student.id == student_id).first()
        if student:
            student.name = "学习者"
            student.major = None
            student.grade = None

        db.commit()
        return {"status": "ok", "message": "画像和对话历史已重置，请重新与AI对话构建画像"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        db.close()
