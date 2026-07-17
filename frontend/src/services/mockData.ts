// Mock 数据 — 当后端不可用时自动回退使用（全部空白，不预设任何假数据）

export const mockProfile = {
  student: { id: 1, name: '', major: '', grade: '' },
  profile: {
    knowledge_base: {},
    cognitive_style: {},
    learning_goals: {},
    error_patterns: {},
    learning_pace: {},
    interests: {},
    confidence_score: 0,
    version: 1,
  },
  dimensions_filled: 0,
}

export const mockDashboard = {
  student_id: 1,
  stats: {
    total_exercises: 0,
    correct_exercises: 0,
    accuracy: 0,
    total_resources: 0,
    total_paths: 0,
    total_assessments: 0,
    resources_by_type: {},
  },
}

export const mockResources = {
  student_id: 1,
  resources: [] as any[],
  by_type: {
    doc: [], mindmap: [], reading: [], video_script: [], code_case: [], exercise: [],
  },
}

export const mockChatHistory = {
  student_id: 1,
  messages: [],
}

// AI 未连接时的提示
export function getMockReply(msg: string): string {
  return `## ⚠️ AI 未连接

当前未检测到 DeepSeek API Key，无法使用 AI 智能体服务。

### 🔧 如何连接 AI？

1. 点击右上角的 **⚙️ 设置按钮**
2. 在 **API Key** 标签页中输入你的 DeepSeek API Key
3. 获取 API Key：访问 [platform.deepseek.com](https://platform.deepseek.com/api_keys) 注册并创建

### 📋 你也可以启动后端

在项目目录下运行：
\`\`\`bash
cd backend && python main.py
\`\`\`

启动后端后将走 CrewAI 多智能体编排模式，享受 6 个专业 Agent 的协同服务。

> 💡 配置好 API Key 后，刷新页面即可开始使用 AI 对话功能。`
}
