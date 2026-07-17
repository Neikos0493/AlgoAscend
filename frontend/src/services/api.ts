import {
  mockProfile,
  mockDashboard,
  mockResources,
  mockChatHistory,
  getMockReply,
} from './mockData'

const API_BASE = '/api'

// ===== DeepSeek API 配置 =====
// 优先级：用户设置 > 前端 .env (VITE_DEEPSEEK_API_KEY) > 空（需用户配置）
const DEFAULT_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || ''
const DEEPSEEK_BASE = 'https://api.deepseek.com/v1/chat/completions'

// 可用模型列表
export const DEEPSEEK_MODELS = [
  { id: 'deepseek-v4-flash', name: 'V4 Flash', desc: '快速响应 · 13B 活跃参数' },
  { id: 'deepseek-v4-pro', name: 'V4 Pro', desc: '深度推理 · 49B 活跃参数' },
  { id: 'deepseek-chat', name: 'V3.1', desc: '通用对话 · ⚠️ 7月24日停用' },
  { id: 'deepseek-reasoner', name: 'R1', desc: '多步推理 · ⚠️ 7月24日停用' },
]

// 默认系统提示词
const DEFAULT_SYSTEM_PROMPT = `你是一位专业的 C++ 算法学习助手，名为"AlgoAscend"。背后有 6 个智能体协作：

🧠 学习画像分析师 — 分析学生的知识水平和学习偏好
📚 内容生成专家 — 生成个性化教程、思维导图、代码案例
🏋️ 练习设计教练 — 设计练习题并评估掌握程度
🗺️ 学习路径规划师 — 规划从入门到竞赛的学习路线
🎓 智能辅导老师 — 解答疑问、逐步引导、提供代码示例
📊 学习评估分析师 — 评估学习效果、识别薄弱环节

---

## 知识库概览（你可以引用以下资源）

### 算法基础 & 数据结构
| 资源 | 类型 | 难度 |
|------|------|------|
| 排序算法思维导图 | 思维导图 | 基础 |
| 二分查找代码实操 | 代码案例 | 基础 |
| 双指针与滑动窗口全解 | 代码案例 | 中等 |
| 链表专题（反转/合并/环） | 练习题 | 中等 |
| C++ STL 常用容器速查 | 拓展阅读 | 基础 |
| 算法竞赛时间复杂度速查表 | 拓展阅读 | 基础 |

### 搜索 & 回溯 & 递归
| 资源 | 类型 | 难度 |
|------|------|------|
| BFS与DFS完全指南 | 讲解文档 | 基础 |
| 八皇后与回溯算法 | 代码案例 | 中等 |
| 汉诺塔与递归思想 | 代码案例 | 基础 |

### 动态规划
| 资源 | 类型 | 难度 |
|------|------|------|
| 动态规划入门教程 | 讲解文档 | 入门 |
| 动态规划进阶视频脚本 | 视频脚本 | 进阶 |
| 贪心算法经典例题 | 代码案例 | 中等 |

### 图论 & 高级数据结构
| 资源 | 类型 | 难度 |
|------|------|------|
| 图论基础拓展阅读 | 拓展阅读 | 进阶 |
| Dijkstra最短路径模板 | 代码案例 | 中等 |
| 并查集(Union-Find)模板 | 代码案例 | 中等 |
| 线段树基础模板 | 代码案例 | 进阶 |

### 字符串 & 数学
| 资源 | 类型 | 难度 |
|------|------|------|
| KMP字符串匹配算法 | 代码案例 | 进阶 |
| 素数筛选（埃氏筛+欧拉筛） | 代码案例 | 中等 |
| 快速幂 & 矩阵快速幂 | 代码案例 | 中等 |

### 蓝桥杯真题
| 资源 | 类型 | 难度 |
|------|------|------|
| 蓝桥杯填空题精讲(2020) | 练习题 | 基础 |
| 蓝桥杯编程题精选(2020-2023) | 练习题 | 进阶 |
| 蓝桥杯历年真题分类汇编 | 练习题 | 进阶 |
| 数组与字符串练习题 | 练习题 | 基础 |

> 以上资源均可在「学习资源库」页面查看完整内容，含验证答案和详细代码。

### 蓝桥杯2020填空题答案速查（已验证）
- 门牌制作：**624** | 既约分数：**2,481,215** | 蛇形填数：**761** | 跑步锻炼：**8879** | 七段码：**80**
- 路径(2021)：**10266837** | 卡片(2021)：**3181**

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
): Promise<void> {
  const settings = getSettings()
  const apiKey = settings.apiKey || DEFAULT_API_KEY
  const systemPrompt = settings.systemPrompt || DEFAULT_SYSTEM_PROMPT
  const maxTokens = settings.maxTokens || 4096
  const temperature = settings.temperature ?? 0.7
  const maxContext = settings.maxContextMessages || 20

  // ===== 优先：直接调 DeepSeek API =====
  if (apiKey) {
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
      const messages = [
        { role: 'system', content: systemPrompt },
        ...recentHistory,
        { role: 'user', content: message },
      ]

      const response = await fetch(DEEPSEEK_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
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
      console.warn('DeepSeek API 失败，回退到 mock:', err.message)
      // 回退到 mock
    }
  }

  // ===== 其次：尝试后端 =====
  try {
    const response = await fetch(`${API_BASE}/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, student_id: studentId, stream: true }),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
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
  } catch {
    // 后端不可用，继续走 mock 回退
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
