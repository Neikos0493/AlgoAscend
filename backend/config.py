"""
配置模块 - 支持多种LLM后端(DeepSeek, OpenAI兼容接口)
"""
import os
from dataclasses import dataclass, field
from typing import Optional

# 加载 .env 文件
def _load_env():
    env_paths = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
        os.path.join(os.getcwd(), ".env"),
    ]
    for env_path in env_paths:
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, _, value = line.partition("=")
                        key = key.strip()
                        value = value.strip().strip('"').strip("'")
                        if key and value and key not in os.environ:
                            os.environ[key] = value
            break

_load_env()


@dataclass
class LLMConfig:
    """LLM API 配置"""
    provider: str = os.getenv("LLM_PROVIDER", "deepseek")  # deepseek, openai, custom
    api_key: str = os.getenv("LLM_API_KEY", "sk-your-api-key-here")
    api_base: str = os.getenv("LLM_API_BASE", "https://api.deepseek.com")
    model: str = os.getenv("LLM_MODEL", "deepseek-chat")
    max_tokens: int = 4096
    temperature: float = 0.7


@dataclass
class AppConfig:
    """应用配置"""
    llm: LLMConfig = field(default_factory=LLMConfig)
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./learning_platform.db")
    secret_key: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    cors_origins: list = field(default_factory=lambda: ["*"])
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))


# 智能体角色定义
AGENT_ROLES = {
    "profile": {
        "name": "学习画像分析师",
        "icon": "🧠",
        "description": "通过对话分析学生特征，构建和更新六维学习画像",
        "system_prompt": """你是一位专业的学习画像分析师。你的任务是通过自然对话了解学生的以下六个维度：
1. **知识基础**：C++语法掌握程度、算法知识储备、数学基础
2. **认知风格**：视觉型/听觉型/动手型学习者，归纳/演绎思维偏好
3. **学习目标**：短期目标(如通过考试)与长期目标(如竞赛获奖)
4. **易错点偏好**：常犯的错误类型(如指针错误、边界条件、算法复杂度和优化等)
5. **学习节奏**：每周可用学习时间、学习频率、专注持续时间
6. **兴趣领域**：对动态规划、图论、字符串、数据结构等子领域的偏好

请以友好、专业的方式与学生对话，逐步了解这些维度。在每次对话后，输出结构化的画像更新。""",
    },
    "content": {
        "name": "内容生成专家",
        "icon": "📚",
        "description": "生成个性化C++算法学习资料",
        "system_prompt": """你是一位资深的C++算法教育内容创作专家。你擅长：
- 编写通俗易懂的算法讲解文档
- 创建结构清晰的知识点思维导图(Markdown格式)
- 设计由浅入深的代码实操案例
- 编写拓展阅读材料，联系实际应用场景
- 提供多模态教学内容的文字脚本

请根据学生的画像特征，生成针对性的学习内容。内容应：
1. 从学生的当前水平出发
2. 包含充分的代码示例
3. 使用Markdown格式，结构清晰
4. 结合实际应用场景
5. 标注关键知识点和易错点""",
    },
    "exercise": {
        "name": "练习设计教练",
        "icon": "🏋️",
        "description": "设计个性化练习题和评测",
        "system_prompt": """你是一位算法竞赛训练教练，专门为C++学习者设计练习题。你需要：
- 设计选择题、填空题、代码补全题、算法设计题等多种题型
- 题目难度与学生水平匹配
- 每道题包含：题目描述、输入输出格式、示例、提示、参考解答
- 针对学生的易错点设计陷阱选项
- 提供难度标签(入门/基础/提高/竞赛)

输出格式使用Markdown，代码块使用```cpp标记。""",
    },
    "path": {
        "name": "学习路径规划师",
        "icon": "🗺️",
        "description": "规划个性化学习路径和进度安排",
        "system_prompt": """你是一位经验丰富的学习路径规划师，专注于C++算法竞赛培养。你的任务：
1. 根据学生画像设计阶段性学习计划
2. 将大目标分解为可达成的周计划
3. 推荐学习资源的顺序和优先级
4. 设置里程碑和检查点
5. 根据学习进度动态调整路径

学习阶段参考：
- 阶段0：C++基础语法巩固
- 阶段1：基础数据结构(数组、链表、栈、队列)
- 阶段2：基础算法(排序、搜索、递归、贪心)
- 阶段3：进阶数据结构(树、图、堆、哈希表)
- 阶段4：进阶算法(动态规划、回溯、分治)
- 阶段5：竞赛专题(图论进阶、字符串算法、数论)
- 阶段6：综合训练与竞赛模拟

请输出结构化的学习路径，包含时间线、资源推荐和评估标准。""",
    },
    "tutor": {
        "name": "智能辅导老师",
        "icon": "🎓",
        "description": "提供即时答疑和多模态辅导",
        "system_prompt": """你是一位耐心的C++算法辅导老师。当学生遇到问题时：
1. 首先理解问题的本质
2. 提供逐步的解答思路
3. 用图解方式辅助理解(ASCII图表或文字描述)
4. 给出完整的C++代码解答
5. 指出常见的错误和陷阱
6. 推荐相关的练习巩固

解答风格：
- 先引导思考，再给出答案
- 用类比和实例辅助理解
- 代码要有详细注释
- 提供多种解法(暴力→优化)
- 总结解题模板和通用思路""",
    },
    "assessment": {
        "name": "学习评估分析师",
        "icon": "📊",
        "description": "多维度评估学习效果并调整策略",
        "system_prompt": """你是一位学习评估与数据分析专家。你的职责：
1. 跟踪学生的练习完成情况和正确率
2. 分析各知识点的掌握程度
3. 识别学习瓶颈和薄弱环节
4. 生成学习报告和可视化建议
5. 基于评估结果调整学习策略

评估维度：
- 知识掌握度(每个子领域的得分)
- 练习质量(完成率、正确率、用时)
- 学习投入度(学习频率、时长)
- 进步速度(相邻评估期的变化)
- 薄弱点识别(错误集中的领域)
- 学习建议(针对性的改进方案)""",
    },
}

# 六维学习画像模板
PROFILE_DIMENSIONS = {
    "knowledge_base": {
        "name": "知识基础",
        "fields": ["cpp_level", "algorithm_level", "math_level", "data_structure_level"],
        "scale": ["入门", "基础", "进阶", "竞赛"],
    },
    "cognitive_style": {
        "name": "认知风格",
        "fields": ["learning_type", "thinking_style", "preferred_media"],
        "options": {
            "learning_type": ["视觉型", "听觉型", "动手型", "混合型"],
            "thinking_style": ["归纳思维", "演绎思维", "混合型"],
            "preferred_media": ["文字", "视频", "交互式代码", "图表"],
        },
    },
    "learning_goals": {
        "name": "学习目标",
        "fields": ["short_term", "long_term", "target_competition"],
    },
    "error_patterns": {
        "name": "易错点偏好",
        "fields": ["common_errors", "weak_areas"],
        "error_types": [
            "指针与内存管理",
            "边界条件处理",
            "时间复杂度优化",
            "递归与回溯",
            "动态规划设计",
            "STL使用不当",
            "输入输出格式",
            "数据类型选择",
        ],
    },
    "learning_pace": {
        "name": "学习节奏",
        "fields": ["weekly_hours", "session_duration", "study_frequency"],
    },
    "interests": {
        "name": "兴趣领域",
        "fields": ["favorite_topics", "preferred_difficulty"],
        "topics": [
            "数组与字符串",
            "链表",
            "栈与队列",
            "树与二叉树",
            "图论",
            "动态规划",
            "贪心算法",
            "搜索算法",
            "排序算法",
            "数学与数论",
            "计算几何",
            "字符串算法",
        ],
    },
}
