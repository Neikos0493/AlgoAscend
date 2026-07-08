"""
画像路由
"""
from fastapi import APIRouter
from database import get_db_sync
from models import Student, StudentProfile

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
