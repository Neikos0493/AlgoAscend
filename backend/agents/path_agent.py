"""
学习路径规划师智能体 - 规划个性化学习路径
"""
import json
from typing import AsyncGenerator
from config import AGENT_ROLES
from llm_service import chat_completion_stream


class PathAgent:
    def __init__(self):
        self.role = AGENT_ROLES["path"]
        self.system_prompt = self.role["system_prompt"]

    async def plan(self, context: dict) -> AsyncGenerator[str, None]:
        """生成个性化学习路径"""
        profile = context.get("profile") or {}
        kb = profile.get("knowledge_base", {})
        goals = profile.get("learning_goals", {})
        pace = profile.get("learning_pace", {})

        # 确定起始阶段
        algo_level = kb.get("algorithm_level", "入门")
        stage_map = {"入门": 0, "基础": 1, "进阶": 3, "竞赛": 5}
        start_stage = stage_map.get(algo_level, 0)

        long_term = goals.get("long_term", "掌握C++算法")

        prompt = f"""请为学习者设计一份详细的个性化C++算法学习路径。

## 学生信息
- 当前C++水平: {kb.get('cpp_level', '未知')}
- 算法基础: {algo_level}
- 数据结构基础: {kb.get('data_structure_level', '未知')}
- 数学基础: {kb.get('math_level', '未知')}
- 学习目标: {long_term}
- 竞赛目标: {goals.get('target_competition', '无')}
- 每周学习时间: {pace.get('weekly_hours', '未知')}
- 学习风格: {profile.get('cognitive_style', {}).get('learning_type', '未知')}
- 兴趣领域: {profile.get('interests', {}).get('favorite_topics', [])}

## 要求

请生成一个包含6个阶段的学习路径(从当前水平→竞赛水平)：

### 阶段定义
- **阶段0: C++基础巩固** - 语法、指针、引用、STL基础
- **阶段1: 基础数据结构** - 数组、链表、栈、队列、字符串
- **阶段2: 基础算法入门** - 排序、二分、递归、贪心入门
- **阶段3: 进阶数据结构** - 树、图、堆、并查集、哈希表
- **阶段4: 进阶算法** - 动态规划、回溯、分治、图论基础
- **阶段5: 竞赛专题** - 高级图论、字符串算法、数论、计算几何
- **阶段6: 综合训练** - 模拟竞赛、专题训练、查漏补缺

### 每个阶段包含：
1. 🎯 学习目标与预期成果
2. 📚 核心知识点清单
3. 📖 推荐学习资源(文档/视频/书籍)
4. 💻 必做练习(具体OJ平台题目编号)
5. ✅ 阶段检验标准
6. ⏱️ 建议学习时长

### 整体规划：
- 总时间线和里程碑
- 阶段间的依赖关系
- 难度递进说明
- 推荐的学习节奏
- 定期评估节点

使用Markdown格式，结构清晰，emoji辅助标记。"""

        async for chunk in chat_completion_stream(self.system_prompt, prompt):
            yield chunk

    async def adjust_path(self, context: dict, feedback: str) -> AsyncGenerator[str, None]:
        """根据反馈调整学习路径"""
        profile = context.get("profile") or {}

        prompt = f"""当前学生画像: {json.dumps(profile, ensure_ascii=False)}

学生反馈/当前情况: {feedback}

请基于以上信息，调整学习路径建议。重点：
1. 识别当前最需要强化的知识点
2. 建议调整学习顺序或节奏
3. 推荐针对性的补充资源

使用Markdown格式。"""

        async for chunk in chat_completion_stream(self.system_prompt, prompt):
            yield chunk
