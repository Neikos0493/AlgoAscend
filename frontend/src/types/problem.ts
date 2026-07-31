export type ProblemPlatform = 'luogu' | 'leetcode' | 'nowcoder'

export interface ProblemSummary {
  /** App-facing identifier used for submissions and notebook records. */
  id: string
  /** Platform-native identifier used when requesting problem details. */
  pid: string
  title: string
  platform: ProblemPlatform
  platformName: string
  platformIcon: string
  difficulty: string
  tags: string[]
  url: string
  accepted?: number | null
  submitted?: number | null
  acceptanceRate?: number | null
}

const PLATFORM_META: Record<ProblemPlatform, { name: string; icon: string }> = {
  luogu: { name: '洛谷', icon: '🏔️' },
  leetcode: { name: '力扣', icon: '💻' },
  nowcoder: { name: '牛客', icon: '🐮' },
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function readString(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

function readNullableNumber(record: Record<string, unknown>, ...keys: string[]): number | null | undefined {
  for (const key of keys) {
    const value = record[key]
    if (value === null) return null
    const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
    if (Number.isFinite(number)) return number
  }
  return undefined
}

export function normalizeHttpUrl(value: string): string {
  if (!value) return ''
  try {
    const base = typeof window === 'undefined' ? 'http://localhost' : window.location.origin
    const url = new URL(value, base)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : ''
  } catch {
    return ''
  }
}

function inferPlatform(value: string, url: string): ProblemPlatform | null {
  const normalized = value.toLowerCase()
  if (normalized === 'luogu' || normalized === 'leetcode' || normalized === 'nowcoder') return normalized
  if (/luogu\.com\.cn/i.test(url)) return 'luogu'
  if (/leetcode\.(cn|com)/i.test(url)) return 'leetcode'
  if (/nowcoder\.com/i.test(url)) return 'nowcoder'
  return null
}

function nativeIdFromUrl(platform: ProblemPlatform, url: string): string {
  const urlMatches: Record<ProblemPlatform, RegExp[]> = {
    luogu: [/\/problem\/([^/?#]+)/i],
    leetcode: [/\/problems\/([^/?#]+)/i],
    nowcoder: [/\/acm\/problem\/(\d+)/i, /\/(?:practice|questionTerminal)\/([^/?#]+)/i],
  }
  for (const pattern of urlMatches[platform]) {
    const match = url.match(pattern)
    if (match?.[1]) return decodeURIComponent(match[1])
  }
  return ''
}

function normalizeNativeProblemId(platform: ProblemPlatform, value: string): string {
  const prefixes = platform === 'nowcoder'
    ? /^(?:nowcoder|nc-skill)[-_:]/i
    : new RegExp(`^${platform}[-_:]`, 'i')
  return value.replace(prefixes, '').trim()
}

function normalizeTags(value: unknown): string[] {
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,，|]/)
      : []
  return [...new Set(values
    .filter((tag): tag is string => typeof tag === 'string')
    .map(tag => tag.trim())
    .filter(Boolean))]
}

export function normalizeProblem(value: unknown, fallbackPlatform?: ProblemPlatform): ProblemSummary | null {
  const record = asRecord(value)
  if (!record) return null

  const rawUrl = readString(record, 'url', 'problem_url', 'problemUrl')
  const url = normalizeHttpUrl(rawUrl)
  const platform = inferPlatform(
    readString(record, 'platform', 'problem_platform', 'problemPlatform') || fallbackPlatform || '',
    url || rawUrl,
  )
  if (!platform) return null

  const rawId = readString(record, 'id', 'problem_id', 'problemId')
  const nativeFromUrl = nativeIdFromUrl(platform, url || rawUrl)
  const pid = normalizeNativeProblemId(
    platform,
    readString(record, 'pid', 'native_id', 'nativeId') || nativeFromUrl || rawId,
  )
  const id = rawId || (pid ? `${platform}-${pid}` : '')
  const title = readString(record, 'title', 'problem_title', 'problemTitle', 'name')
  if (!id || !pid || !title) return null

  const meta = PLATFORM_META[platform]
  return {
    id,
    pid,
    title,
    platform,
    platformName: readString(record, 'platformName', 'platform_name') || meta.name,
    platformIcon: readString(record, 'platformIcon', 'platform_icon') || meta.icon,
    difficulty: readString(record, 'difficulty', 'problem_difficulty', 'problemDifficulty'),
    tags: normalizeTags(record.tags),
    url,
    accepted: readNullableNumber(record, 'accepted'),
    submitted: readNullableNumber(record, 'submitted'),
    acceptanceRate: readNullableNumber(record, 'acceptanceRate', 'ac_rate'),
  }
}

export function normalizeProblems(values: unknown, fallbackPlatform?: ProblemPlatform): ProblemSummary[] {
  if (!Array.isArray(values)) return []
  return values
    .map(value => normalizeProblem(value, fallbackPlatform))
    .filter((problem): problem is ProblemSummary => problem !== null)
}
