"""
主应用入口 - FastAPI + 多智能体系统
"""
import sys
import os

# 修复Windows控制台编码问题
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# 添加当前目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import uvicorn

from database import init_db, get_db_sync
from models import Student, StudentProfile
from config import AppConfig, AGENT_ROLES
from llm_service import init_llm_config

# 路由
from routes.chat import router as chat_router
from routes.profile import router as profile_router
from routes.resources import router as resources_router

# 初始化配置
config = AppConfig()
init_llm_config(config)


def _ensure_default_student():
    """确保存在默认学生账号"""
    db = get_db_sync()
    try:
        student = db.query(Student).filter(Student.id == 1).first()
        if not student:
            student = Student(id=1, name="学习者", major="", grade="")
            db.add(student)
            db.commit()

        profile = db.query(StudentProfile).filter(
            StudentProfile.student_id == 1
        ).first()
        if not profile:
            profile = StudentProfile(student_id=1)
            db.add(profile)
            db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    init_db()
    _ensure_default_student()
    print("=" * 60)
    print("[C++算法学习平台] 服务已启动")
    print(f"后端API: http://{config.host}:{config.port}")
    print(f"已加载 {len(AGENT_ROLES)} 个智能体:")
    for agent_id, agent_info in AGENT_ROLES.items():
        print(f"   {agent_info['icon']} {agent_info['name']} - {agent_info['description']}")
    print("=" * 60)
    yield


# 创建FastAPI应用
app = FastAPI(
    title="C++算法学习平台 - 多智能体AI辅助系统",
    description="基于多智能体架构的C++算法竞赛学习平台，支持对话式画像构建、个性化资源生成、学习路径规划和智能辅导",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(chat_router)
app.include_router(profile_router)
app.include_router(resources_router)


@app.get("/api")
async def root():
    """API根路径"""
    return {
        "name": "C++算法学习平台 API",
        "version": "1.0.0",
        "agents": [
            {"id": k, "name": v["name"], "icon": v["icon"], "description": v["description"]}
            for k, v in AGENT_ROLES.items()
        ],
        "endpoints": {
            "chat": "/api/chat/send",
            "profile": "/api/profile/1",
            "resources": "/api/resources/1",
            "history": "/api/chat/history/1",
        },
    }


@app.get("/api/agents")
async def list_agents():
    """列出所有智能体"""
    return {
        "agents": [
            {"id": k, "name": v["name"], "icon": v["icon"], "description": v["description"]}
            for k, v in AGENT_ROLES.items()
        ]
    }


@app.get("/api/dashboard/{student_id}")
async def get_dashboard(student_id: int = 1):
    """获取仪表盘数据"""
    from models import LearningResource, Exercise, LearningPath, Assessment
    db = get_db_sync()
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        profile = db.query(StudentProfile).filter(StudentProfile.student_id == student_id).first()

        total_exercises = db.query(Exercise).filter(Exercise.student_id == student_id).count()
        correct_exercises = db.query(Exercise).filter(
            Exercise.student_id == student_id, Exercise.is_correct == True
        ).count()
        total_resources = db.query(LearningResource).filter(LearningResource.student_id == student_id).count()
        total_paths = db.query(LearningPath).filter(LearningPath.student_id == student_id).count()
        total_assessments = db.query(Assessment).filter(Assessment.student_id == student_id).count()

        # 按类型统计资源
        resources_by_type = {}
        all_resources = db.query(LearningResource).filter(LearningResource.student_id == student_id).all()
        for r in all_resources:
            resources_by_type[r.resource_type] = resources_by_type.get(r.resource_type, 0) + 1

        return {
            "student": {
                "name": student.name if student else "学习者",
                "major": student.major if student else "",
                "grade": student.grade if student else "",
            },
            "profile": profile.to_dict() if profile else None,
            "stats": {
                "total_exercises": total_exercises,
                "correct_exercises": correct_exercises,
                "accuracy": round(correct_exercises / max(total_exercises, 1) * 100, 1),
                "total_resources": total_resources,
                "total_paths": total_paths,
                "total_assessments": total_assessments,
                "resources_by_type": resources_by_type,
            },
            "dimensions_filled": profile.get_dimension_count() if profile else 0,
        }
    finally:
        db.close()


# 静态文件服务(生产环境)
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(FRONTEND_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """服务前端页面"""
        file_path = os.path.join(FRONTEND_DIR, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=config.host,
        port=config.port,
        reload=True,
        log_level="info",
    )
