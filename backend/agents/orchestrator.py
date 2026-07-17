"""
智能体编排器 - 协调多个智能体协同工作
"""
import json
from typing import AsyncGenerator, Optional
from datetime import datetime

from config import AGENT_ROLES
from database import get_db_sync
from models import Student, StudentProfile, ChatMessage, LearningResource, Exercise, LearningPath, Assessment

from .profile_agent import ProfileAgent
from .content_agent import ContentAgent
from .exercise_agent import ExerciseAgent
from .path_agent import PathAgent
from .tutor_agent import TutorAgent
from .assessment_agent import AssessmentAgent


class AgentOrchestrator:
    """多智能体编排器 - 管理所有智能体的协作"""

    def __init__(self, student_id: int = 1):
        self.student_id = student_id
        self.db = get_db_sync()

        # 初始化所有智能体
        self.agents = {
            "profile": ProfileAgent(),
            "content": ContentAgent(),
            "exercise": ExerciseAgent(),
            "path": PathAgent(),
            "tutor": TutorAgent(),
            "assessment": AssessmentAgent(),
        }

    def _get_student_context(self) -> dict:
        """获取学生上下文信息"""
        student = self.db.query(Student).filter(Student.id == self.student_id).first()
        profile = self.db.query(StudentProfile).filter(
            StudentProfile.student_id == self.student_id
        ).first()

        context = {
            "student_id": self.student_id,
            "name": student.name if student else "学习者",
            "major": student.major if student else "",
            "grade": student.grade if student else "",
        }

        if profile:
            context["profile"] = profile.to_dict()
            context["profile_version"] = profile.version
            context["confidence"] = profile.confidence_score
        else:
            context["profile"] = None
            context["profile_version"] = 0
            context["confidence"] = 0.0

        return context

    def _get_chat_history(self, limit: int = 20) -> list:
        """获取最近的对话历史"""
        messages = (
            self.db.query(ChatMessage)
            .filter(ChatMessage.student_id == self.student_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
            .all()
        )
        history = []
        for msg in reversed(messages):
            history.append({
                "role": msg.role,
                "content": msg.content,
            })
        return history

    def _save_message(self, role: str, content: str, agent_type: str = "", content_type: str = "text", metadata: dict = None):
        """保存对话消息"""
        msg = ChatMessage(
            student_id=self.student_id,
            role=role,
            agent_type=agent_type,
            content=content,
            content_type=content_type,
            metadata_=metadata or {},
        )
        self.db.add(msg)
        self.db.commit()

    async def process_message(
        self, user_message: str, stream: bool = True
    ) -> AsyncGenerator[dict, None]:
        """
        处理用户消息的主入口
        根据消息意图自动路由到合适的智能体
        """
        # 保存用户消息
        self._save_message("user", user_message)

        # 获取上下文
        context = self._get_student_context()
        history = self._get_chat_history()

        # === 第一步：分析用户意图 ===
        intent = await self._analyze_intent(user_message, context)
        agent_type = intent.get("agent", "tutor")
        action = intent.get("action", "chat")

        # === 第二步：更新学生画像(始终在后台运行) ===
        if context["confidence"] < 0.8 or context["profile_version"] < 5:
            # 画像还不完善，尝试从对话中提取信息
            profile_update = await self.agents["profile"].extract_profile_info(
                user_message, context, history
            )
            if profile_update:
                self._update_profile(profile_update)

        # === 第三步：由目标智能体处理 ===
        if agent_type == "profile" and action == "analyze":
            # 显式请求画像分析
            async for chunk in self._stream_profile_analysis(context, history):
                yield chunk

        elif agent_type == "content" or action == "generate_content":
            async for chunk in self._stream_content_generation(user_message, context, intent):
                yield chunk

        elif agent_type == "exercise" or action == "generate_exercise":
            async for chunk in self._stream_exercise_generation(user_message, context, intent):
                yield chunk

        elif agent_type == "path" or action == "plan_path":
            async for chunk in self._stream_path_planning(context, intent):
                yield chunk

        elif agent_type == "tutor" or action == "ask_question":
            async for chunk in self._stream_tutoring(user_message, context, history):
                yield chunk

        elif agent_type == "assessment" or action == "evaluate":
            async for chunk in self._stream_assessment(context):
                yield chunk

        else:
            # 默认：综合处理
            async for chunk in self._stream_general_response(user_message, context, history):
                yield chunk

    async def _analyze_intent(self, message: str, context: dict) -> dict:
        """分析用户意图，路由到合适的智能体"""
        msg_lower = message.lower()

        # 关键词路由
        intent_keywords = {
            "profile": ["画像", "我的水平", "我的基础", "学习情况", "了解我", "评估我", "我的能力"],
            "content": ["生成资料", "学习资料", "教程", "文档", "讲解", "思维导图", "知识点", "教我", "介绍"],
            "exercise": ["练习题", "题目", "做题", "练习", "测试", "考题", "作业", "刷题"],
            "path": ["学习路径", "学习计划", "怎么学", "学习路线", "规划", "进度", "下一步"],
            "assessment": ["评估", "报告", "成绩", "掌握程度", "检测", "考核"],
            "tutor": ["为什么", "怎么做", "帮我", "解答", "不会", "错误", "报错", "怎么写", "思路"],
        }

        scores = {}
        for agent, keywords in intent_keywords.items():
            scores[agent] = sum(1 for kw in keywords if kw in msg_lower)

        if not scores or max(scores.values()) == 0:
            return {"agent": "tutor", "action": "chat"}

        best_agent = max(scores, key=scores.get)

        # 使用LLM精确定位意图
        system_prompt = """你是意图分析器。根据用户消息判断：agent(profile/content/exercise/path/tutor/assessment)、action(具体动作)、topic(主题)、difficulty(难度)。输出JSON。"""
        try:
            from llm_service import chat_with_json_output
            result = await chat_with_json_output(
                system_prompt,
                f"用户消息: {message}\n初步判断agent: {best_agent}",
            )
            if "agent" in result:
                return result
        except Exception:
            pass

        return {"agent": best_agent, "action": "chat"}

    def _update_profile(self, update: dict):
        """更新学生画像"""
        profile = self.db.query(StudentProfile).filter(
            StudentProfile.student_id == self.student_id
        ).first()

        if not profile:
            profile = StudentProfile(student_id=self.student_id)
            self.db.add(profile)

        for key, value in update.items():
            if hasattr(profile, key) and value:
                existing = getattr(profile, key) or {}
                if isinstance(existing, dict) and isinstance(value, dict):
                    existing.update(value)
                    setattr(profile, key, existing)
                elif isinstance(value, (list, dict)):
                    setattr(profile, key, value)
                elif isinstance(value, str):
                    setattr(profile, key, value)

        profile.version = (profile.version or 1) + 1
        profile.confidence_score = min(1.0, profile.confidence_score + 0.05)
        profile.updated_at = datetime.utcnow()
        self.db.commit()

    async def _stream_profile_analysis(self, context, history):
        """流式输出画像分析"""
        content = ""
        async for chunk in self.agents["profile"].analyze_profile(context):
            content += chunk
            yield {"type": "text", "content": chunk, "agent": "profile"}

        self._save_message("assistant", content, "profile", "markdown")

    async def _stream_content_generation(self, message, context, intent):
        """流式生成学习内容"""
        topic = intent.get("topic", message)
        content_type = intent.get("content_type", "doc")

        yield {"type": "status", "content": f"📚 内容生成专家正在准备「{topic}」的{self._get_content_type_name(content_type)}...", "agent": "content"}

        full_content = ""
        async for chunk in self.agents["content"].generate(topic, content_type, context):
            full_content += chunk
            yield {"type": "text", "content": chunk, "agent": "content"}

        # 保存为学习资源
        self._save_resource(topic, content_type, full_content, "content")
        self._save_message("assistant", full_content, "content", "markdown",
                          {"topic": topic, "content_type": content_type})

    async def _stream_exercise_generation(self, message, context, intent):
        """流式生成练习题"""
        topic = intent.get("topic", "算法基础")
        difficulty = intent.get("difficulty", context.get("profile", {}).get("knowledge_base", {}).get("cpp_level", "基础"))

        yield {"type": "status", "content": f"🏋️ 练习设计教练正在生成「{topic}」的{difficulty}难度练习题...", "agent": "exercise"}

        full_content = ""
        async for chunk in self.agents["exercise"].generate(topic, difficulty, context):
            full_content += chunk
            yield {"type": "text", "content": chunk, "agent": "exercise"}

        self._save_resource(f"{topic} 练习题", "exercise", full_content, "exercise")
        self._save_message("assistant", full_content, "exercise", "exercise",
                          {"topic": topic, "difficulty": difficulty})

    async def _stream_path_planning(self, context, intent):
        """流式生成学习路径"""
        yield {"type": "status", "content": "🗺️ 学习路径规划师正在为您设计个性化学习路线...", "agent": "path"}

        full_content = ""
        async for chunk in self.agents["path"].plan(context):
            full_content += chunk
            yield {"type": "text", "content": chunk, "agent": "path"}

        self._save_message("assistant", full_content, "path", "markdown")

    async def _stream_tutoring(self, message, context, history):
        """流式辅导答疑"""
        full_content = ""
        async for chunk in self.agents["tutor"].answer(message, context, history):
            full_content += chunk
            yield {"type": "text", "content": chunk, "agent": "tutor"}

        self._save_message("assistant", full_content, "tutor", "markdown")

    async def _stream_assessment(self, context):
        """流式生成评估报告"""
        yield {"type": "status", "content": "📊 正在分析您的学习数据，生成评估报告...", "agent": "assessment"}

        # 获取学习统计数据
        stats = self._get_learning_stats()

        full_content = ""
        async for chunk in self.agents["assessment"].evaluate(context, stats):
            full_content += chunk
            yield {"type": "text", "content": chunk, "agent": "assessment"}

        self._save_message("assistant", full_content, "assessment", "markdown")

    async def _stream_general_response(self, message, context, history):
        """通用响应 - 协调多智能体"""
        # 由tutor智能体主导，其他智能体补充
        full_content = ""
        async for chunk in self.agents["tutor"].answer(message, context, history):
            full_content += chunk
            yield {"type": "text", "content": chunk, "agent": "tutor"}

        self._save_message("assistant", full_content, "tutor", "markdown")

    def _get_learning_stats(self) -> dict:
        """获取学习统计数据"""
        total_exercises = self.db.query(Exercise).filter(
            Exercise.student_id == self.student_id
        ).count()

        correct_exercises = self.db.query(Exercise).filter(
            Exercise.student_id == self.student_id,
            Exercise.is_correct == True
        ).count()

        total_resources = self.db.query(LearningResource).filter(
            LearningResource.student_id == self.student_id
        ).count()

        return {
            "total_exercises": total_exercises,
            "correct_exercises": correct_exercises,
            "accuracy": correct_exercises / max(total_exercises, 1),
            "total_resources": total_resources,
        }

    def _save_resource(self, title: str, resource_type: str, content: str, agent: str):
        """保存学习资源"""
        resource = LearningResource(
            student_id=self.student_id,
            title=title,
            resource_type=resource_type,
            content=content,
            agent_generated=agent,
        )
        self.db.add(resource)
        self.db.commit()

    @staticmethod
    def _get_content_type_name(content_type: str) -> str:
        names = {
            "doc": "讲解文档",
            "mindmap": "思维导图",
            "reading": "拓展阅读",
            "video_script": "视频脚本",
            "code_case": "代码案例",
        }
        return names.get(content_type, "学习资料")

    def close(self):
        self.db.close()
