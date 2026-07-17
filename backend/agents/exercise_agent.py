"""
练习设计教练智能体 - 设计个性化练习题
"""
from typing import AsyncGenerator
from config import AGENT_ROLES
from llm_service import chat_completion_stream


class ExerciseAgent:
    def __init__(self):
        self.role = AGENT_ROLES["exercise"]
        self.system_prompt = self.role["system_prompt"]

    async def generate(
        self, topic: str, difficulty: str, context: dict
    ) -> AsyncGenerator[str, None]:
        """生成个性化练习题"""
        profile = context.get("profile") or {}
        error_patterns = profile.get("error_patterns", {})

        prompt = f"""请为学习者生成关于「{topic}」的练习题，难度为「{difficulty}」。

学生常见错误类型: {error_patterns.get('common_errors', [])}
薄弱领域: {error_patterns.get('weak_areas', [])}

请生成以下练习题组：

## 📝 基础巩固题

### 选择题 (2道)
- 4个选项，包含常见错误陷阱
- 每题标注考查知识点
- 附详细解析

### 填空题 (1道)
- 代码填空形式
- 考查关键语法或算法步骤

---

## 💻 代码实战题

### 算法设计题 (1道)
- 完整的题目描述(类似OJ题目格式)
- 输入输出格式说明
- 示例输入输出
- 数据范围说明
- 提示与思路引导
- 完整参考解答(C++代码)

---

## 🚀 挑战题 (1道)
- 综合性题目，需要灵活运用所学知识
- 可选的多种解法提示
- 优化思路引导

---

请确保:
1. 难度严格匹配「{difficulty}」水平
2. 选择题的干扰项针对学生易错点设计
3. 算法题包含完整可编译的C++参考代码
4. 使用Markdown格式，代码块用```cpp
5. 提供详细的解题思路和复杂度分析
6. 标注每道题的目标训练点"""

        async for chunk in chat_completion_stream(self.system_prompt, prompt):
            yield chunk

    async def generate_quiz(self, topic: str, count: int = 5) -> AsyncGenerator[str, None]:
        """生成快速测验"""
        prompt = f"""请生成{count}道关于「{topic}」的快速测验题。

题型分配：
- 2道选择题(4选项，含解析)
- 1道代码输出题(给出代码，问输出结果)
- 1道代码补全题
- 1道简答题(简述算法思想)

每道题都要有答案和解析。难度为入门到基础级别。"""

        async for chunk in chat_completion_stream(self.system_prompt, prompt):
            yield chunk
