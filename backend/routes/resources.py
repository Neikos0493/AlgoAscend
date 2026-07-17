"""
资源路由
"""
from fastapi import APIRouter
from database import get_db_sync
from models import LearningResource

router = APIRouter(prefix="/api/resources", tags=["resources"])


@router.get("/{student_id}")
async def get_resources(student_id: int = 1, resource_type: str = None, limit: int = 50):
    """获取学习资源列表"""
    db = get_db_sync()
    try:
        query = db.query(LearningResource).filter(
            LearningResource.student_id == student_id
        )
        if resource_type:
            query = query.filter(LearningResource.resource_type == resource_type)

        resources = (
            query.order_by(LearningResource.created_at.desc())
            .limit(limit)
            .all()
        )

        # 按类型分组
        grouped = {}
        for r in resources:
            rtype = r.resource_type
            if rtype not in grouped:
                grouped[rtype] = []
            grouped[rtype].append(r.to_dict())

        return {
            "total": len(resources),
            "by_type": grouped,
            "resources": [r.to_dict() for r in resources],
        }
    finally:
        db.close()


@router.get("/detail/{resource_id}")
async def get_resource_detail(resource_id: int):
    """获取单个资源详情"""
    db = get_db_sync()
    try:
        resource = db.query(LearningResource).filter(
            LearningResource.id == resource_id
        ).first()
        if not resource:
            return {"error": "资源不存在", "code": 404}
        return resource.to_dict()
    finally:
        db.close()


@router.delete("/{resource_id}")
async def delete_resource(resource_id: int):
    """删除资源"""
    db = get_db_sync()
    try:
        resource = db.query(LearningResource).filter(
            LearningResource.id == resource_id
        ).first()
        if resource:
            db.delete(resource)
            db.commit()
        return {"status": "ok"}
    finally:
        db.close()
