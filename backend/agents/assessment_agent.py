"""
学习评估分析师智能体 - 多维度评估学习效果
"""
import json
from typing import AsyncGenerator
from config import AGENT_ROLES
from llm_service import chat_completion_stream


class AssessmentAgent:
    def __init__(self):
        self.role = AGENT_ROLES["assessment"]
        self.system_prompt = self.role["system_prompt"]

    async def evaluate(
        self, context: dict, stats: dict
    ) -> AsyncGenerator[str, None]:
        """生成综合评估报告"""
        profile = context.get("profile") or {}

        prompt = f"""请基于以下数据生成一份全面的学习评估报告。

## 学生画像
{json.dumps(profile, ensure_ascii=False, indent=2)}

## 学习数据
- 总练习题数: {stats.get('total_exercises', 0)}
- 正确数: {stats.get('correct_exercises', 0)}
- 正确率: {stats.get('accuracy', 0):.1%}
- 学习资源数: {stats.get('total_resources', 0)}

请生成以下结构的评估报告：

## 📊 学习数据总览
关键指标的概览和趋势分析

## 🎯 各维度掌握度评估
每个知识领域的掌握程度(用⭐表示，1-5星):
- C++语法基础
- 数据结构
- 算法设计
- 代码实现能力
- 问题分析能力

## 💪 优势领域
识别学生表现最好的领域

## ⚠️ 薄弱环节
需要加强的知识领域，附带具体原因分析

## 📈 进步趋势
根据现有数据评估学习进步方向

## 🔧 改进建议
1. 短期改进建议(本周内)
2. 中期改进建议(本月内)
3. 长期发展建议

## 🎓 学习策略调整
- 资源推送策略建议
- 学习路径调整建议
- 练习重点建议

## 📋 下一步行动计划
具体可执行的3-5个行动步骤

使用Markdown格式，用数据支撑结论，语气积极鼓励。"""

        async for chunk in chat_completion_stream(self.system_prompt, prompt):
            yield chunk

    async def quick_assessment(self, topic: str, student_answer: str, correct_answer: str) -> AsyncGenerator[str, None]:
        """快速评估单个回答"""
        prompt = f"""评估学生对以下题目的回答：

题目涉及知识点: {topic}

学生答案: {student_answer}

参考答案: {correct_answer}

请给出：
1. 正确性评估(完全正确/部分正确/错误)
2. 具体问题分析
3. 知识点薄弱处
4. 改进建议

简洁明了，鼓励性语气。"""

        async for chunk in chat_completion_stream(self.system_prompt, prompt):
            yield chunk
