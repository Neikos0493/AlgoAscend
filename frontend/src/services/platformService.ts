/**
 * 竞赛平台数据拉取服务
 *
 * 支持平台：
 * - Codeforces (公开 API)
 * - AtCoder (公开 API)
 * - 洛谷 Luogu (非官方 API)
 * - 牛客 Nowcoder (手动输入)
 * - AcWing (手动输入)
 * - LeetCode CN (手动输入)
 * - 蓝桥云课 (手动输入)
 */

// ===== 类型定义 =====

export interface PlatformAccount {
  platform: string
  handle: string
  profileUrl: string
  displayName: string
  verified: boolean
  lastUpdated: string | null
  stats: PlatformStats | null
}

export interface PlatformStats {
  rating: number | null
  maxRating: number | null
  rank: string | null
  problemsSolved: number | null
  contestsParticipated: number | null
  acceptanceRate: number | null
  streak: number | null
  extra: Record<string, any>
}

// ===== 平台定义 =====

export const PLATFORMS = [
  { id: 'codeforces', name: 'Codeforces', icon: '🇷🇺', color: '#1f8acb', baseUrl: 'https://codeforces.com/profile/', hasApi: true },
  { id: 'atcoder', name: 'AtCoder', icon: '🇯🇵', color: '#222222', baseUrl: 'https://atcoder.jp/users/', hasApi: true },
  { id: 'luogu', name: '洛谷', icon: '🏔️', color: '#3498db', baseUrl: 'https://www.luogu.com.cn/user/', hasApi: true },
  { id: 'nowcoder', name: '牛客竞赛', icon: '🐮', color: '#ff6b6b', baseUrl: 'https://ac.nowcoder.com/acm/contest/profile/', hasApi: true },
  { id: 'leetcode', name: 'LeetCode CN', icon: '💻', color: '#ffa116', baseUrl: 'https://leetcode.cn/u/', hasApi: false },
  { id: 'acwing', name: 'AcWing', icon: '🧪', color: '#337ab7', baseUrl: 'https://www.acwing.com/user/', hasApi: false },
  { id: 'lanqiao', name: '蓝桥云课', icon: '🏅', color: '#5b8c5a', baseUrl: 'https://www.lanqiao.cn/users/', hasApi: false },
] as const

export type PlatformId = typeof PLATFORMS[number]['id']

// ===== localStorage 持久化 =====

const STORAGE_KEY = 'algoascend_platform_accounts'

export function loadAccounts(): PlatformAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

export function saveAccounts(accounts: PlatformAccount[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
  } catch { /* ignore */ }
}

/** 清除所有平台绑定数据 */
export function clearAccounts() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch { /* ignore */ }
}

// ===== API 拉取（通过后端代理绕过 CORS） =====

const PROXY_URL = '/api/platform/fetch'

/**
 * 统一通过后端代理拉取平台数据
 * 自动回退：后端不可用时尝试浏览器直连（Codeforces 支持 CORS）
 */
async function proxyFetch(platform: string, handle: string): Promise<PlatformStats> {
  // 优先：通过后端代理
  try {
    const resp = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, handle }),
    })
    const data = await resp.json()
    if (data.status === 'ok' && data.stats) {
      return data.stats as PlatformStats
    }
    throw new Error(data.message || '代理请求失败')
  } catch (proxyErr: any) {
    // 回退：浏览器直连（仅 Codeforces API 开放 CORS）
    if (platform === 'codeforces') {
      return fetchCodeforcesDirect(handle)
    }
    throw proxyErr
  }
}

/**
 * Codeforces 直连（仅作为回退，Codeforces API 支持 CORS）
 */
async function fetchCodeforcesDirect(handle: string): Promise<PlatformStats> {
  const url = `https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Codeforces API error: ${resp.status}`)
  const data = await resp.json()
  if (data.status !== 'OK') throw new Error(data.comment || 'Codeforces user not found')

  const user = data.result[0]
  return {
    rating: user.rating ?? null,
    maxRating: user.maxRating ?? null,
    rank: user.rank ?? null,
    problemsSolved: null,
    contestsParticipated: null,
    acceptanceRate: null,
    streak: null,
    extra: {
      handle: user.handle,
      contribution: user.contribution ?? 0,
      friendOfCount: user.friendOfCount ?? 0,
    },
  }
}

/**
 * 拉取指定平台的统计数据
 */
export async function fetchPlatformStats(
  platform: PlatformId,
  handle: string
): Promise<PlatformStats> {
  return proxyFetch(platform, handle)
}

/**
 * 手动构建空白 stats 结构
 */
export function emptyStats(): PlatformStats {
  return {
    rating: null, maxRating: null, rank: null,
    problemsSolved: null, contestsParticipated: null,
    acceptanceRate: null, streak: null, extra: {},
  }
}

/**
 * 生成平台个人主页 URL
 */
export function getProfileUrl(platform: PlatformId, handle: string): string {
  const platformInfo = PLATFORMS.find(p => p.id === platform)
  if (!platformInfo) return ''
  return `${platformInfo.baseUrl}${encodeURIComponent(handle)}`
}
