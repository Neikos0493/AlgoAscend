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

当前未配置任何大模型 API Key，无法使用 AI 智能体服务。

### 🔧 如何连接 AI？

1. 点击右上角的 **⚙️ 设置按钮**
2. 在 **API Key** 标签页中，选择任一平台填写 Key：

| 平台 | 免费额度 | 获取地址 |
|------|----------|----------|
| 🔮 DeepSeek | 注册送额度 | platform.deepseek.com |
| ⭐ 讯飞星火 | 200万tokens | xinghuo.xfyun.cn |
| 🌙 Kimi | 15元体验金 | platform.moonshot.cn |
| 🧠 智谱GLM | 注册送额度 | open.bigmodel.cn |
| ☁️ 通义千问 | 百万tokens | dashscope.aliyun.com |
| 🤖 OpenAI | 需付费 | platform.openai.com |
| 🧬 Claude | 需付费 | console.anthropic.com |

> 💡 推荐用讯飞星火，个人认证免费，也是软件杯 A3 赛题要求集成的平台。

配置好 API Key 后刷新页面，右上角即可选择对应模型开始对话。`
}
