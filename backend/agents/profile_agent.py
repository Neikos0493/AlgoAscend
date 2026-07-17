"""
学习画像分析师智能体 - 通过对话构建和维护六维学生画像
"""
import json
from typing import AsyncGenerator
from config import AGENT_ROLES, PROFILE_DIMENSIONS
from llm_service import chat_completion, chat_with_json_output


class ProfileAgent:
    def __init__(self):
        self.role = AGENT_ROLES["profile"]
        self.system_prompt = self.role["system_prompt"]

    async def extract_profile_info(self, message: str, context: dict, history: list) -> dict:
        """从对话消息中提取画像特征"""
        extract_prompt = f"""{self.system_prompt}

当前已知画像: {json.dumps(context.get('profile') or {}, ensure_ascii=False)}
学生信息: 专业={context.get('major', '未知')}, 年级={context.get('grade', '未知')}

从以下学生消息中提取可识别的新特征，以JSON格式返回。
只返回确实能从消息中推断出的维度信息，不要猜测。已明确的维度不要重复返回。

学生消息: "{message}"

JSON格式:
{{
    "knowledge_base": {{"cpp_level": "入门/基础/进阶/竞赛", "algorithm_level": "...", "math_level": "...", "data_structure_level": "..."}},
    "cognitive_style": {{"learning_type": "视觉型/听觉型/动手型/混合型", "thinking_style": "归纳思维/演绎思维/混合型", "preferred_media": "文字/视频/交互式代码/图表"}},
    "learning_goals": {{"short_term": "", "long_term": "", "target_competition": ""}},
    "error_patterns": {{"common_errors": [], "weak_areas": []}},
    "learning_pace": {{"weekly_hours": "", "session_duration": "", "study_frequency": ""}},
    "interests": {{"favorite_topics": [], "preferred_difficulty": "入门/基础/进阶/竞赛"}}
}}"""

        try:
            result = await chat_with_json_output(extract_prompt, message)
            # 过滤空值
            filtered = {}
            for dim, data in result.items():
                if isinstance(data, dict) and any(v for v in data.values() if v):
                    filtered[dim] = {k: v for k, v in data.items() if v}
            return filtered if filtered else None
        except Exception as e:
            print(f"[ProfileAgent] 提取失败: {e}")
            return None

    async def analyze_profile(self, context: dict) -> AsyncGenerator[str, None]:
        """生成完整的画像分析报告"""
        profile = context.get("profile") or {}
        prompt = f"""基于以下学生数据，生成一份详细的六维学习画像分析报告。

学生信息: {context.get('name', '学习者')}
专业: {context.get('major', '未设置')}
年级: {context.get('grade', '未设置')}

当前画像数据: {json.dumps(profile, ensure_ascii=False, indent=2)}

请生成结构化的分析报告，包含：
1. 📊 **画像概览** - 已收集的数据总览
2. 🎯 **各维度详细分析** - 六个维度的逐一解读
3. 💡 **学习建议** - 基于当前画像的学习建议
4. ⚠️ **数据缺口** - 哪些维度还需要更多信息
5. 🔄 **下一步行动** - 推荐的学习行动

用友好、鼓励的语气，使用Markdown格式。"""

        from llm_service import chat_completion_stream
        async for chunk in chat_completion_stream(
            "你是一位专业的学习分析顾问。请生成详细、有洞察力的学习画像分析。",
            prompt
        ):
            yield chunk

    async def generate_initial_questions(self) -> list:
        """生成初始对话问题，用于构建画像"""
        questions = [
            {
                "question": "你好！在开始学习之前，我想先了解一下你的情况。你目前C++编程的基础怎么样？比如有没有用过指针、类、STL这些？",
                "dimension": "knowledge_base",
                "field": "cpp_level",
            },
            {
                "question": "你学C++算法主要是为了什么目标呢？是为了通过课程考试，还是准备参加程序设计竞赛(比如ACM/蓝桥杯)？",
                "dimension": "learning_goals",
                "field": "long_term",
            },
            {
                "question": "你觉得自己更偏好哪种学习方式？比如喜欢看视频讲解、读文字教程、还是直接动手写代码实践？",
                "dimension": "cognitive_style",
                "field": "learning_type",
            },
            {
                "question": "你目前在算法和数据结构方面有哪些基础？比如排序、搜索、链表、树这些概念了解多少？",
                "dimension": "knowledge_base",
                "field": "algorithm_level",
            },
            {
                "question": "你大概每周能投入多少时间来学习算法？每次能专注学习多长时间？",
                "dimension": "learning_pace",
                "field": "weekly_hours",
            },
        ]
        return questions
