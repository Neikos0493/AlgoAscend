/**
 * 知识库搜索服务
 * 支持双知识库：基础语法（runoob）+ 算法教程（hello-algo）
 * 在 AI 对话前自动搜索 C++ 知识库和牛客题库，注入上下文
 */

const API_BASE = '/api'

export interface KnowledgeResult {
  title: string
  category: string
  source: string
  source_name: string
  url: string
  content: string
  relevance: number
}

export interface KnowledgeEntry {
  title: string
  category: string
  source: string
  source_name: string
  url: string
  summary: string
}

export interface KnowledgeFullEntry {
  title: string
  category: string
  source: string
  source_name: string
  url: string
  content: string
}

export interface ProblemResult {
  id: string
  title: string
  difficulty: string
  tags: string[]
  url: string
  relevance: number
}

export interface KBSection {
  name: string
  count: number
  source?: string
}

export interface KBSource {
  id: string
  name: string
  count: number
}

/**
 * 获取知识库来源列表
 */
export async function fetchKBSources(): Promise<KBSource[]> {
  try {
    const r = await fetch(`${API_BASE}/knowledge/sources`)
    if (!r.ok) return []
    const data = await r.json()
    return data.sources || []
  } catch { return [] }
}

/**
 * 获取知识库分类（可指定来源）
 */
export async function fetchKBSections(source?: string): Promise<{ sections: KBSection[]; sources: KBSource[] }> {
  try {
    const params = source ? `?source=${encodeURIComponent(source)}` : ''
    const r = await fetch(`${API_BASE}/knowledge/sections${params}`)
    if (!r.ok) return { sections: [], sources: [] }
    const data = await r.json()
    return { sections: data.sections || [], sources: data.sources || [] }
  } catch { return { sections: [], sources: [] } }
}

/**
 * 获取知识库全部条目（可按分类 + 来源筛选）
 */
export async function fetchKBEntries(section?: string, source?: string): Promise<KnowledgeEntry[]> {
  try {
    const params = new URLSearchParams()
    if (section) params.set('section', section)
    if (source) params.set('source', source)
    const qs = params.toString()
    const r = await fetch(`${API_BASE}/knowledge/entries${qs ? '?' + qs : ''}`)
    if (!r.ok) return []
    const data = await r.json()
    return data.entries || []
  } catch { return [] }
}

/**
 * 获取单条知识库条目的完整内容
 */
export async function fetchKBEntryContent(url: string): Promise<KnowledgeFullEntry | null> {
  try {
    const params = new URLSearchParams({ url })
    const r = await fetch(`${API_BASE}/knowledge/entry?${params}`)
    if (!r.ok) return null
    const data = await r.json()
    return data.found ? data : null
  } catch { return null }
}

/**
 * 搜索 C++ 知识库（全部来源）
 */
export async function searchKnowledge(query: string, topK = 3, source = ''): Promise<KnowledgeResult[]> {
  try {
    const params = new URLSearchParams({ q: query, top_k: String(topK) })
    if (source) params.set('source', source)
    const r = await fetch(`${API_BASE}/knowledge/search?${params}`)
    if (!r.ok) return []
    const data = await r.json()
    return data.results || []
  } catch { return [] }
}

/**
 * 搜索牛客题库
 */
export async function searchProblems(query: string, topK = 3): Promise<ProblemResult[]> {
  try {
    const params = new URLSearchParams({ q: query, top_k: String(topK) })
    const r = await fetch(`${API_BASE}/knowledge/problems/search?${params}`)
    if (!r.ok) return []
    const data = await r.json()
    return data.results || []
  } catch { return [] }
}

/**
 * 构建知识增强 prompt：将知识库和题库结果拼接到系统提示词
 */
export function buildEnhancedSystemPrompt(
  basePrompt: string,
  knowledge: KnowledgeResult[],
  problems: ProblemResult[],
): string {
  const parts: string[] = [basePrompt]

  if (knowledge.length > 0) {
    parts.push('\n---\n## 知识库参考')
    parts.push('以下是用户问题相关的知识，请参考这些内容回答。')
    parts.push('**重要：引用知识库内容时，必须附带来源链接，格式为 [《章节标题》](URL)。**')
    parts.push('')
    for (const item of knowledge) {
      const srcLabel = item.source_name || item.source || '知识库'
      parts.push(`### [${item.title}](${item.url}) — ${srcLabel}`)
      parts.push(`分类: ${item.category}`)
      parts.push(item.content.slice(0, 3000))
      parts.push('')
    }
  }

  if (problems.length > 0) {
    parts.push('---')
    parts.push('## 牛客题库参考')
    parts.push('以下是相关的算法练习题，可以推荐给用户练习。**引用题目时必须附带链接。**')
    for (const p of problems) {
      parts.push(`- [${p.title}](${p.url}) (${p.difficulty}) — 标签: ${p.tags.join(', ')}`)
    }
  }

  return parts.join('\n')
}
