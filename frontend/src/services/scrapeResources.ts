/**
 * 资源爬取服务 — 从洛谷/力扣/牛客爬取题目资源
 * 缓存到 localStorage，支持离线使用
 */
import type { PlatformId } from './platformService'

// ===== 类型 =====

export interface ScrapedResource {
  id: string
  title: string
  platform: PlatformId
  platform_name: string
  platform_icon: string
  difficulty: string
  tags: string[]
  url: string
  accepted?: number | null
  submitted?: number | null
  ac_rate?: number | null
}

interface ScrapeResult {
  status: string
  platform: string
  total: number
  message?: string
  resources: ScrapedResource[]
}

interface CacheEntry {
  resources: ScrapedResource[]
  total: number
  timestamp: number
}

// ===== localStorage 缓存 =====

const CACHE_PREFIX = 'algoascend_scrape_'
const CACHE_TTL = 30 * 60 * 1000 // 30 分钟

function cacheKey(platform: string, page: number, keyword: string, difficulty: string): string {
  return `${CACHE_PREFIX}${platform}_${page}_${keyword}_${difficulty}`
}

function getCached(platform: string, page: number, keyword: string, difficulty: string): ScrapedResource[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(platform, page, keyword, difficulty))
    if (!raw) return null
    const entry: CacheEntry = JSON.parse(raw)
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(cacheKey(platform, page, keyword, difficulty))
      return null
    }
    return entry.resources
  } catch {
    return null
  }
}

function setCache(platform: string, page: number, keyword: string, difficulty: string, resources: ScrapedResource[], total: number) {
  try {
    const entry: CacheEntry = { resources, total, timestamp: Date.now() }
    localStorage.setItem(cacheKey(platform, page, keyword, difficulty), JSON.stringify(entry))
  } catch { /* ignore */ }
}

// ===== API 调用 =====

const API_BANK = '/api/resources/scrape/bank'
const API_SCRAPE = '/api/resources/scrape'

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
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
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
export async function scrapeResources(params: ScrapeParams): Promise<{
  resources: ScrapedResource[]
  total: number
  cached: boolean
  source: string
}> {
  const { platform, keyword = '', difficulty = '', page = 1, limit = 20, forceRefresh = false } = params

  // 先查缓存
  if (!forceRefresh) {
    const cached = getCached(platform, page, keyword, difficulty)
    if (cached) {
      return { resources: cached, total: cached.length, cached: true, source: 'cache' }
    }
  }

  // 步骤1: 使用本地题库（快速、离线、100题精选）
  try {
    const result = await fetchScrape(platform, {
      keyword,
      difficulty,
      page,
      limit,
    }, true) // useBank=true

    if (result.status === 'ok' && result.resources.length > 0) {
      const clamped = result.resources.slice(0, limit)
      setCache(platform, page, keyword, difficulty, clamped, result.total)
      return { resources: clamped, total: result.total, cached: false, source: 'bank' }
    }
  } catch (err: any) {
    console.warn(`[scrape] 本地题库加载失败:`, err.message)
  }

  // 步骤2: 回退到在线爬取
  try {
    const result = await fetchScrape(platform, {
      keyword,
      difficulty: difficulty ? Number(difficulty) : 0,
      page,
      limit,
    }, false) // useBank=false

    if (result.status === 'ok') {
      setCache(platform, page, keyword, difficulty, result.resources, result.total)
      return { resources: result.resources, total: result.total, cached: false, source: 'live' }
    }

    // 牛客特殊状态：WAF 拦截 / 空结果
    if (result.status === 'waf_blocked') {
      throw new Error('牛客需要登录Cookie，请在 backend/.env 中设置 NOWCODER_COOKIE')
    }
    if (result.status === 'empty') {
      throw new Error(result.message || '牛客未返回题目')
    }

    throw new Error(result.message || '爬取失败')
  } catch (err: any) {
    console.warn(`[scrape] ${platform} 在线爬取失败:`, err.message)

    // 回退到过期缓存
    const stale = getCached(platform, page, keyword, difficulty)
    if (stale) {
      return { resources: stale, total: stale.length, cached: true, source: 'cache' }
    }

    return { resources: [], total: 0, cached: false, source: 'error' }
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
