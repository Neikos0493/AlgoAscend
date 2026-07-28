import {
  mockProfile,
  mockDashboard,
  mockResources,
  mockChatHistory,
  getMockReply,
} from './mockData'
import { searchKnowledge, searchProblems, fetchKBEntryContent } from './knowledgeService'

const API_BASE = '/api'

// ===== 三大分类模型注册表 =====

export type ModelCategory = 'llm' | 'image_gen' | 'digital_human'

export interface ModelEntry {
  id: string
  name: string
  provider: string       // 关联到 PROVIDERS 的 id
  category: ModelCategory
  description: string
  multimodal: boolean    // 是否支持图片输入
  creds: { key: string; label: string; type: 'text' | 'password'; placeholder: string }[]
  requiresExtra?: string // 额外说明（如讯飞文生图需要APP ID+Secret）
  api_base?: string      // 覆盖 provider 的 baseURL（讯飞不同模型路径不同）
  api_model?: string     // 覆盖 id，实际发往 API 的 model 参数（讯飞 X2 → spark-x）
}

export const MODEL_REGISTRY: ModelEntry[] = [
  // ===== LLM 文字模型 =====
  { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', provider: 'deepseek', category: 'llm', description: '旗舰 · 49B活跃 · 1M上下文', multimodal: false, creds: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-xxx...' }] },
  { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', provider: 'deepseek', category: 'llm', description: '快速 · 13B活跃 · 1M上下文', multimodal: false, creds: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-xxx...' }] },
  { id: 'spark-x2', name: '讯飞星火 X2', provider: 'xfyun', category: 'llm', description: '深度推理 · 最新 · 192K', multimodal: false, api_base: 'https://spark-api-open.xf-yun.com/x2/chat/completions', api_model: 'spark-x', creds: [{ key: 'api_key', label: 'APIPassword', type: 'password', placeholder: '控制台HTTP服务接口的APIPassword...' }], requiresExtra: '⚠️ 填「APIPassword」(HTTP协议)，不是APIKey！获取: console.xfyun.cn → X2 → HTTP服务接口认证信息' },
  { id: 'spark-x2-flash', name: '讯飞星火 X2 Flash', provider: 'xfyun', category: 'llm', description: '高速 · 256K · 2元/M', multimodal: false, api_base: 'https://spark-api-open.xf-yun.com/agent/v1/chat/completions', api_model: 'spark-x', creds: [{ key: 'api_key', label: 'APIPassword', type: 'password', placeholder: '控制台HTTP服务接口的APIPassword...' }], requiresExtra: '⚠️ 填「APIPassword」(HTTP协议)，不是APIKey！' },
  { id: 'spark-pro', name: '讯飞星火 Pro', provider: 'xfyun', category: 'llm', description: '强性能 · 128K', multimodal: false, api_base: 'https://spark-api-open.xf-yun.com/v1/chat/completions', api_model: 'generalv3', creds: [{ key: 'api_key', label: 'APIPassword', type: 'password', placeholder: '控制台HTTP服务接口的APIPassword...' }], requiresExtra: '⚠️ 填「APIPassword」(HTTP协议)，不是APIKey！' },
  { id: 'spark-ultra', name: '讯飞星火 Ultra', provider: 'xfyun', category: 'llm', description: '高性价比 · 指令跟随', multimodal: false, api_base: 'https://spark-api-open.xf-yun.com/v1/chat/completions', api_model: '4.0Ultra', creds: [{ key: 'api_key', label: 'APIPassword', type: 'password', placeholder: '控制台HTTP服务接口的APIPassword...' }], requiresExtra: '⚠️ 填「APIPassword」(HTTP协议)，不是APIKey！' },
  { id: 'spark-max', name: '讯飞星火 Max', provider: 'xfyun', category: 'llm', description: '旗舰 · 最强综合', multimodal: true, api_base: 'https://spark-api-open.xf-yun.com/v1/chat/completions', api_model: 'generalv3.5', creds: [{ key: 'api_key', label: 'APIPassword', type: 'password', placeholder: '控制台HTTP服务接口的APIPassword...' }], requiresExtra: '⚠️ 填「APIPassword」(HTTP协议)，不是APIKey！' },
  { id: 'spark-lite', name: '讯飞星火 Lite', provider: 'xfyun', category: 'llm', description: '永久免费 · 轻量', multimodal: false, api_base: 'https://spark-api-open.xf-yun.com/v1/chat/completions', api_model: 'lite', creds: [{ key: 'api_key', label: 'APIPassword', type: 'password', placeholder: '控制台HTTP服务接口的APIPassword...' }], requiresExtra: '⚠️ 填「APIPassword」(HTTP协议)，不是APIKey！' },
  { id: 'kimi-k3', name: 'Kimi K3', provider: 'kimi', category: 'llm', description: '旗舰 · 2.8T · 1M上下文', multimodal: true, creds: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-xxx...' }] },
  { id: 'kimi-k2.7-code', name: 'Kimi K2.7 Code', provider: 'kimi', category: 'llm', description: '最强编码 · 256K', multimodal: false, creds: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-xxx...' }] },
  { id: 'kimi-k2.7-code-highspeed', name: 'Kimi K2.7 高速', provider: 'kimi', category: 'llm', description: '编码极速 · 180T/s', multimodal: false, creds: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-xxx...' }] },
  { id: 'kimi-k2.6', name: 'Kimi K2.6', provider: 'kimi', category: 'llm', description: '多模态 · 256K', multimodal: true, creds: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-xxx...' }] },
  { id: 'glm-5.2', name: 'GLM-5.2', provider: 'glm', category: 'llm', description: '最新旗舰 · 1M · 编码SOTA', multimodal: true, creds: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxx.xxx...' }] },
  { id: 'glm-5.1', name: 'GLM-5.1', provider: 'glm', category: 'llm', description: '长程任务 · 200K', multimodal: false, creds: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxx.xxx...' }] },
  { id: 'glm-5', name: 'GLM-5', provider: 'glm', category: 'llm', description: 'Agentic · 200K', multimodal: false, creds: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxx.xxx...' }] },
  { id: 'glm-4.7-flash', name: 'GLM-4.7 Flash', provider: 'glm', category: 'llm', description: '免费 · 高速', multimodal: true, creds: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxx.xxx...' }] },
  { id: 'gpt-5.4', name: 'GPT-5.4', provider: 'openai', category: 'llm', description: '旗舰 · 1M上下文 · 多模态', multimodal: true, creds: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-proj-xxx...' }] },
  { id: 'gpt-5.4-pro', name: 'GPT-5.4 Pro', provider: 'openai', category: 'llm', description: '专业版 · 最高精度', multimodal: true, creds: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-proj-xxx...' }] },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', provider: 'openai', category: 'llm', description: '近前沿 · 轻量 · 多模态', multimodal: true, creds: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-proj-xxx...' }] },
  { id: 'gpt-5-nano', name: 'GPT-5 Nano', provider: 'openai', category: 'llm', description: '最便宜 · 400K', multimodal: false, creds: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-proj-xxx...' }] },
  { id: 'o3', name: 'o3', provider: 'openai', category: 'llm', description: '深度推理 · 200K', multimodal: true, creds: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-proj-xxx...' }] },
  { id: 'qwen3.7-max', name: 'Qwen3.7 Max', provider: 'qwen', category: 'llm', description: '旗舰 · 256K · 多模态', multimodal: true, creds: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-xxx...' }] },
  { id: 'qwen3.7-plus', name: 'Qwen3.7 Plus', provider: 'qwen', category: 'llm', description: '性价比主力 · 1/3价格', multimodal: false, creds: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-xxx...' }] },
  { id: 'qwen-turbo', name: 'Qwen Turbo', provider: 'qwen', category: 'llm', description: '极速低价', multimodal: false, creds: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-xxx...' }] },
  { id: 'qwq-plus', name: 'QwQ Plus', provider: 'qwen', category: 'llm', description: '深度推理', multimodal: false, creds: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-xxx...' }] },
  { id: 'claude-fable-5', name: 'Claude Fable 5', provider: 'claude', category: 'llm', description: '最强 · 1M · 多模态', multimodal: true, creds: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-ant-xxx...' }] },
  { id: 'claude-opus-4-8', name: 'Claude Opus 4.8', provider: 'claude', category: 'llm', description: '企业编码 · 1M', multimodal: true, creds: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-ant-xxx...' }] },
  { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', provider: 'claude', category: 'llm', description: '速度/智能 · 1M · 多模态', multimodal: true, creds: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-ant-xxx...' }] },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', provider: 'claude', category: 'llm', description: '最快 · 200K', multimodal: true, creds: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-ant-xxx...' }] },

  // ===== 文生图模型 =====
  { id: 'xfyun-tti', name: '讯飞星火文生图', provider: 'xfyun_image', category: 'image_gen', description: '讯飞星火 TTI v2.1 · 1024x1024', multimodal: false, creds: [
    { key: 'app_id', label: 'APP ID', type: 'text', placeholder: '从控制台获取' },
    { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'API Key' },
    { key: 'api_secret', label: 'API Secret', type: 'password', placeholder: 'API Secret' },
  ], requiresExtra: '获取地址: console.xfyun.cn → 创建应用 → 图像生成' },

  // ===== 数字人模型 =====
  { id: 'xfyun-digital-human', name: '讯飞AI虚拟人', provider: 'xfyun_vms', category: 'digital_human', description: '讯飞2D虚拟人 · 6种形象 · RTMP推流', multimodal: false, creds: [
    { key: 'app_id', label: 'APP ID', type: 'text', placeholder: '从控制台获取' },
    { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'API Key' },
    { key: 'api_secret', label: 'API Secret', type: 'password', placeholder: 'API Secret' },
  ], requiresExtra: '获取地址: console.xfyun.cn → 创建应用 → AI虚拟人' },
]

// 辅助函数：按分类获取模型
export function getModelsByCategory(cat: ModelCategory): ModelEntry[] {
  return MODEL_REGISTRY.filter(m => m.category === cat)
}

// 辅助函数：查找模型条目
export function getModelEntry(modelId: string): ModelEntry | undefined {
  return MODEL_REGISTRY.find(m => m.id === modelId)
}

// 辅助函数：获取多模态LLM模型
export function getMultimodalLLMs(): ModelEntry[] {
  return MODEL_REGISTRY.filter(m => m.category === 'llm' && m.multimodal)
}

// 分类标签
export const CATEGORY_LABELS: Record<ModelCategory, { name: string; icon: string; desc: string }> = {
  llm: { name: 'LLM 文字模型', icon: '💬', desc: '对话、推理、代码生成' },
  image_gen: { name: '文生图模型', icon: '🎨', desc: 'AI 插图与示意图生成' },
  digital_human: { name: '数字人模型', icon: '🤖', desc: 'AI 虚拟人讲解视频' },
}
export interface ProviderInfo {
  id: string
  name: string
  icon: string
  baseURL: string
  defaultModel: string
  models: { id: string; name: string; desc: string }[]
  placeholder: string
  anthropicFormat?: boolean  // true = 使用 Claude Messages API 格式
  noDirectCall?: boolean     // true = 不走前端直连，必须通过后端代理（CORS限制）
}

export const PROVIDERS: Record<string, ProviderInfo> = {
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: '🔮',
    baseURL: 'https://api.deepseek.com/chat/completions',
    defaultModel: 'deepseek-v4-flash',
    models: [
      { id: 'deepseek-v4-pro', name: 'V4 Pro', desc: '旗舰 · 49B活跃 · 1M上下文' },
      { id: 'deepseek-v4-flash', name: 'V4 Flash', desc: '快速 · 13B活跃 · 1M上下文' },
    ],
    placeholder: 'sk-xxx...',
  },
  xfyun: {
    id: 'xfyun',
    name: '讯飞星火',
    icon: '⭐',
    baseURL: 'https://spark-api-open.xf-yun.com/v1/chat/completions',
    defaultModel: 'spark-x2',
    noDirectCall: true,  // 讯飞 API 不支持浏览器 CORS，必须走后端代理
    models: [
      { id: 'spark-x2', name: 'Spark X2', desc: '深度推理 · 最新 · 192K' },
      { id: 'spark-x2-flash', name: 'Spark X2 Flash', desc: '高速 · 256K · 2元/M' },
      { id: 'spark-pro', name: 'Spark Pro', desc: '强性能 · 128K' },
      { id: 'spark-ultra', name: 'Spark Ultra', desc: '高性价比 · 指令跟随' },
      { id: 'spark-max', name: 'Spark Max', desc: '旗舰 · 最强综合' },
      { id: 'spark-lite', name: 'Spark Lite', desc: '永久免费 · 轻量' },
    ],
    placeholder: '控制台获取的 Key...',
  },
  kimi: {
    id: 'kimi',
    name: 'Kimi',
    icon: '🌙',
    baseURL: 'https://api.moonshot.cn/v1/chat/completions',
    defaultModel: 'kimi-k3',
    models: [
      { id: 'kimi-k3', name: 'Kimi K3', desc: '旗舰 · 2.8T · 1M上下文' },
      { id: 'kimi-k2.7-code', name: 'Kimi K2.7 Code', desc: '最强编码 · 256K' },
      { id: 'kimi-k2.7-code-highspeed', name: 'Kimi K2.7 高速', desc: '编码极速 · 180T/s' },
      { id: 'kimi-k2.6', name: 'Kimi K2.6', desc: '多模态 · 256K' },
    ],
    placeholder: 'sk-xxx...',
  },
  glm: {
    id: 'glm',
    name: '智谱 GLM',
    icon: '🧠',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    defaultModel: 'glm-5.2',
    models: [
      { id: 'glm-5.2', name: 'GLM-5.2', desc: '最新旗舰 · 1M · 编码SOTA' },
      { id: 'glm-5.1', name: 'GLM-5.1', desc: '长程任务 · 200K' },
      { id: 'glm-5', name: 'GLM-5', desc: 'Agentic · 200K' },
      { id: 'glm-4.7-flash', name: 'GLM-4.7 Flash', desc: '免费 · 高速' },
    ],
    placeholder: 'xxx.xxx...',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    baseURL: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-5-nano',
    models: [
      { id: 'gpt-5.4', name: 'GPT-5.4', desc: '旗舰 · 1M上下文' },
      { id: 'gpt-5.4-pro', name: 'GPT-5.4 Pro', desc: '专业版 · 最高精度' },
      { id: 'gpt-5-mini', name: 'GPT-5 Mini', desc: '近前沿 · 轻量' },
      { id: 'gpt-5-nano', name: 'GPT-5 Nano', desc: '最便宜 · 400K' },
      { id: 'o3', name: 'o3', desc: '深度推理 · 200K' },
    ],
    placeholder: 'sk-proj-xxx...',
  },
  qwen: {
    id: 'qwen',
    name: '通义千问',
    icon: '☁️',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    defaultModel: 'qwen3.7-plus',
    models: [
      { id: 'qwen3.7-max', name: 'Qwen3.7 Max', desc: '旗舰 · 256K · Agent' },
      { id: 'qwen3.7-plus', name: 'Qwen3.7 Plus', desc: '性价比主力 · 1/3价格' },
      { id: 'qwen-turbo', name: 'Qwen Turbo', desc: '极速低价' },
      { id: 'qwq-plus', name: 'QwQ Plus', desc: '深度推理' },
    ],
    placeholder: 'sk-xxx...',
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    icon: '🧬',
    baseURL: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-sonnet-5',
    models: [
      { id: 'claude-fable-5', name: 'Claude Fable 5', desc: '最强 · 1M · 2026.6' },
      { id: 'claude-opus-4-8', name: 'Claude Opus 4.8', desc: '企业编码 · 1M' },
      { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', desc: '速度/智能 · 1M' },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', desc: '最快 · 200K' },
    ],
    placeholder: 'sk-ant-xxx...',
    anthropicFormat: true,
  },
}

// 辅助函数：根据模型 ID 查找所属 provider
export function getProviderForModel(modelId: string): ProviderInfo | null {
  for (const p of Object.values(PROVIDERS)) {
    if (p.models.some(m => m.id === modelId)) return p
  }
  // fallback: 如果用 provider.id:model 格式（如 deepseek:deepseek-chat）
  const [pid] = modelId.split(':')
  return PROVIDERS[pid] || null
}

// 获取所有可用模型（扁平列表，用于选择器）
export function getAllModels(): { provider: ProviderInfo; model: ProviderInfo['models'][0] }[] {
  const result: { provider: ProviderInfo; model: ProviderInfo['models'][0] }[] = []
  for (const p of Object.values(PROVIDERS)) {
    for (const m of p.models) {
      result.push({ provider: p, model: m })
    }
  }
  return result
}

// 兼容旧代码
export const DEEPSEEK_MODELS = PROVIDERS.deepseek.models
const DEFAULT_API_KEY = ''  // 不内置任何 API Key，必须由用户配置

// 默认系统提示词
const DEFAULT_SYSTEM_PROMPT = `你是一位专业的 C++ 算法学习助手，名为"AlgoAscend"。背后有 6 个智能体协作：

🧠 学习画像分析师 — 分析学生的知识水平和学习偏好
📚 内容生成专家 — 生成个性化教程、思维导图、代码案例
🏋️ 练习设计教练 — 设计练习题并评估掌握程度
🗺️ 学习路径规划师 — 规划从入门到竞赛的学习路线
🎓 智能辅导老师 — 解答疑问、逐步引导、提供代码示例
📊 学习评估分析师 — 评估学习效果、识别薄弱环节

---

## 资源库概览（你可以实时调用）

本平台内置两大知识库和三大题库，你**必须主动使用工具**调用这些资源，而不是凭记忆回答：

### 双知识库（通过 search_knowledge / get_knowledge_entry 工具调用）
- **C++ 基础语法库**（菜鸟教程）：C++基础 / 面向对象 / 高级特性 / STL库 / C++参考 等分类
- **算法教程库**（Hello 算法）：复杂度分析 / 数据结构 / 数组与链表 / 栈与队列 / 哈希表 / 树 / 堆 / 图 / 搜索 / 排序 / 分治 / 回溯 / 动态规划 / 贪心 等

### 题库（通过 search_problems 工具调用）
- **牛客题库**：可按关键词精确搜索算法题，返回题目标题、难度、标签、链接
- 洛谷 / 力扣 题目需引导用户去「资源库」页面手动检索（暂未接入对话工具）

### 资源生成器（通过 generate_mindmap / generate_image / generate_ppt 工具调用）
- 思维导图、AI 插图（需讯飞星火配置）、PPT 课件

---

## 工具使用规则（重要！）

你有以下工具可用，**遇到对应场景必须主动调用，不要让用户自己去资源库找**：

| 工具 | 触发场景 | 说明 |
|------|---------|------|
| search_knowledge | 用户问具体知识点/概念/教程/语法时 | 搜双知识库，返回章节列表 |
| get_knowledge_entry | 用户想看某章节全文，或你需要引用权威原文时 | 需先用 search_knowledge 拿到 url |
| search_problems | 用户想做题/要练习题推荐/想找某知识点的相关题目时 | 搜牛客题库，返回题目卡片 |
| generate_mindmap | 用户要求生成思维导图/梳理知识结构/总结知识体系时 | 生成结构化思维导图 |
| generate_image | 用户要求画图/示意图时 | 需讯飞星火配置 |
| generate_ppt | 用户要求做PPT/课件/演示文稿时 | 生成 PPTX 文件 |
| generate_video | 用户要求生成算法动画/可视化视频/看清算法执行过程时 | 生成 Manim 脚本或渲染视频 |

### 调用示例
- 用户问"快速排序怎么实现" → 先调 search_knowledge("快速排序") 拿到相关章节，再结合知识库内容回答并引用链接
- 用户说"给我推荐几道动态规划题" → 调 search_problems("动态规划")，题目会以卡片形式展示
- 用户说"帮我梳理排序算法的知识结构" → 调 generate_mindmap("排序算法")
- 用户说"详细讲讲 vector 的用法" → 先 search_knowledge("vector")，再 get_knowledge_entry 拿全文

### ⚠️ 思维导图强约束（最高优先级）
**当用户提到"思维导图"、"知识结构"、"梳理知识"、"知识体系"、"知识树"时，你必须且只能调用 generate_mindmap 工具。**
- 工具会调用资源库的 AI 资源生成器，产出结构化 JSON 树，并在对话中以 SVG 图形展示（从左到右的水平树）
- **严禁**在回复文本中用以下方式自己"画"思维导图：
  - Markdown 缩进列表（- / * 嵌套）
  - ASCII 字符画（├─ └─ │ 等符号）
  - Markdown 表格罗列知识点
  - 代码块画树形结构
- 这些文本形式不会被渲染成图形，用户体验很差。**只有调用 generate_mindmap 工具才会产出真正的可视化思维导图。**
- 调用工具后，回复文本中只需用一两句话点明主题即可，不要再重复罗列分支。

### 引用规则
- 引用知识库内容时，必须附带来源链接，格式为 [《章节标题》](URL)
- 推荐题目时，必须附带题目链接

---

## 回复规则

### 格式要求
- 使用 Markdown，层次分明（## → ### → > 引用）
- 代码块用 \`\`\`cpp 标记，附带复杂度注释
- 表格用于对比数据（算法复杂度、容器对比等）
- 善用 emoji 标记章节，增强可读性

### 内容要求
- 算法概念必须给出**代码示例 + 时间复杂度分析**
- 涉及多个解法时，按"暴力→优化→最优"递进呈现
- 练习题给出**输入/输出示例**和**思路提示**，不要直接给完整答案
- 推荐下一步学习时，给出具体理由

### 风格
- 友好且专业，像一位耐心的竞赛教练
- 中文为主，技术术语保留英文
- 对初学者的常见误区主动提醒（用 > ⚠️ 格式）
- 根据用户水平动态调整深度（入门 = 多解释基础概念，进阶 = 直接切入核心）

### 互动规则
- 用户问"帮我规划学习路径"→ 给出分阶段、带时间估计的路线图
- 用户问"这道题怎么做"→ 先给思路，再给代码框架，最后给完整代码
- 用户问"我的水平能参加蓝桥杯吗"→ 评估薄弱环节，推荐专项训练
- 不确定时反问用户确认，而不是猜测`

// ===== 从 localStorage 读取设置 =====
function getSettings() {
  try {
    const raw = localStorage.getItem('algoascend_settings')
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {}
}

/** 获取LLM模型的API Key */
export function getLLMApiKey(modelId: string): string {
  const s = getSettings()
  const modelCreds = s.modelCreds || {}
  return modelCreds[modelId]?.api_key || ''
}

/** 获取模型凭证（通用） */
function getModelCreds(modelId: string): Record<string, string> {
  const s = getSettings()
  const modelCreds = s.modelCreds || {}
  return modelCreds[modelId] || {}
}

/** 获取当前选中的各类模型ID */
export function getSelectedModelId(category: string = 'llm'): string {
  const s = getSettings()
  const ids = s.selectedModelIds || {}
  const defaults: Record<string, string> = { llm: 'deepseek-v4-flash', image_gen: 'xfyun-tti', digital_human: 'xfyun-digital-human' }
  return ids[category] || defaults[category] || 'deepseek-v4-flash'
}

/** 检查当前LLM模型是否支持多模态 */
function isCurrentModelMultimodal(): boolean {
  const modelId = getSelectedModelId('llm')
  const entry = getModelEntry(modelId)
  return entry?.multimodal || false
}

// ===== 构建对话消息列表 =====
interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// 每次独立尝试后端，不记忆失败状态（交给 localStorage 兜底）
async function tryFetch(url: string, options?: RequestInit) {
  try {
    const resp = await fetch(url, options)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    return resp
  } catch {
    throw new Error('backend unavailable')
  }
}

export async function sendMessage(
  message: string,
  studentId: number = 1,
  onChunk: (data: any) => void,
  onDone: () => void,
  onError: (error: string) => void,
  model: string = 'deepseek-v4-flash',
  history: ChatMessage[] = [],
  overrideSystemPrompt?: string,
  images?: { base64: string; mimeType: string }[],
): Promise<void> {
  const settings = getSettings()
  const provider = getProviderForModel(model)
  const modelEntry = getModelEntry(model)
  const systemPrompt = overrideSystemPrompt || settings.systemPrompt || DEFAULT_SYSTEM_PROMPT
  const maxTokens = settings.maxTokens || 4096
  const temperature = settings.temperature ?? 0.7
  const maxContext = settings.maxContextMessages || 20

  // 从新版凭证系统读取
  const apiKey = getLLMApiKey(model)

  // ===== 优先：直接调对应 Provider 的 API =====
  if (apiKey && provider && !provider.noDirectCall) {
    // Claude 使用不同的 API 格式（Messages API），直接回退到后端
    if (provider.anthropicFormat) {
      console.log('Claude 使用 Anthropic Messages API 格式，回退到后端')
    } else {
    try {
      // 发送 pipeline 信息
      onChunk({
        type: 'pipeline',
        agents: [
          { key: 'orchestrator', name: '多智能体编排器', icon: '⚡' },
          { key: 'content', name: '内容生成专家', icon: '📚' },
        ],
        tasks: [
          { name: '分析用户意图', agent_key: 'orchestrator' },
          { name: '生成个性化回答', agent_key: 'content' },
        ],
      })
      onChunk({ type: 'agent_start', agent_key: 'orchestrator' })
      await sleep(200)
      onChunk({ type: 'agent_done', agent_key: 'orchestrator' })
      onChunk({ type: 'agent_start', agent_key: 'content' })

      // 构建消息列表：系统提示 + 截取的上下文 + 当前消息
      const recentHistory = history.slice(-maxContext * 2) // 每轮 = 用户+助手 = 2条

      // 支持多模态：如果有图片，构建 content 数组格式
      const userContent: any = images && images.length > 0
        ? [
            { type: 'text', text: message },
            ...images.map(img => ({
              type: 'image_url',
              image_url: { url: `data:${img.mimeType};base64,${img.base64}` }
            }))
          ]
        : message

      const messages = [
        { role: 'system', content: systemPrompt },
        ...recentHistory,
        { role: 'user', content: userContent },
      ]

      // 优先使用模型条目的 api_base，其次 provider 的 baseURL
      const apiUrl = modelEntry?.api_base || provider.baseURL
      // 优先使用模型条目的 api_model，其次用 id
      const apiModel = modelEntry?.api_model || model

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: apiModel,
          messages: messages,
          stream: true,
          temperature: temperature,
          max_tokens: maxTokens,
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`API ${response.status}: ${errText.slice(0, 200)}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('不支持流式读取')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          const dataStr = trimmed.slice(6)
          if (dataStr === '[DONE]') {
            onChunk({ type: 'agent_done', agent_key: 'content' })
            onDone()
            return
          }
          try {
            const json = JSON.parse(dataStr)
            const delta = json.choices?.[0]?.delta
            if (delta?.content) {
              onChunk({ type: 'text', agent: 'content', content: delta.content })
            }
          } catch { /* skip malformed JSON */ }
        }
      }

      onChunk({ type: 'agent_done', agent_key: 'content' })
      onDone()
      return
    } catch (err: any) {
      console.warn(`${provider?.name || 'API'} 失败，回退:`, err.message)
      // 回退到后端或 mock
    }
    }  // end non-anthropic
  }

  // ===== 回退：后端 CrewAI 代理 =====
  try {
    const response = await fetch(`${API_BASE}/chat/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        message, student_id: studentId, model, stream: true,
        api_key: apiKey,
        api_base: modelEntry?.api_base || provider?.baseURL || '',
        api_model: modelEntry?.api_model || model,
      }),
    })
    if (!response.ok) {
      // 后端返回了错误（如 401/500），提取错误信息并报告给用户
      let errMsg = `后端错误 (HTTP ${response.status})`
      try {
        const errBody = await response.json()
        if (errBody.detail) errMsg = errBody.detail
      } catch { /* ignore */ }
      onError(errMsg)
      return
    }
    const reader = response.body?.getReader()
    if (!reader) throw new Error('不支持流式读取')
    const decoder = new TextDecoder()
    let buf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() || ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6)
          try {
            const data = JSON.parse(dataStr)
            if (data.type === 'done') { onDone(); return }
            if (data.type === 'error') { onError(data.content); return }
            onChunk(data)
          } catch { /* skip */ }
        }
      }
    }
    onDone()
    return
  } catch (e: any) {
    // 仅当后端完全不可达（网络错误）时才走 mock 回退
    console.warn('后端不可达，使用 mock 回退:', e.message)
  }

  // ===== 最后：Mock 回退 =====
  const reply = getMockReply(message)
  const agentType = detectAgent(message)

  onChunk({
    type: 'pipeline',
    agents: [
      { key: 'profile', name: '学习画像分析师', icon: '🧠' },
      { key: 'content', name: '内容生成专家', icon: '📚' },
    ],
    tasks: [
      { name: '分析用户意图与画像匹配', agent_key: 'profile' },
      { name: '生成个性化回答', agent_key: 'content' },
    ],
  })
  onChunk({ type: 'agent_start', agent_key: 'profile' })
  await sleep(300)
  onChunk({ type: 'agent_done', agent_key: 'profile' })
  onChunk({ type: 'agent_start', agent_key: 'content' })
  await sleep(200)

  const chunks = splitChunks(reply, 3 + Math.floor(Math.random() * 6))
  for (const chunk of chunks) {
    onChunk({ type: 'text', agent: agentType, content: chunk })
    await sleep(10 + Math.random() * 25)
  }
  onChunk({ type: 'agent_done', agent_key: 'content' })
  onDone()
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

function splitChunks(text: string, size: number): string[] {
  const chunks: string[] = []
  let i = 0
  while (i < text.length) {
    let end = Math.min(i + size, text.length)
    const nl = text.indexOf('\n', i)
    if (nl > i && nl < end + 10) end = Math.min(nl + 1, text.length)
    chunks.push(text.slice(i, end))
    i = end
  }
  return chunks
}

function detectAgent(msg: string): string {
  const lower = msg.toLowerCase()
  if (lower.includes('画像')) return 'profile'
  if (lower.includes('练习') || lower.includes('题目')) return 'exercise'
  if (lower.includes('路径') || lower.includes('路线')) return 'path'
  if (lower.includes('评估')) return 'assessment'
  return 'content'
}

export async function fetchDashboard(studentId: number = 1) {
  try { return await (await tryFetch(`${API_BASE}/dashboard/${studentId}`)).json() } catch { return mockDashboard }
}

export async function fetchProfile(studentId: number = 1) {
  try { return await (await tryFetch(`${API_BASE}/profile/${studentId}`)).json() } catch { return mockProfile }
}

export async function fetchResources(studentId: number = 1) {
  try { return await (await tryFetch(`${API_BASE}/resources/${studentId}`)).json() } catch { return mockResources }
}

export async function fetchHistory(studentId: number = 1, limit: number = 50) {
  try { return await (await tryFetch(`${API_BASE}/chat/history/${studentId}?limit=${limit}`)).json() } catch { return mockChatHistory }
}

export async function clearHistory(studentId: number = 1) {
  try { await tryFetch(`${API_BASE}/chat/history/${studentId}`, { method: 'DELETE' }); return { ok: true } }
  catch { return { ok: true } }
}

export async function resetProfile(studentId: number = 1) {
  try {
    return await (await tryFetch(`${API_BASE}/profile/${studentId}/reset`, { method: 'DELETE' })).json()
  } catch {
    // mock 回退：清空 mock 数据
    ;(mockProfile as any).profile = {
      knowledge_base: {}, cognitive_style: {}, learning_goals: {},
      error_patterns: {}, learning_pace: {}, interests: {},
      confidence_score: 0, version: 0,
    }
    ;(mockProfile as any).dimensions_filled = 0
    ;(mockProfile as any).student = { id: 1, name: '学习者', major: null, grade: null }
    ;(mockDashboard as any).stats = {
      total_exercises: 0, correct_exercises: 0, accuracy: 0,
      total_resources: 23, total_paths: 0, total_assessments: 0,
      resources_by_type: {},
    }
    return { status: 'ok', message: '画像已重置（Mock 模式）' }
  }
}

export async function updateStudent(studentId: number, data: { name?: string; major?: string; grade?: string }) {
  const params = new URLSearchParams()
  if (data.name) params.set('name', data.name)
  if (data.major) params.set('major', data.major)
  if (data.grade) params.set('grade', data.grade)
  try { return await (await tryFetch(`${API_BASE}/profile/${studentId}?${params.toString()}`, { method: 'PUT' })).json() }
  catch {
    if (data.name) mockProfile.student.name = data.name
    if (data.major) mockProfile.student.major = data.major
    if (data.grade) mockProfile.student.grade = data.grade
    return { ok: true }
  }
}

// 导出默认提示词（给设置页参考）
export { DEFAULT_SYSTEM_PROMPT }

// ===== 代码实操案例生成 =====

export async function generateCodeCase(params: {
  topic: string
  model?: string
}): Promise<{ status: string; resource_id: number; content: string; topic: string }> {
  const model = params.model || getSelectedModelId('llm')
  const provider = getProviderForModel(model)
  const apiKey = getLLMApiKey(model)
  const apiBase = provider?.baseURL ? new URL(provider.baseURL).origin : ''

  const resp = await fetch(`${API_BASE}/resources/generate-code-case`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: params.topic,
      api_key: apiKey, model, api_base: apiBase,
    }),
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: '生成失败' }))
    throw new Error(err.detail || '代码实操生成失败')
  }
  return resp.json()
}

// ===== 实践项目案例生成 =====

export async function generateProject(params: {
  topic: string
  model?: string
}): Promise<{ status: string; resource_id: number; content: string; topic: string }> {
  const model = params.model || getSelectedModelId('llm')
  const provider = getProviderForModel(model)
  const apiKey = getLLMApiKey(model)
  const apiBase = provider?.baseURL ? new URL(provider.baseURL).origin : ''

  const resp = await fetch(`${API_BASE}/resources/generate-project`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: params.topic,
      api_key: apiKey, model, api_base: apiBase,
    }),
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: '生成失败' }))
    throw new Error(err.detail || '实践项目生成失败')
  }
  return resp.json()
}

// ===== 获取个性化推荐 =====

export interface RecommendationItem {
  type: string
  title: string
  description: string
  topic: string
  priority: 'high' | 'medium' | 'low'
  reason: string
}

export async function fetchRecommendations(studentId: number = 1): Promise<{
  status: string
  recommendations: RecommendationItem[]
  study_tip: string
  source: string
}> {
  const resp = await fetch(`${API_BASE}/resources/recommend/${studentId}`)
  if (!resp.ok) return { status: 'error', recommendations: [], study_tip: '', source: 'error' }
  return resp.json()
}

// ===== 运行评估 =====

export async function runAssessment(params: {
  studentId?: number
}): Promise<{
  status: string
  assessment_id: number
  report: string
  adjustments: any
  stats: any
  recommended_resources: any[]
}> {
  const model = getSelectedModelId('llm')
  const provider = getProviderForModel(model)
  const apiKey = getLLMApiKey(model)

  const resp = await fetch(`${API_BASE}/assessment/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      student_id: params.studentId || 1,
      api_key: apiKey,
      model,
    }),
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: '评估失败' }))
    throw new Error(err.detail || '学习评估失败')
  }
  return resp.json()
}

// ===== 自动分析引擎 =====
// 对话完成后自动提取画像/仪表盘/路径数据

export interface AnalysisResult {
  profile_updates: {
    knowledge_base?: { cpp_level?: string; algorithm_level?: string; math_level?: string; data_structure_level?: string }
    cognitive_style?: { learning_type?: string; thinking_style?: string; preferred_media?: string }
    learning_goals?: { short_term?: string; long_term?: string; target_competition?: string }
    error_patterns?: { common_errors?: string[]; weak_areas?: string[] }
    learning_pace?: { weekly_hours?: string; session_duration?: string; study_frequency?: string }
    interests?: { favorite_topics?: string[]; preferred_difficulty?: string }
    confidence_score?: number
  }
  dashboard_updates: {
    topics_discussed?: string[]
    exercises_mentioned?: number
    new_exercise_count?: number
    resources_generated?: number
    assessments_conducted?: number
    paths_created?: number
    resources_by_type?: Record<string, number>
  }
  path_updates: {
    stage_progress?: { stageId: number; progress: number; completedMilestones: string[] }[]
  }
  summary: string
}

const ANALYSIS_SYSTEM_PROMPT = `你是一个学习数据分析引擎。从对话中提取结构化学习数据，返回严格JSON。

## 规则
- 只提取明确信息，不推测
- 无信息填null或空值
- 用户说"做了N道题"或有练习行为 → exercises_mentioned=N

## 画像字段
- knowledge_base: { cpp_level, algorithm_level, math_level, data_structure_level }  // 入门/基础/良好/熟练/精通
- cognitive_style: { learning_type, thinking_style, preferred_media }
- learning_goals: { short_term, long_term, target_competition }  // 蓝桥杯/ACM/LeetCode/考研
- error_patterns: { common_errors: string[], weak_areas: string[] }
- learning_pace: { weekly_hours, session_duration, study_frequency }  // 每周N小时/每天/经常/偶尔
- interests: { favorite_topics: string[], preferred_difficulty }  // 入门/基础/中等/进阶/竞赛
- confidence_score: 0-1小数

## 仪表盘字段（只统计本轮新增）
- topics_discussed: string[]
- exercises_mentioned: number  // 用户提到练习/做题的数量，如"做了3道题"→3
- resources_generated: number  // AI生成了多少学习资料
- assessments_conducted: number
- paths_created: number
- resources_by_type: { "doc": N, "code": N, ... }

## 路径阶段 (stageId: 0-6)
0=C++基础,1=数据结构,2=基础算法,3=进阶数据结构,4=进阶算法,5=竞赛专题,6=综合训练

## 返回格式（只输出JSON，不要markdown包裹）
{"profile_updates":{},"dashboard_updates":{},"path_updates":{"stage_progress":[]},"summary":""}`

export async function analyzeConversation(
  messages: { role: string; content: string }[],
): Promise<AnalysisResult | null> {
  const apiKey = getLLMApiKey(getSelectedModelId('llm'))

  if (!apiKey) {
    console.log('[分析引擎] 未配置 API Key，跳过自动分析')
    return null
  }

  // 只取最近8轮对话（16条消息）
  const recentMessages = messages.slice(-16)
  const conversationText = recentMessages
    .map(m => `[${m.role === 'user' ? '用户' : 'AI'}]: ${m.content.slice(0, 800)}`)
    .join('\n\n')

  try {
    const response = await fetch(PROVIDERS.deepseek.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
          { role: 'user', content: `分析以下对话：\n\n${conversationText}` },
        ],
        stream: false,
        temperature: 0.1,
        max_tokens: 2048,
      }),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.log('[分析引擎] API 失败:', response.status, errText.slice(0, 200))
      return null
    }

    const data = await response.json()
    const content: string = data.choices?.[0]?.message?.content || ''

    console.log('[分析引擎] 原始响应:', content.slice(0, 300))

    // 提取 JSON：去掉可能的 markdown 包裹
    let jsonStr = content.trim()
    // 去掉 ```json ... ``` 包裹
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
    if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim()
    // 找到第一个 { 到最后一个 }
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (jsonMatch) jsonStr = jsonMatch[0]

    const result: AnalysisResult = JSON.parse(jsonStr)

    // 验证
    if (!result.profile_updates && !result.dashboard_updates && !result.path_updates) {
      console.log('[分析引擎] 无有效数据，跳过更新')
      return null
    }

    console.log('[分析引擎] 分析完成:', JSON.stringify(result).slice(0, 300))
    return result
  } catch (err: any) {
    console.log('[分析引擎] 异常:', err.message, err.stack?.slice(0, 200))
    return null
  }
}

// ===== 多模态资源生成 API =====

export async function generateImage(params: {
  prompt: string
  width?: number
  height?: number
  appId: string
  apiKey: string
  apiSecret: string
  title?: string
  topic?: string
}): Promise<{ resource_id: number; filename: string; url: string; base64: string }> {
  const resp = await fetch(`${API_BASE}/resources/generate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: params.prompt,
      width: params.width || 1024,
      height: params.height || 1024,
      app_id: params.appId,
      api_key: params.apiKey,
      api_secret: params.apiSecret,
      title: params.title || '',
      topic: params.topic || '',
    }),
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: '生成失败' }))
    throw new Error(err.detail || '图片生成失败')
  }
  return resp.json()
}

export async function generatePPT(params: {
  topic: string
  title?: string
  outline?: string
  slidesCount?: number
}): Promise<{ status: string; resource_id: number; filename: string; url: string; slides: number; title: string }> {
  const model = getSelectedModelId('llm')
  const provider = getProviderForModel(model)
  const apiKey = getLLMApiKey(model)
  const apiBase = provider?.baseURL ? (() => {
    try { const u = new URL(provider.baseURL); return u.origin } catch { return '' }
  })() : ''

  const resp = await fetch(`${API_BASE}/resources/generate-ppt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: params.topic,
      title: params.title || '',
      outline: params.outline || '',
      slides_count: params.slidesCount || 6,
      api_key: apiKey,
      model: model,
      api_base: apiBase,
    }),
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: '生成失败' }))
    throw new Error(err.detail || 'PPT 生成失败')
  }
  return resp.json()
}

export async function generateMindmap(params: {
  prompt: string
  title?: string
  topic?: string
  model?: string
}): Promise<{ resource_id: number; tree: { root: string; children: any[] }; mermaid?: string }> {
  const model = params.model || getSelectedModelId('llm')
  const provider = getProviderForModel(model)
  const apiKey = getLLMApiKey(model)
  const apiBase = provider?.baseURL ? (() => {
    try { const u = new URL(provider.baseURL); return u.origin } catch { return '' }
  })() : ''

  const resp = await fetch(`${API_BASE}/resources/generate-mindmap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: params.prompt,
      title: params.title || '',
      topic: params.topic || '',
      api_key: apiKey,
      model: model,
      api_base: apiBase,
    }),
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: '生成失败' }))
    throw new Error(err.detail || '思维导图生成失败')
  }
  return resp.json()
}

export async function generateDoc(params: {
  prompt: string
  title?: string
  topic?: string
}): Promise<{ resource_id: number; content: string }> {
  const resp = await fetch(`${API_BASE}/resources/generate-doc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: '生成失败' }))
    throw new Error(err.detail || '文档生成失败')
  }
  return resp.json()
}

// ===== 视频/动画生成 =====

export async function generateVideo(params: {
  topic: string
  title?: string
  count?: number
  style?: string
  model?: string
  mode?: 'manim' | 'xfyun'
}): Promise<{
  status: string
  resource_id: number
  topic: string
  script: string
  script_filename: string
  video_url: string
  render_status: string
  render_output?: string
  install_guide: string
}> {
  const model = params.model || getSelectedModelId('llm')
  const provider = getProviderForModel(model)
  const apiKey = getLLMApiKey(model)
  const apiBase = provider?.baseURL ? (() => {
    try {
      const u = new URL(provider.baseURL)
      return u.origin
    } catch { return '' }
  })() : ''

  // 如果选择了讯飞数字人模式，走数字人API
  if (params.mode === 'xfyun') {
    const xfyunCreds = getModelCreds('xfyun-digital-human')
    // 数字人需要 LLM 来生成讲解文稿，取当前选中的 LLM 模型
    const llmModelId = getSelectedModelId('llm')
    const llmKey = getLLMApiKey(llmModelId)
    const llmEntry = getModelEntry(llmModelId)
    const llmProvider = getProviderForModel(llmModelId)
    // 优先用 modelEntry 的 api_base（含正确端点路径），否则用 provider 的 origin
    const llmBase = llmEntry?.api_base
      || (llmProvider?.baseURL ? (() => {
          try { return new URL(llmProvider.baseURL).origin } catch { return '' }
        })() : '')
    const llmApiModel = llmEntry?.api_model || llmModelId

    const resp = await fetch(`${API_BASE}/resources/generate-xfyun-digital-human`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: params.topic,
        title: params.title || '',
        app_id: xfyunCreds.app_id || '',
        api_key: xfyunCreds.api_key || '',
        api_secret: xfyunCreds.api_secret || '',
        avatar: getModelCreds('xfyun-digital-human').avatar || 'male_business',
        llm_api_key: llmKey,
        llm_model: llmApiModel,
        llm_api_base: llmBase,
      }),
    })
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: '数字人视频生成失败' }))
      throw new Error(err.detail || '数字人视频生成失败')
    }
    const data = await resp.json()
    return {
      status: data.status,
      resource_id: data.resource_id || 0,
      topic: data.topic,
      script: data.script || '',
      script_filename: data.script_filename || '',
      video_url: data.video_url || '',
      render_status: data.record_status || data.drive_status || 'script_only',
      render_output: data.message || '',
      install_guide: '',
    }
  }

  // Manim 模式
  const resp = await fetch(`${API_BASE}/resources/generate-video`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: params.topic,
      title: params.title || '',
      count: params.count || 16,
      style: params.style || 'dark',
      api_key: apiKey,
      model: model,
      api_base: apiBase,
    }),
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: '视频生成失败' }))
    throw new Error(err.detail || '视频生成失败')
  }
  return resp.json()
}

// ===== AI 工具定义（Function Calling） =====

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, { type: string; description: string; enum?: string[] }>
      required: string[]
    }
  }
}

const TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'generate_mindmap',
      description: '【强约束】调用资源库的 AI 资源生成器，生成结构化思维导图并在对话中以 SVG 图形展示。当用户要求生成思维导图、梳理知识结构、总结知识体系、整理知识点、画知识树时，必须调用本工具。严禁在回复文本中用 Markdown 缩进列表、ASCII 字符画、表格等方式自己"画"思维导图——那样不会渲染成图形。只有调用本工具才会产出真正的可视化思维导图。',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: '思维导图的核心主题，如"排序算法"、"动态规划"、"二叉树遍历"、"C++ STL容器"' },
        },
        required: ['topic'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_image',
      description: '生成算法/编程相关的示意图或教学插图。当用户要求画图、生成图片、制作示意图时使用。需要先配置讯飞星火文生图。',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: '图片描述（中文），如"冒泡排序算法示意图，蓝色背景，简洁风格"' },
        },
        required: ['prompt'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_ppt',
      description: '生成算法/编程主题的PPT课件。只需提供主题描述，AI会自动设计标题、生成大纲并细化每页内容，最终输出PPTX文件。当用户要求做PPT、生成课件、制作演示文稿时使用。',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'PPT主题描述，越详细越好。如"帮我做一个关于快速排序的PPT，包含原理、步骤、代码示例和复杂度分析"' },
        },
        required: ['topic'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_video',
      description: '调用资源库的 AI 视频生成器，生成算法可视化动画视频（Manim 脚本）。当用户要求生成算法动画、算法可视化视频、想看清算法执行过程时使用。支持任意算法主题，如排序、搜索、图论、树遍历、动态规划等。',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: '算法主题描述，如"冒泡排序动画"、"二分查找可视化"、"二叉树前序遍历"、"Dijkstra最短路径"、"动态规划背包问题"等' },
          count: { type: 'integer', description: '数据量/元素个数，默认16，范围8-32' },
        },
        required: ['topic'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_knowledge',
      description: '在C++和算法知识库（基础语法/算法教程双库）中搜索相关章节。当用户询问具体知识点、需要查阅资料、想看教程时使用。返回章节标题、分类、来源、URL和摘要。',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词，如"快速排序"、"vector用法"、"时间复杂度"' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_knowledge_entry',
      description: '获取知识库某条目的完整正文内容。当用户想详细阅读某个章节、需要引用知识库全文时使用。需先调用 search_knowledge 拿到 url，再调用本工具。',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: '知识库条目的 URL（由 search_knowledge 返回）' },
          title: { type: 'string', description: '条目标题（可选，用于展示）' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_problems',
      description: '在牛客题库中搜索算法练习题。当用户想要做题、需要练习题推荐、想找某知识点的相关题目时使用。返回题目标题、难度、标签、URL。',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词，如"动态规划"、"二分查找"、"图论"' },
        },
        required: ['query'],
      },
    },
  },
]

// ===== 工具执行 =====

async function executeTool(name: string, args: any): Promise<any> {
  const settings = getSettings()
  switch (name) {
    case 'generate_mindmap': {
      try {
        const res = await generateMindmap({
          prompt: args.topic,
          title: `思维导图: ${args.topic}`,
          topic: args.topic,
        })
        return { success: true, type: 'mindmap', tree: res.tree }
      } catch (e: any) {
        return { success: false, error: e.message || '思维导图生成失败' }
      }
    }

    case 'generate_image': {
      const xfyunCreds = getModelCreds('xfyun-tti')
      if (!xfyunCreds.app_id || !xfyunCreds.api_key || !xfyunCreds.api_secret) {
        return { success: false, error: '讯飞星火文生图未配置，请在设置中填写 APP ID / API Key / API Secret' }
      }
      try {
        const res = await generateImage({
          prompt: args.prompt,
          width: 1024,
          height: 1024,
          appId: xfyunCreds.app_id,
          apiKey: xfyunCreds.api_key,
          apiSecret: xfyunCreds.api_secret,
          title: `AI 插图: ${args.prompt.slice(0, 30)}`,
          topic: args.prompt.slice(0, 30),
        })
        return { success: true, type: 'image', base64: res.base64 }
      } catch (e: any) {
        return { success: false, error: e.message || '图片生成失败' }
      }
    }

    case 'generate_ppt': {
      try {
        const res = await generatePPT({ topic: args.topic })
        return { success: true, type: 'ppt', filename: res.filename, slides: res.slides, title: res.title }
      } catch (e: any) {
        return { success: false, error: e.message || 'PPT生成失败' }
      }
    }

    case 'generate_video': {
      try {
        const res = await generateVideo({
          topic: args.topic,
          title: `算法动画: ${args.topic}`,
          count: args.count || 16,
        })
        return { success: true, type: 'video', script: res.script, video_url: res.video_url, render_status: res.render_status }
      } catch (e: any) {
        return { success: false, error: e.message || '视频生成失败' }
      }
    }

    case 'search_knowledge': {
      try {
        const results = await searchKnowledge(args.query, 5)
        if (results.length === 0) {
          return { success: true, type: 'knowledge', results: [], message: '未找到相关内容' }
        }
        return {
          success: true,
          type: 'knowledge',
          query: args.query,
          results: results.map((r: any) => ({
            title: r.title || r.section || '',
            category: r.category || '',
            source: r.source_name || r.source || '',
            url: r.url || '',
            content: (r.content || '').slice(0, 800),
            relevance: r.relevance || 0,
          })),
        }
      } catch (e: any) {
        return { success: false, error: e.message || '知识库搜索失败' }
      }
    }

    case 'get_knowledge_entry': {
      try {
        const entry = await fetchKBEntryContent(args.url)
        if (!entry) {
          return { success: false, error: '未找到该知识库条目' }
        }
        return {
          success: true,
          type: 'knowledge_entry',
          title: entry.title || args.title || '',
          category: entry.category || '',
          source: entry.source_name || entry.source || '',
          url: entry.url,
          content: entry.content || '',
        }
      } catch (e: any) {
        return { success: false, error: e.message || '获取知识库全文失败' }
      }
    }

    case 'search_problems': {
      try {
        const results = await searchProblems(args.query, 6)
        if (results.length === 0) {
          return { success: true, type: 'problems', query: args.query, results: [], message: '未找到相关题目' }
        }
        return {
          success: true,
          type: 'problems',
          query: args.query,
          results: results.map((p: any) => ({
            id: p.id || '',
            title: p.title || '',
            difficulty: p.difficulty || '',
            tags: p.tags || [],
            url: p.url || '',
            relevance: p.relevance || 0,
          })),
        }
      } catch (e: any) {
        return { success: false, error: e.message || '题库搜索失败' }
      }
    }

    default:
      return { success: false, error: `未知工具: ${name}` }
  }
}

// ===== 带工具调用的对话 =====

interface ToolCallHandlers {
  onToolStart?: (toolName: string, args: any) => void
  onToolDone?: (toolName: string, result: any) => void
}

export async function sendMessageWithTools(
  message: string,
  studentId: number,
  onChunk: (data: any) => void,
  onDone: () => void,
  onError: (error: string) => void,
  model: string,
  history: ChatMessage[],
  systemPrompt: string,
  handlers: ToolCallHandlers = {},
  images?: { base64: string; mimeType: string }[],
): Promise<void> {
  const settings = getSettings()
  const provider = getProviderForModel(model)
  const modelEntry = getModelEntry(model)
  const apiKey = getLLMApiKey(model)
  const temperature = settings.temperature ?? 0.7
  const maxTokens = settings.maxTokens || 4096

  if (!apiKey) {
    onError('请先在设置中配置所选模型的 API Key')
    return
  }

  if (!provider || provider.anthropicFormat) {
    onError('当前模型不支持工具调用功能，请切换到 DeepSeek / OpenAI 等模型')
    return
  }

  const apiUrl = modelEntry?.api_base || provider.baseURL
  const apiModel = modelEntry?.api_model || model

  // noDirectCall 提供商（如讯飞）无法浏览器直连，走后端透传代理
  const useProxy = provider?.noDirectCall ?? false
  const actualApiUrl = useProxy ? `${API_BASE}/chat/completions-proxy` : apiUrl

  // 防御性 fallback：确保系统提示词非空（含工具使用规则）
  const finalSystemPrompt = systemPrompt || settings.systemPrompt || DEFAULT_SYSTEM_PROMPT

  // 支持多模态
  const userContent: any = images && images.length > 0
    ? [
        { type: 'text', text: message },
        ...images.map(img => ({
          type: 'image_url',
          image_url: { url: `data:${img.mimeType};base64,${img.base64}` }
        }))
      ]
    : message

  const messages: any[] = [
    { role: 'system', content: finalSystemPrompt },
    ...history.slice(-20),
    { role: 'user', content: userContent },
  ]

  const MAX_TOOL_ROUNDS = 3
  const toolResults: any[] = []

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    try {
      console.log('[API] 发送请求:', { apiUrl, apiModel, round, hasTools: TOOLS.length > 0 })
      const resp = await fetch(actualApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: apiModel,
          messages,
          tools: TOOLS,
          tool_choice: 'auto',
          temperature,
          max_tokens: maxTokens,
          stream: false,
          ...(useProxy ? {
            api_base: modelEntry?.api_base || provider?.baseURL || '',
            api_model: modelEntry?.api_model || model,
          } : {}),
        }),
      })

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '')
        throw new Error(`API 返回错误 ${resp.status}: ${errText}`)
      }

      const data = await resp.json()
      const choice = data.choices?.[0]
      const msg = choice?.message

      if (!msg) throw new Error('API 返回空消息')

      // 有 tool_calls → 执行工具
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        messages.push({
          role: 'assistant',
          content: msg.content || null,
          tool_calls: msg.tool_calls,
        })

        for (const tc of msg.tool_calls) {
          const toolName = tc.function.name
          let toolArgs: any = {}
          try { toolArgs = JSON.parse(tc.function.arguments) } catch { /* */ }

          handlers.onToolStart?.(toolName, toolArgs)
          const result = await executeTool(toolName, toolArgs)
          toolResults.push({ name: toolName, args: toolArgs, result })
          handlers.onToolDone?.(toolName, result)

          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          })
        }
        continue
      }

      // 文本回复 → 模拟流式输出
      const content = msg.content || ''
      const chunks = content.match(/[\s\S]{1,3}/g) || [content]
      for (const chunk of chunks) {
        onChunk({ type: 'text', content: chunk, agent: 'content' })
        await sleep(15)
      }

      if (toolResults.length > 0) {
        onChunk({ type: 'tool_results', results: toolResults })
      }

      onDone()
      return
    } catch (e: any) {
      if (round < MAX_TOOL_ROUNDS - 1) {
        messages.push({
          role: 'user',
          content: `工具调用出错: ${e.message}。请直接回答用户的问题。`,
        })
        continue
      }
      onError(e.message || '对话失败')
      return
    }
  }

  onError('工具调用超过最大轮数，请简化问题重试')
}
