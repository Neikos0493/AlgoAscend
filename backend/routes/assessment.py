"""
评估路由 - 触发评估后自动调整学习路径和资源推送
"""
import json
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import get_db_sync
from models import Student, StudentProfile, LearningResource, Exercise, LearningPath, Assessment
from config import AppConfig

router = APIRouter(prefix="/api/assessment", tags=["assessment"])


class EvaluateRequest(BaseModel):
    student_id: int = 1
    api_key: str = ""
    model: str = ""


@router.post("/evaluate")
async def run_evaluation(req: EvaluateRequest):
    """运行完整评估流程：评估报告 + 路径调整 + 资源推荐更新"""
    from config import AppConfig as Cfg
    api_key = req.api_key or Cfg().llm.api_key

    # 1. 收集数据
    db = get_db_sync()
    try:
        student = db.query(Student).filter(Student.id == req.student_id).first()
        profile = db.query(StudentProfile).filter(
            StudentProfile.student_id == req.student_id
        ).first()
        exercises = db.query(Exercise).filter(
            Exercise.student_id == req.student_id
        ).all()
        resources = db.query(LearningResource).filter(
            LearningResource.student_id == req.student_id
        ).all()
        paths = db.query(LearningPath).filter(
            LearningPath.student_id == req.student_id
        ).all()

        total_exercises = len(exercises)
        correct = sum(1 for e in exercises if e.is_correct)
        accuracy = correct / max(total_exercises, 1)

        profile_data = profile.to_dict() if profile else {}
        stats = {
            "total_exercises": total_exercises,
            "correct_exercises": correct,
            "accuracy": round(accuracy * 100, 1),
            "total_resources": len(resources),
            "total_paths": len(paths),
            "total_assessments": db.query(Assessment).filter(
                Assessment.student_id == req.student_id
            ).count(),
        }
    finally:
        db.close()

    # 2. 生成评估报告
    report = ""
    if api_key:
        try:
            from llm_service import chat_completion
            from config import AGENT_ROLES
            system_prompt = AGENT_ROLES["assessment"]["system_prompt"]

            prompt = f"""请基于以下数据生成一份全面的学习评估报告。

## 学生画像
{json.dumps(profile_data, ensure_ascii=False, indent=2)}

## 学习统计
- 总练习题数: {stats['total_exercises']}
- 正确数: {stats['correct_exercises']}
- 正确率: {stats['accuracy']}%
- 学习资源数: {stats['total_resources']}
- 学习路径数: {stats['total_paths']}

请生成包含以下内容的评估报告，并在最后附加一个JSON块（用```json包裹）包含调整建议：

```json
{{
  "weak_points": ["需要加强的知识点1", "知识点2"],
  "strengths": ["优势领域1"],
  "path_adjustments": {{
    "current_stage": 0,
    "suggested_stage": 0,
    "focus_areas": ["重点领域"],
    "priority": "high" 
  }},
  "push_strategy": {{
    "resource_types": ["doc", "exercise"],
    "topics": ["推荐主题"],
    "difficulty": "基础"
  }}
}}
```

使用Markdown格式报告，语气积极鼓励。"""

            report = await chat_completion(
                system_prompt=system_prompt,
                user_message=prompt,
                temperature=0.5,
                max_tokens=4096,
                api_key=req.api_key or None,
                model=req.model or None,
            )
        except Exception as e:
            report = f"评估报告生成失败: {str(e)}"

    # 3. 解析调整建议并持久化
    adjustments = {}
    try:
        import re
        json_match = re.search(r'```json\s*\n(.*?)\n```', report, re.DOTALL)
        if json_match:
            adjustments = json.loads(json_match.group(1))
    except:
        pass

    # 4. 保存评估记录
    db2 = get_db_sync()
    try:
        assessment = Assessment(
            student_id=req.student_id,
            assessment_type="comprehensive",
            dimensions=json.dumps({
                "knowledge": adjustments.get("weak_points", []),
                "strengths": adjustments.get("strengths", []),
                "stats": stats,
            }, ensure_ascii=False),
            scores=json.dumps({"accuracy": stats["accuracy"], "total": stats["total_exercises"]}),
            weak_points=json.dumps(adjustments.get("weak_points", []), ensure_ascii=False),
            recommendations=report[:2000] if report else "",
        )
        db2.add(assessment)
        db2.commit()
        assessment_id = assessment.id

        # 5. 自动调整学习路径
        path_adjustments = adjustments.get("path_adjustments", {})
        if path_adjustments:
            # 更新现有路径或创建新路径
            existing_path = db2.query(LearningPath).filter(
                LearningPath.student_id == req.student_id
            ).order_by(LearningPath.created_at.desc()).first()

            if existing_path and path_adjustments.get("suggested_stage", 0) != existing_path.current_stage:
                existing_path.current_stage = path_adjustments["suggested_stage"]
                existing_path.updated_at = datetime.utcnow()
                db2.commit()
    finally:
        db2.close()

    # 6. 生成推荐资源
    db3 = get_db_sync()
    try:
        recommendations = db3.query(LearningResource).filter(
            LearningResource.student_id == req.student_id
        ).order_by(LearningResource.created_at.desc()).limit(6).all()
        rec_list = [r.to_dict() for r in recommendations]
    finally:
        db3.close()

    return {
        "status": "ok",
        "assessment_id": assessment_id,
        "report": report,
        "adjustments": adjustments,
        "stats": stats,
        "recommended_resources": rec_list,
    }
