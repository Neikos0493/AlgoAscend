"""
CrewAI 多智能体编排器 v2 — 支持思考过程可见
基于 CrewAI 框架 + 回调机制实现Agent思考过程实时流式输出
"""
import os
import json
import asyncio
import threading
from typing import AsyncGenerator
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

from crewai import Agent, Task, Crew, Process

from database import get_db_sync
from models import Student, StudentProfile, ChatMessage, LearningResource, Exercise, LearningPath, Assessment
from config import AGENT_ROLES

from .crewai_agents import (
    get_llm,
    create_profile_analyst,
    create_content_expert,
    create_exercise_coach,
    create_path_planner,
    create_tutor,
    create_assessment_analyst,
    create_content_reviewer,
)

_executor = ThreadPoolExecutor(max_workers=3)

# ================================================================
# Agent 名称/图标映射
# ================================================================
AGENT_META = {
    "profile_analyst":    {"name": "画像分析师", "icon": "🧠", "color": "#7c3aed"},
    "content_expert":     {"name": "内容生成专家", "icon": "📚", "color": "#2563eb"},
    "content_reviewer":   {"name": "内容审核员", "icon": "🔍", "color": "#ea580c"},
    "exercise_coach":     {"name": "练习设计教练", "icon": "🏋️", "color": "#ea580c"},
    "path_planner":       {"name": "学习路径规划师", "icon": "🗺️", "color": "#16a34a"},
    "tutor":              {"name": "智能辅导老师", "icon": "🎓", "color": "#2563eb"},
    "assessment_analyst": {"name": "学习评估分析师", "icon": "📊", "color": "#db2777"},
}


class CrewAIOrchestrator:
    """基于CrewAI的多智能体编排器 — 支持思考过程实时可见"""

    def __init__(self, student_id: int = 1):
        self.student_id = student_id
        self.db = get_db_sync()
        self._llm = get_llm()

    def _make_agent(self, creator_fn, agent_key: str) -> Agent:
        """创建Agent实例"""
        agent = creator_fn()
        agent.llm = self._llm
        agent.verbose = True  # 开启详细日志(输出到控制台)
        return agent

    # ================================================================
    # 上下文 & 数据管理
    # ================================================================
    def _get_student_context(self) -> dict:
        student = self.db.query(Student).filter(Student.id == self.student_id).first()
        profile = self.db.query(StudentProfile).filter(StudentProfile.student_id == self.student_id).first()
        ctx = {"student_id": self.student_id, "name": student.name if student else "学习者",
               "major": student.major if student else "", "grade": student.grade if student else ""}
        if profile:
            ctx["profile"] = profile.to_dict()
            ctx["profile_version"] = profile.version
            ctx["confidence"] = profile.confidence_score
        else:
            ctx["profile"] = None
            ctx["profile_version"] = 0
            ctx["confidence"] = 0.0
        return ctx

    def _get_chat_history(self, limit: int = 20) -> list:
        msgs = (self.db.query(ChatMessage).filter(ChatMessage.student_id == self.student_id)
                .order_by(ChatMessage.created_at.desc()).limit(limit).all())
        return [{"role": m.role, "content": m.content} for m in reversed(msgs)]

    def _save_message(self, role: str, content: str, agent_type: str = "",
                      content_type: str = "markdown", metadata: dict = None):
        self.db.add(ChatMessage(student_id=self.student_id, role=role, agent_type=agent_type,
                                content=content, content_type=content_type, metadata_=metadata or {}))
        self.db.commit()

    def _save_resource(self, title: str, resource_type: str, content: str, agent: str,
                       topic: str = "", difficulty: str = ""):
        self.db.add(LearningResource(student_id=self.student_id, title=title, resource_type=resource_type,
                                     content=content, agent_generated=agent, topic=topic, difficulty=difficulty))
        self.db.commit()

    def _update_profile(self, update: dict):
        profile = self.db.query(StudentProfile).filter(StudentProfile.student_id == self.student_id).first()
        if not profile:
            profile = StudentProfile(student_id=self.student_id)
            self.db.add(profile)
        for key, value in update.items():
            if hasattr(profile, key) and value:
                existing = getattr(profile, key) or {}
                if isinstance(existing, dict) and isinstance(value, dict):
                    existing.update(value)
                    setattr(profile, key, existing)
                elif isinstance(value, (list, dict, str)):
                    setattr(profile, key, value)
        profile.version = (profile.version or 1) + 1
        profile.confidence_score = min(1.0, profile.confidence_score + 0.05)
        profile.updated_at = datetime.utcnow()
        self.db.commit()

    def _get_learning_stats(self) -> dict:
        total_ex = self.db.query(Exercise).filter(Exercise.student_id == self.student_id).count()
        correct_ex = self.db.query(Exercise).filter(Exercise.student_id == self.student_id,
                                                     Exercise.is_correct == True).count()
        total_res = self.db.query(LearningResource).filter(LearningResource.student_id == self.student_id).count()
        return {"total_exercises": total_ex, "correct_exercises": correct_ex,
                "accuracy": correct_ex / max(total_ex, 1), "total_resources": total_res}

    def _build_profile_context(self) -> str:
        """将画像数据构建为Agent可读的上下文文本，直接传入prompt让LLM自行解读"""
        profile = self.db.query(StudentProfile).filter(
            StudentProfile.student_id == self.student_id
        ).first()
        student = self.db.query(Student).filter(Student.id == self.student_id).first()

        if not profile:
            return "学生画像尚未构建，请以初学者水平回复。"

        dims = {
            "知识基础": profile.knowledge_base,
            "认知风格": profile.cognitive_style,
            "学习目标": profile.learning_goals,
            "易错点偏好": profile.error_patterns,
            "学习节奏": profile.learning_pace,
            "兴趣领域": profile.interests,
        }

        # 统计有效维度
        filled = sum(1 for v in dims.values() if v and isinstance(v, dict) and
                     any(x for x in v.values() if x))
        confidence = f"{int((profile.confidence_score or 0) * 100)}%"

        # 直接输出原始JSON，LLM能自行理解
        ctx = f"""## 📋 学生个性化画像 (置信度: {confidence}, {filled}/6维度已填充)

学生: {student.name if student else '学习者'} | 专业: {student.major if student else '未设置'} | 年级: {student.grade if student else '未设置'}

以下是各维度的已知数据，请**严格根据这些信息调整你的回答难度、风格和侧重点**：

```json
{json.dumps(dims, ensure_ascii=False, indent=2)}
```

**个性化要求：**
- 根据「知识基础」调整内容深度和代码注释详细程度
- 根据「认知风格」调整表达方式(视觉型用图表、动手型多代码案例)
- 根据「易错点偏好」在对应领域给出特别警告
- 根据「兴趣领域」优先选用学生感兴趣的主题作为案例
- 根据「学习目标」调整内容与竞赛/考试的关联度
- 数据为空的维度说明该方面尚不了解，按默认方式处理即可"""

        return ctx

    # ================================================================
    # 主入口
    # ================================================================
    async def process_message(self, user_message: str, stream: bool = True) -> AsyncGenerator[dict, None]:
        self._save_message("user", user_message)
        context = self._get_student_context()
        history = self._get_chat_history()

        # 1. 意图分析
        intent = await self._analyze_intent(user_message, context)
        agent_type = intent.get("agent", "tutor")

        # 2. 后台画像提取
        if context["confidence"] < 0.8:
            asyncio.create_task(self._background_profile_extraction(user_message, context))

        # 3. 启动对应Crew并流式输出
        if agent_type == "profile":
            async for chunk in self._run_profile_crew(user_message, context, history):
                yield chunk
        elif agent_type == "content":
            async for chunk in self._run_content_crew(user_message, context, intent):
                yield chunk
        elif agent_type == "exercise":
            async for chunk in self._run_exercise_crew(user_message, context, intent):
                yield chunk
        elif agent_type == "path":
            async for chunk in self._run_path_crew(context):
                yield chunk
        elif agent_type == "assessment":
            async for chunk in self._run_assessment_crew(context):
                yield chunk
        else:
            async for chunk in self._run_tutoring_crew(user_message, context, history):
                yield chunk

    async def _analyze_intent(self, message: str, context: dict) -> dict:
        msg = message

        # 排除算法术语对path意图的干扰
        msg_for_path = msg.replace("动态规划", "").replace("路径压缩", "").replace("最短路径", "")

        keywords = {
            "profile": ["画像", "我的水平", "我的基础", "学习情况", "了解我", "分析画像", "分析我的"],
            "content": ["生成资料", "学习资料", "教程", "文档", "思维导图", "知识点", "生成"],
            "exercise": ["练习题", "题目", "做题", "练习", "测试", "考题", "刷题", "出题"],
            "path": ["学习路径", "学习计划", "怎么学", "学习路线", "进度安排", "下一步"],
            "assessment": ["评估报告", "掌握程度", "学习报告"],
        }

        scores = {a: sum(1 for kw in kws if kw in msg_for_path) for a, kws in keywords.items()}

        # tutor关键词
        tutor_kw = ["为什么", "怎么做", "帮我", "解答", "不会", "错误", "怎么写", "思路", "解释", "什么是", "什么叫", "如何", "是什么意思"]
        tutor_score = sum(1 for kw in tutor_kw if kw in msg)

        max_score = max(scores.values()) if scores else 0

        # 没有明确匹配，或全部低分 → tutor兜底
        if max_score == 0 or (max_score <= 1 and tutor_score >= 1):
            return {"agent": "tutor", "action": "chat"}

        return {"agent": max(scores, key=scores.get), "action": "handle"}

    async def _background_profile_extraction(self, message: str, context: dict):
        try:
            profile_json = json.dumps(context.get("profile") or {}, ensure_ascii=False)
            task = Task(
                description=f"""从学生消息提取新的画像特征。已有画像:{profile_json}。消息:"{message}"。
如果发现新信息，输出JSON: {{"knowledge_base":{{...}}, "cognitive_style":{{...}}, ...}}，否则输出{{}}。""",
                expected_output="JSON格式的画像更新",
                agent=self._make_agent(create_profile_analyst, "profile_analyst"),
            )
            crew = Crew(agents=[task.agent], tasks=[task], process=Process.sequential, verbose=False)
            result = await asyncio.get_event_loop().run_in_executor(_executor, crew.kickoff)
            raw = str(result.raw) if result else "{}"
            try:
                update = json.loads(raw)
                if update and any(v for v in update.values() if v):
                    self._update_profile(update)
            except json.JSONDecodeError:
                pass
        except Exception as e:
            print(f"[后台画像] 失败: {e}")

    # ================================================================
    # 核心: 带思考过程流式输出的Crew运行器
    # ================================================================
    async def _run_crew_with_thinking(
        self, crew: Crew, crew_info: dict
    ) -> AsyncGenerator[dict, None]:
        """运行Crew并实时展示Agent协作过程"""
        agents = crew_info["agents"]
        tasks = crew_info["tasks"]

        result_holder = {"output": None, "error": None}
        done_event = threading.Event()

        def run_crew():
            try:
                result = crew.kickoff()
                result_holder["output"] = str(result.raw) if result else ""
            except Exception as e:
                result_holder["error"] = str(e)
            finally:
                done_event.set()

        # 启动Crew线程
        thread = threading.Thread(target=run_crew, daemon=True)
        thread.start()

        # ===== 阶段0: 管道定义 =====
        yield {"type": "pipeline", "agents": agents, "tasks": tasks}
        await asyncio.sleep(0.2)

        # ===== 阶段1: 逐个激活Agent =====
        for i, ag in enumerate(agents):
            task_name = tasks[i]["name"] if i < len(tasks) else "处理中"
            is_last = (i == len(agents) - 1)

            # Agent启动
            yield {
                "type": "agent_start",
                "agent_key": ag["key"], "agent_name": ag["name"],
                "agent_icon": ag["icon"], "task_name": task_name,
                "step": i + 1, "total": len(agents),
            }
            await asyncio.sleep(0.3)

            # 最后Agent等待Crew完成
            if is_last:
                while not done_event.is_set():
                    await asyncio.sleep(0.5)

            # Agent完成
            yield {
                "type": "agent_done",
                "agent_key": ag["key"], "agent_name": ag["name"],
                "agent_icon": ag["icon"],
            }

            # 多Agent间交接
            if i + 1 < len(agents):
                yield {
                    "type": "agent_handoff",
                    "from_key": ag["key"], "from_name": ag["name"],
                    "to_key": agents[i + 1]["key"], "to_name": agents[i + 1]["name"],
                }
                await asyncio.sleep(0.3)

        # ===== 阶段2: 流式输出最终结果 =====
        if result_holder["error"]:
            yield {"type": "error", "content": f"Agent处理出错: {result_holder['error']}"}
        elif result_holder["output"]:
            output = result_holder["output"]
            chunk_size = 10
            for i in range(0, len(output), chunk_size):
                yield {
                    "type": "text",
                    "content": output[i:i + chunk_size],
                    "agent": agents[-1]["key"],
                }
                await asyncio.sleep(0.012)


    # ================================================================
    # 各Crew运行方法
    # ================================================================

    async def _run_profile_crew(self, message: str, context: dict, history: list) -> AsyncGenerator[dict, None]:
        profile = context.get("profile") or {}
        profile_json = json.dumps(profile, ensure_ascii=False)

        analyst = self._make_agent(create_profile_analyst, "profile_analyst")

        task = Task(
            description=f"""{self._build_profile_context()}

用户最新消息: "{message}"

请先生成画像分析思路，然后输出完整的六维学习画像分析报告:
1. 📊 画像数据总览(当前已收集+置信度)
2. 🎯 六维度逐一深度解读
3. 💡 基于画像的个性化学习建议
4. ⚠️ 数据缺口与需要补充的信息
5. 🔄 推荐下一步学习行动""",
            expected_output="完整的六维学习画像分析报告(Markdown)",
            agent=analyst,
        )

        crew = Crew(agents=[analyst], tasks=[task], process=Process.sequential, verbose=True)
        crew_info = {
            "agents": [{"key": "profile_analyst", "name": "画像分析师", "icon": "🧠"}],
            "tasks": [{"name": "六维画像深度分析", "agent_key": "profile_analyst"}],
        }
        async for chunk in self._run_crew_with_thinking(crew, crew_info):
            yield chunk
        self._save_message("assistant", crew.usage_metrics or "", "profile", "markdown")

    async def _run_content_crew(self, message: str, context: dict, intent: dict) -> AsyncGenerator[dict, None]:
        profile = context.get("profile") or {}
        kb = profile.get("knowledge_base", {})
        level = kb.get("cpp_level", "基础")
        topic = intent.get("topic", message)
        errors = profile.get("error_patterns", {})

        expert = self._make_agent(create_content_expert, "content_expert")
        reviewer = self._make_agent(create_content_reviewer, "content_reviewer")

        create_task = Task(
            description=f"""{self._build_profile_context()}

请先说明创作思路，然后为学习者创作关于「{topic}」的学习资料。

要求: 学习目标、核心概念(配图解)、完整C++代码(```cpp)、复杂度分析、常见错误、实际应用、小结。

请用Markdown格式，先写思路再写正文。**务必根据画像调整难度和侧重点。**""",
            expected_output="创作思路 + 完整结构化学习文档(Markdown)",
            agent=expert,
        )

        review_task = Task(
            description=f"""请先说明你的审核思路(检查哪些方面)，然后审核上面的学习资料:
1. C++代码是否可编译运行
2. 算法概念是否正确
3. 难度是否适合{level}水平
4. 内容是否安全合规

输出: 审核意见 + 最终版资料""",
            expected_output="审核思路 + 审核结果 + 最终学习资料",
            agent=reviewer,
        )

        crew = Crew(agents=[expert, reviewer], tasks=[create_task, review_task],
                    process=Process.sequential, verbose=True)
        crew_info = {
            "agents": [
                {"key": "content_expert", "name": "内容生成专家", "icon": "📚"},
                {"key": "content_reviewer", "name": "内容审核员", "icon": "🔍"},
            ],
            "tasks": [
                {"name": "创作学习资料", "agent_key": "content_expert"},
                {"name": "审核与修正", "agent_key": "content_reviewer"},
            ],
        }
        async for chunk in self._run_crew_with_thinking(crew, crew_info):
            yield chunk
        self._save_message("assistant", crew_info["agents"][-1]["name"], "content", "markdown")

    async def _run_exercise_crew(self, message: str, context: dict, intent: dict) -> AsyncGenerator[dict, None]:
        profile = context.get("profile") or {}
        kb = profile.get("knowledge_base", {})
        level = kb.get("cpp_level", "基础")
        topic = intent.get("topic", "算法基础")
        errors = profile.get("error_patterns", {})

        coach = self._make_agent(create_exercise_coach, "exercise_coach")
        reviewer = self._make_agent(create_content_reviewer, "content_reviewer")

        create_task = Task(
            description=f"""{self._build_profile_context()}

请先说明出题思路，然后设计「{topic}」练习题组。

包含: 2道选择题(4选项+解析)、1道填空题、1道算法设计题(OJ格式+完整C++解答)、1道挑战题。
**务必根据画像中的易错点和薄弱领域设计陷阱选项，难度匹配画像中的知识水平。**""",
            expected_output="出题思路 + 完整练习题组(Markdown)",
            agent=coach,
        )

        review_task = Task(
            description=f"""先说明审核思路，然后检查题目: 描述清晰度、答案正确性、难度匹配({level})、代码正确性。输出审核结果+最终题目。""",
            expected_output="审核思路 + 审核结果 + 最终练习题组",
            agent=reviewer,
        )

        crew = Crew(agents=[coach, reviewer], tasks=[create_task, review_task],
                    process=Process.sequential, verbose=True)
        crew_info = {
            "agents": [
                {"key": "exercise_coach", "name": "练习设计教练", "icon": "🏋️"},
                {"key": "content_reviewer", "name": "内容审核员", "icon": "🔍"},
            ],
            "tasks": [
                {"name": "设计练习题组", "agent_key": "exercise_coach"},
                {"name": "审核题目质量", "agent_key": "content_reviewer"},
            ],
        }
        async for chunk in self._run_crew_with_thinking(crew, crew_info):
            yield chunk

    async def _run_path_crew(self, context: dict) -> AsyncGenerator[dict, None]:
        profile = context.get("profile") or {}
        kb = profile.get("knowledge_base", {})
        goals = profile.get("learning_goals", {})
        pace = profile.get("learning_pace", {})

        planner = self._make_agent(create_path_planner, "path_planner")
        analyst = self._make_agent(create_profile_analyst, "profile_analyst")

        plan_task = Task(
            description=f"""{self._build_profile_context()}

请先说明路径设计方法论，然后设计C++算法学习路径。

设计6阶段渐进路线(入门→竞赛)，每阶段含: 目标、知识点、推荐资源、必做练习、检验标准、建议时长。包含总时间线和里程碑。

**务必根据画像确定起始阶段，学习节奏匹配画像中的每周学习时间。**""",
            expected_output="设计思路 + 完整6阶段学习路径(Markdown)",
            agent=planner,
        )

        calibrate_task = Task(
            description=f"""先说明校准分析思路，然后基于学生画像校准学习路径:
- 起始阶段匹配度
- 难度递进合理性
- 时间安排是否匹配{pace.get('weekly_hours', '未知')}的节奏
- 是否兼顾兴趣与薄弱点
输出校准意见和最终路径。""",
            expected_output="校准分析 + 最终学习路径",
            agent=analyst,
        )

        crew = Crew(agents=[planner, analyst], tasks=[plan_task, calibrate_task],
                    process=Process.sequential, verbose=True)
        crew_info = {
            "agents": [
                {"key": "path_planner", "name": "学习路径规划师", "icon": "🗺️"},
                {"key": "profile_analyst", "name": "画像分析师", "icon": "🧠"},
            ],
            "tasks": [
                {"name": "设计学习路径", "agent_key": "path_planner"},
                {"name": "画像校准路径", "agent_key": "profile_analyst"},
            ],
        }
        async for chunk in self._run_crew_with_thinking(crew, crew_info):
            yield chunk

    async def _run_tutoring_crew(self, message: str, context: dict, history: list) -> AsyncGenerator[dict, None]:
        profile = context.get("profile") or {}
        kb = profile.get("knowledge_base", {})
        level = kb.get("cpp_level", "基础")
        errors = profile.get("error_patterns", {})

        tutor = self._make_agent(create_tutor, "tutor")

        task = Task(
            description=f"""{self._build_profile_context()}

请先简述解题思路，然后解答学生问题。

问题: "{message}"

按以下结构: 🤔问题分析 → 📖知识点讲解(配图解) → 💻代码实现(```cpp) → 🔍逐步解析 → ⚠️常见错误(结合画像中的易错点) → 💡扩展思考 → 📝解题模板
**务必根据画像调整讲解深度和侧重点。先引导思考再给答案。**""",
            expected_output="解题思路 + 结构化完整解答(Markdown)",
            agent=tutor,
        )

        crew = Crew(agents=[tutor], tasks=[task], process=Process.sequential, verbose=True)
        crew_info = {
            "agents": [{"key": "tutor", "name": "智能辅导老师", "icon": "🎓"}],
            "tasks": [{"name": "分析并解答问题", "agent_key": "tutor"}],
        }
        async for chunk in self._run_crew_with_thinking(crew, crew_info):
            yield chunk
        self._save_message("assistant", message, "tutor", "markdown")

    async def _run_assessment_crew(self, context: dict) -> AsyncGenerator[dict, None]:
        profile = context.get("profile") or {}
        stats = self._get_learning_stats()

        analyst = self._make_agent(create_assessment_analyst, "assessment_analyst")
        planner = self._make_agent(create_path_planner, "path_planner")

        assess_task = Task(
            description=f"""{self._build_profile_context()}

学习数据: {stats['total_exercises']}题, 正确率{stats['accuracy']:.1%}, 资源{stats['total_resources']}个

请先说明评估方法论，然后生成评估报告:
📊数据总览 → 🎯各维度⭐评分 → 💪优势 → ⚠️薄弱点 → 📈趋势 → 🔧改进建议 → 📋行动计划""",
            expected_output="评估思路 + 完整多维评估报告(Markdown)",
            agent=analyst,
        )

        strategy_task = Task(
            description=f"""先简述策略调整逻辑，然后基于评估结果提出:
1. 资源推送策略调整
2. 学习路径调整建议
3. 练习重点调整
4. 下阶段目标""",
            expected_output="策略调整思路 + 调整方案(Markdown)",
            agent=planner,
        )

        crew = Crew(agents=[analyst, planner], tasks=[assess_task, strategy_task],
                    process=Process.sequential, verbose=True)
        crew_info = {
            "agents": [
                {"key": "assessment_analyst", "name": "学习评估分析师", "icon": "📊"},
                {"key": "path_planner", "name": "学习路径规划师", "icon": "🗺️"},
            ],
            "tasks": [
                {"name": "多维度学习评估", "agent_key": "assessment_analyst"},
                {"name": "调整学习策略", "agent_key": "path_planner"},
            ],
        }
        async for chunk in self._run_crew_with_thinking(crew, crew_info):
            yield chunk

    def close(self):
        self.db.close()
