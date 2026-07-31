/**
 * 资源爬取服务 — 从洛谷/力扣/牛客爬取题目资源
 * 缓存到 localStorage，支持离线使用
 */
import { normalizeProblems, type ProblemPlatform, type ProblemSummary } from '../types/problem'

// ===== 类型 =====

export type ScrapedResource = ProblemSummary

export type ScrapeFailureReason =
  | 'waf_blocked'
  | 'empty'
  | 'network'
  | 'http_error'
  | 'backend_error'
  | 'unknown'

interface ScrapeResult {
  status: string
  platform: string
  total: number
  message?: string
  reason?: string
  resources: ScrapedResource[]
}

interface CacheEntry {
  resources: ScrapedResource[]
  total: number
  timestamp: number
  source?: 'bank' | 'live'
}

// ===== localStorage 缓存 =====

const CACHE_PREFIX = 'algoascend_scrape_'
const CACHE_TTL = 30 * 60 * 1000 // 30 分钟

const DIFFICULTY_RANKS: Record<ProblemPlatform, Record<string, number>> = {
  luogu: {
    '入门': 1, '普及-': 2, '普及/提高-': 3, '普及+/提高': 4,
    '提高+/省选-': 5, '省选/NOI-': 6, 'NOI/NOI+/CTSC': 7,
  },
  leetcode: { EASY: 1, '简单': 1, MEDIUM: 2, '中等': 2, HARD: 3, '困难': 3 },
  nowcoder: { '入门': 1, '简单': 1, '中等': 2, '较难': 3, '困难': 3 },
}

function sortByDifficulty(resources: ScrapedResource[], platform: ProblemPlatform): ScrapedResource[] {
  const ranks = DIFFICULTY_RANKS[platform]
  return resources
    .map((resource, index) => ({ resource, index }))
    .sort((left, right) =>
      (ranks[left.resource.difficulty.toUpperCase()] ?? Number.MAX_SAFE_INTEGER)
      - (ranks[right.resource.difficulty.toUpperCase()] ?? Number.MAX_SAFE_INTEGER)
      || left.index - right.index
    )
    .map(({ resource }) => resource)
}

function cacheKey(platform: string, page: number, keyword: string, difficulty: string): string {
  return `${CACHE_PREFIX}${platform}_${page}_${keyword}_${difficulty}`
}

function getCached(platform: ProblemPlatform, page: number, keyword: string, difficulty: string, allowStale = false, requiredSource?: 'bank' | 'live'): CacheEntry | null {
  try {
    const key = cacheKey(platform, page, keyword, difficulty)
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const stored = JSON.parse(raw) as Partial<CacheEntry>
    if (!allowStale && (typeof stored.timestamp !== 'number' || Date.now() - stored.timestamp > CACHE_TTL)) {
      return null
    }
    const resources = sortByDifficulty(normalizeProblems(stored.resources, platform), platform)
    if (!Array.isArray(stored.resources) || (stored.resources.length > 0 && resources.length === 0)) {
      localStorage.removeItem(key)
      return null
    }
    const source = stored.source === 'bank' || stored.source === 'live' ? stored.source : undefined
    if (requiredSource && source !== requiredSource) return null
    const entry = {
      resources,
      total: typeof stored.total === 'number' ? stored.total : resources.length,
      timestamp: typeof stored.timestamp === 'number' ? stored.timestamp : Date.now(),
      source,
    }
    // Rewrite legacy cache entries in the canonical shared shape.
    setCache(platform, page, keyword, difficulty, entry.resources, entry.total, entry.timestamp, entry.source)
    return entry
  } catch {
    return null
  }
}

function setCache(platform: string, page: number, keyword: string, difficulty: string, resources: ScrapedResource[], total: number, timestamp = Date.now(), source?: 'bank' | 'live') {
  try {
    const entry: CacheEntry = { resources, total, timestamp, source }
    localStorage.setItem(cacheKey(platform, page, keyword, difficulty), JSON.stringify(entry))
  } catch { /* ignore */ }
}

// ===== API 调用 =====

const API_BANK = '/api/resources/scrape/bank'
const API_SCRAPE = '/api/resources/scrape'

const BANK_DIFFICULTY_LABELS: Record<ProblemPlatform, Record<string, string>> = {
  luogu: {
    '1': '入门', '2': '普及-', '3': '普及/提高-', '4': '普及+/提高',
    '5': '提高+/省选-', '6': '省选/NOI-', '7': 'NOI/NOI+/CTSC',
  },
  leetcode: { EASY: '简单', MEDIUM: '中等', HARD: '困难' },
  nowcoder: { '1': '简单', '2': '中等', '3': '困难' },
}

function bankDifficulty(platform: ProblemPlatform, difficulty: string): string {
  if (!difficulty || difficulty === '0') return ''
  return BANK_DIFFICULTY_LABELS[platform][difficulty] || ''
}

export class ScrapeError extends Error {
  readonly reason: ScrapeFailureReason
  readonly platform: ProblemPlatform

  constructor(platform: ProblemPlatform, reason: ScrapeFailureReason, message: string) {
    super(message)
    this.name = 'ScrapeError'
    this.platform = platform
    this.reason = reason
  }
}

function asScrapeError(platform: ProblemPlatform, error: unknown): ScrapeError {
  if (error instanceof ScrapeError) return error
  if (error instanceof TypeError) {
    return new ScrapeError(platform, 'network', error.message || '网络请求失败')
  }
  const message = error instanceof Error ? error.message : '爬取失败'
  return new ScrapeError(platform, message.startsWith('HTTP ') ? 'http_error' : 'unknown', message)
}

async function fetchScrape(
  platform: string,
  params: Record<string, string | number>,
  useBank: boolean = true,
): Promise<ScrapeResult> {
  const base = useBank ? API_BANK : API_SCRAPE
  const query = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== '' && v !== 0 && v !== undefined) {
      query.set(k, String(v))
    }
  }
  const url = `${base}/${platform}?${query.toString()}`
  const resp = await fetch(url)
  if (!resp.ok) {
    const payload = await resp.json().catch(() => null) as { detail?: unknown; message?: unknown } | null
    const detail = typeof payload?.detail === 'string'
      ? payload.detail
      : typeof payload?.message === 'string' ? payload.message : ''
    throw new Error(detail || `HTTP ${resp.status}`)
  }
  const result = await resp.json() as ScrapeResult
  return {
    ...result,
    resources: sortByDifficulty(normalizeProblems(result.resources, platform as ProblemPlatform), platform as ProblemPlatform),
  }
}

// ===== 公开方法 =====

export interface ScrapeParams {
  platform: 'luogu' | 'leetcode' | 'nowcoder'
  keyword?: string
  difficulty?: string
  page?: number
  limit?: number
  forceRefresh?: boolean
}

/**
 * 获取指定平台的题目资源
 * 优先使用本地题库（快速可靠），失败时尝试在线爬取
 */
export interface ScrapeResourcesResult {
  resources: ScrapedResource[]
  total: number
  cached: boolean
  source: 'cache' | 'bank' | 'live' | 'error'
  failure?: ScrapeError
}

export async function scrapeResources(params: ScrapeParams): Promise<ScrapeResourcesResult> {
  const { platform, keyword = '', difficulty = '', page = 1, limit = 20, forceRefresh = false } = params

  if (!forceRefresh) {
    const cached = getCached(platform, page, keyword, difficulty)
    if (cached) return { resources: cached.resources, total: cached.total, cached: true, source: 'cache' }
  }

  const fetchLive = async (): Promise<ScrapeResourcesResult> => {
    const result = await fetchScrape(platform, {
      keyword,
      difficulty: platform === 'leetcode' ? difficulty : (difficulty ? Number(difficulty) : 0),
      ...(platform === 'leetcode' ? { skip: (page - 1) * limit } : { page }),
      limit,
    }, false)
    if (result.status === 'ok') {
      setCache(platform, page, keyword, difficulty, result.resources, result.total, Date.now(), 'live')
      return { resources: result.resources, total: result.total, cached: false, source: 'live' }
    }
    if (result.status === 'waf_blocked') throw new ScrapeError(platform, 'waf_blocked', result.message || '牛客实时访问受限，本地题库仍可使用')
    if (result.status === 'empty') throw new ScrapeError(platform, 'empty', result.message || '牛客未返回题目')
    throw new ScrapeError(platform, 'backend_error', result.message || '爬取失败')
  }

  const fetchBank = async (): Promise<ScrapeResourcesResult | null> => {
    try {
      const result = await fetchScrape(platform, { keyword, difficulty: bankDifficulty(platform, difficulty), page, limit }, true)
      if (result.status === 'ok' && result.resources.length > 0) {
        const clamped = result.resources.slice(0, limit)
        setCache(platform, page, keyword, difficulty, clamped, result.total, Date.now(), 'bank')
        return { resources: clamped, total: result.total, cached: false, source: 'bank' }
      }
    } catch (err: any) {
      console.warn(`[scrape] 本地题库加载失败:`, err.message)
    }
    return null
  }

  const bank = await fetchBank()
  if (bank) return bank

  try {
    return await fetchLive()
  } catch (error: unknown) {
    const failure = asScrapeError(platform, error)
    console.warn(`[scrape] ${platform} 在线爬取失败:`, failure.message)
    const stale = getCached(platform, page, keyword, difficulty, true)
    if (stale) return { resources: stale.resources, total: stale.total, cached: true, source: 'cache', failure }
    return { resources: [], total: 0, cached: false, source: 'error', failure }
  }
}

/**
 * 清除所有爬取缓存
 */
export function clearScrapeCache() {
  try {
    const keys = Object.keys(localStorage)
    for (const key of keys) {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key)
      }
    }
  } catch { /* ignore */ }
}

// ===== 预设搜索标签（快捷搜索） =====

export const SEARCH_TAGS: Record<string, { label: string; icon: string; platform: string; keyword: string }[]> = {
  luogu: [
    { label: '动态规划', icon: '🧩', platform: 'luogu', keyword: '动态规划' },
    { label: '图论', icon: '🕸️', platform: 'luogu', keyword: '图论' },
    { label: '数据结构', icon: '🌳', platform: 'luogu', keyword: '数据结构' },
    { label: '搜索', icon: '🔍', platform: 'luogu', keyword: '搜索' },
    { label: '字符串', icon: '📝', platform: 'luogu', keyword: '字符串' },
    { label: '数学', icon: '🔢', platform: 'luogu', keyword: '数学' },
    { label: '贪心', icon: '⚡', platform: 'luogu', keyword: '贪心' },
    { label: '排序', icon: '📊', platform: 'luogu', keyword: '排序' },
  ],
  leetcode: [
    { label: '数组', icon: '📋', platform: 'leetcode', keyword: 'array' },
    { label: '动态规划', icon: '🧩', platform: 'leetcode', keyword: 'dynamic-programming' },
    { label: '字符串', icon: '📝', platform: 'leetcode', keyword: 'string' },
    { label: '树', icon: '🌳', platform: 'leetcode', keyword: 'tree' },
    { label: '哈希表', icon: '📦', platform: 'leetcode', keyword: 'hash-table' },
    { label: '深度优先', icon: '🔎', platform: 'leetcode', keyword: 'depth-first-search' },
    { label: '二分查找', icon: '🎯', platform: 'leetcode', keyword: 'binary-search' },
    { label: '贪心', icon: '⚡', platform: 'leetcode', keyword: 'greedy' },
  ],
  nowcoder: [
    { label: '动态规划', icon: '🧩', platform: 'nowcoder', keyword: '动态规划' },
    { label: '字符串', icon: '📝', platform: 'nowcoder', keyword: '字符串' },
    { label: '排序', icon: '📊', platform: 'nowcoder', keyword: '排序' },
    { label: '查找', icon: '🔍', platform: 'nowcoder', keyword: '查找' },
    { label: '贪心', icon: '⚡', platform: 'nowcoder', keyword: '贪心' },
    { label: '图论', icon: '🕸️', platform: 'nowcoder', keyword: '图论' },
  ],
}
