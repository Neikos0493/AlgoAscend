"""
智能辅导老师智能体 - 提供即时答疑和多模态辅导
"""
from typing import AsyncGenerator
from config import AGENT_ROLES
from llm_service import chat_completion_stream


class TutorAgent:
    def __init__(self):
        self.role = AGENT_ROLES["tutor"]
        self.system_prompt = self.role["system_prompt"]

    async def answer(
        self, question: str, context: dict, history: list = None
    ) -> AsyncGenerator[str, None]:
        """回答学生的提问"""
        profile = context.get("profile") or {}
        kb = profile.get("knowledge_base", {})
        errors = profile.get("error_patterns", {})

        level = kb.get("cpp_level", "基础")
        weak_areas = errors.get("weak_areas", [])

        prompt = f"""学生提问: {question}

学生信息:
- C++水平: {level}
- 算法水平: {kb.get('algorithm_level', '未知')}
- 薄弱领域: {weak_areas}
- 学习风格: {profile.get('cognitive_style', {}).get('learning_type', '未知')}

请按照以下结构回答：

## 🤔 问题分析
简要分析问题的本质和涉及的考点

## 📖 知识点讲解
用通俗的语言解释相关概念

## 💻 代码实现
提供完整的C++代码实现，包含详细注释

## 🔍 逐步解析
如果问题较复杂，逐步拆解思路

## ⚠️ 常见错误
指出学生容易犯的错误，特别是{weak_areas if weak_areas else '初学者常见'}错误

## 💡 扩展思考
相关变式题目或进阶思考方向

## 📝 解题模板
如果适用，总结此类问题的通用解题模板

要求：
- 使用Markdown格式，代码块用```cpp
- 对{level}水平的讲解深度
- 鼓励性语气，先引导思考再给出答案
- 用ASCII图表辅助说明(如适用)"""

        async for chunk in chat_completion_stream(self.system_prompt, prompt):
            yield chunk

    async def explain_code(self, code: str, context: dict) -> AsyncGenerator[str, None]:
        """解释一段C++代码"""
        prompt = f"""请详细解释以下C++代码：

```cpp
{code}
```

请包括：
1. 代码的整体功能和目的
2. 逐段/逐行解释关键部分
3. 算法思想说明
4. 时间和空间复杂度
5. 潜在的bug或改进点
6. 如果适用，给出使用示例

使用Markdown格式，对{context.get('profile', {}).get('knowledge_base', {}).get('cpp_level', '基础')}水平的学习者讲解。"""

        async for chunk in chat_completion_stream(self.system_prompt, prompt):
            yield chunk

    async def debug_help(self, code: str, error_msg: str, context: dict) -> AsyncGenerator[str, None]:
        """帮助调试代码"""
        prompt = f"""学生遇到了以下编程问题：

代码：
```cpp
{code}
```

错误信息/现象：
{error_msg}

请帮助：
1. 定位错误的根本原因
2. 解释为什么会出现这个错误
3. 给出修改后的正确代码
4. 提供避免此类错误的建议

对{context.get('profile', {}).get('knowledge_base', {}).get('cpp_level', '基础')}水平的学习者，讲解要清晰易懂。"""

        async for chunk in chat_completion_stream(self.system_prompt, prompt):
            yield chunk
