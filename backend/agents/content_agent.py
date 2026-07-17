"""
内容生成专家智能体 - 生成个性化多模态学习资料
"""
import json
from typing import AsyncGenerator
from config import AGENT_ROLES
from llm_service import chat_completion_stream


class ContentAgent:
    def __init__(self):
        self.role = AGENT_ROLES["content"]
        self.system_prompt = self.role["system_prompt"]

    async def generate(
        self, topic: str, content_type: str, context: dict
    ) -> AsyncGenerator[str, None]:
        """根据内容类型生成相应的学习资料"""
        profile = context.get("profile") or {}
        kb = profile.get("knowledge_base", {})
        interests = profile.get("interests", {})
        errors = profile.get("error_patterns", {})

        level = kb.get("cpp_level", "基础")

        prompts = {
            "doc": self._build_doc_prompt(topic, level, profile),
            "mindmap": self._build_mindmap_prompt(topic, level),
            "reading": self._build_reading_prompt(topic, level, interests),
            "video_script": self._build_video_script_prompt(topic, level),
            "code_case": self._build_code_case_prompt(topic, level, errors),
        }

        prompt = prompts.get(content_type, prompts["doc"])

        async for chunk in chat_completion_stream(self.system_prompt, prompt):
            yield chunk

    def _build_doc_prompt(self, topic: str, level: str, profile: dict) -> str:
        return f"""请为一位{level}水平的C++学习者生成关于「{topic}」的详细讲解文档。

要求：
1. **学习目标** - 本节应掌握的知识点
2. **核心概念** - 用通俗语言解释核心概念，配合图示说明(用ASCII art或文字描述)
3. **C++代码实现** - 提供完整的、带注释的C++代码示例
4. **复杂度分析** - 时间复杂度和空间复杂度分析
5. **常见错误** - 学习者容易犯的错误和注意事项
6. **实际应用** - 该知识在实际项目或竞赛中的应用场景
7. **小结与练习** - 关键要点回顾

学习者的易错领域: {profile.get('error_patterns', {}).get('weak_areas', [])}
请在这些领域给出特别提示。

使用Markdown格式，代码块使用```cpp标记。"""

    def _build_mindmap_prompt(self, topic: str, level: str) -> str:
        return f"""请为「{topic}」生成一份Markdown格式的思维导图结构，适合{level}水平的学习者。

使用嵌套列表(缩进)来表示思维导图的层次结构：
- 根节点 → 一级分支 → 二级分支 → 三级细节

要求包含以下分支：
1. 核心概念与定义
2. 实现方法与代码模板
3. 经典变体与扩展
4. 时间复杂度分析
5. 常见应用场景
6. 易错点与注意事项
7. 相关算法联系

在适当位置用emoji标记重点内容。"""

    def _build_reading_prompt(self, topic: str, level: str, interests: dict) -> str:
        return f"""请为{level}水平的C++学习者生成关于「{topic}」的拓展阅读材料。

要求：
1. **行业应用** - 该算法/数据结构在工业界的实际应用案例
2. **竞赛视角** - 在算法竞赛中的考查方式和解题思路
3. **进阶方向** - 该主题的进阶知识方向和研究前沿
4. **推荐资源** - 进一步学习的书籍、文章、OJ题目推荐
5. **跨学科联系** - 与其他学科(数学、AI等)的联系

学习者兴趣领域: {interests.get('favorite_topics', [])}

使用Markdown格式，内容丰富有深度。"""

    def _build_video_script_prompt(self, topic: str, level: str) -> str:
        return f"""请为「{topic}」生成一份教学视频的文字脚本，目标观众是{level}水平的C++学习者。

脚本结构：
1. **开场** (30秒) - 引出问题和学习目标
2. **概念讲解** (2-3分钟) - 生动讲解核心概念，配合动画建议(用[动画: xxx]标注)
3. **代码演示** (3-5分钟) - 逐步展示C++代码实现
4. **实例运行** (1-2分钟) - 展示代码运行过程和结果
5. **要点总结** (30秒) - 关键takeaway

用[画面]、[配音]、[动画]、[代码高亮]等标记标注不同环节。"""

    def _build_code_case_prompt(self, topic: str, level: str, errors: dict) -> str:
        weak_areas = errors.get('weak_areas', [])
        weak_hint = f"\n请特别关注以下易错领域，给出正反对比: {weak_areas}" if weak_areas else ""

        return f"""请为{level}水平的C++学习者生成「{topic}」的完整代码实操案例。

要求：
1. **场景描述** - 实际编程场景说明
2. **完整代码** - 可运行的完整C++代码
3. **逐步解析** - 关键代码段的逐步解释
4. **常见错误对比** - 错误写法 vs 正确写法
5. **调试技巧** - 相关调试方法和工具使用
6. **变式练习** - 2-3个代码修改挑战
{weak_hint}

代码要有充分注释，使用```cpp标记。"""
