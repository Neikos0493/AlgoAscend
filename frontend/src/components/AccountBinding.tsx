/**
 * 竞赛平台账号绑定组件
 * 支持绑定 7 个算法竞赛平台账号，自动拉取统计数据
 */
import { useState, useCallback } from 'react'
import {
  PLATFORMS, PlatformId, PlatformAccount, PlatformStats,
  loadAccounts, saveAccounts,
  fetchPlatformStats, emptyStats, getProfileUrl,
} from '../services/platformService'

interface AccountBindingProps {
  onAccountsChange?: (accounts: PlatformAccount[]) => void
}

export default function AccountBinding({ onAccountsChange }: AccountBindingProps) {
  const [accounts, setAccounts] = useState<PlatformAccount[]>(loadAccounts)
  const [binding, setBinding] = useState<string | null>(null) // 正在绑定中的平台 ID
  const [inputHandle, setInputHandle] = useState('')
  const [loading, setLoading] = useState<string | null>(null) // 正在拉取数据的平台 ID
  const [error, setError] = useState<string | null>(null)
  const [statsInput, setStatsInput] = useState<Partial<PlatformStats>>({})

  const getAccount = (platform: string) => accounts.find(a => a.platform === platform)

  // 绑定新账号（API 自动拉取）
  const handleBind = async (platform: PlatformId) => {
    const info = PLATFORMS.find(p => p.id === platform)
    if (!info) return

    setBinding(platform)
    setInputHandle('')
    setError(null)
    setStatsInput({})
  }

  // 提交绑定
  const handleSubmitBind = async () => {
    if (!binding || !inputHandle.trim()) {
      setError('请输入账号/用户名')
      return
    }

    const platform = binding as PlatformId
    const info = PLATFORMS.find(p => p.id === platform)
    if (!info) return

    setLoading(platform)
    setError(null)

    let stats: PlatformStats | null = null
    let verified = false

    if (info.hasApi) {
      try {
        stats = await fetchPlatformStats(platform, inputHandle.trim())
        verified = true
      } catch (e: any) {
        setError(`拉取失败: ${e.message}。你可以手动填写数据。`)
        stats = emptyStats()
      }
    } else {
      stats = {
        rating: statsInput.rating ?? null,
        maxRating: statsInput.maxRating ?? null,
        rank: statsInput.rank ?? null,
        problemsSolved: statsInput.problemsSolved ?? null,
        contestsParticipated: statsInput.contestsParticipated ?? null,
        acceptanceRate: statsInput.acceptanceRate ?? null,
        streak: statsInput.streak ?? null,
        extra: statsInput.extra || {},
      }
    }

    const newAccount: PlatformAccount = {
      platform,
      handle: inputHandle.trim(),
      profileUrl: getProfileUrl(platform, inputHandle.trim()),
      displayName: info.name,
      verified,
      lastUpdated: new Date().toISOString(),
      stats,
    }

    const updated = [
      ...accounts.filter(a => a.platform !== platform),
      newAccount,
    ]
    setAccounts(updated)
    saveAccounts(updated)
    onAccountsChange?.(updated)

    setBinding(null)
    setLoading(null)
    setInputHandle('')
    setStatsInput({})
  }

  // 解绑
  const handleUnbind = (platform: string) => {
    const updated = accounts.filter(a => a.platform !== platform)
    setAccounts(updated)
    saveAccounts(updated)
    onAccountsChange?.(updated)
  }

  // 刷新数据
  const handleRefresh = async (platform: PlatformId) => {
    const account = getAccount(platform)
    if (!account) return

    setLoading(platform)
    try {
      const stats = await fetchPlatformStats(platform, account.handle)
      const updated: PlatformAccount = {
        ...account,
        verified: true,
        lastUpdated: new Date().toISOString(),
        stats,
      }
      const newAccounts = accounts.map(a => a.platform === platform ? updated : a)
      setAccounts(newAccounts)
      saveAccounts(newAccounts)
      onAccountsChange?.(newAccounts)
    } catch (e: any) {
      setError(`刷新失败: ${e.message}`)
    } finally {
      setLoading(null)
    }
  }

  // 评分颜色
  const ratingColor = (rating: number | null | undefined): string => {
    if (!rating) return 'text-gray-400'
    if (rating >= 2400) return 'text-red-500'
    if (rating >= 2100) return 'text-orange-500'
    if (rating >= 1900) return 'text-purple-500'
    if (rating >= 1600) return 'text-blue-500'
    if (rating >= 1400) return 'text-cyan-500'
    if (rating >= 1200) return 'text-green-500'
    return 'text-gray-500'
  }

  return (
    <div className="space-y-4">
      {/* 绑定列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PLATFORMS.map((info) => {
          const account = getAccount(info.id)
          const isBinding = binding === info.id
          const isLoading = loading === info.id
          const isManual = !info.hasApi && isBinding

          return (
            <div
              key={info.id}
              className={`border rounded-xl p-4 transition-all ${
                account
                  ? 'border-green-200 bg-green-50/50'
                  : isBinding
                  ? 'border-primary-300 bg-primary-50/30'
                  : 'border-gray-600/50 bg-surface-300/50 hover:border-gray-300'
              }`}
            >
              {/* 已绑定状态 */}
              {account && !isBinding ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{info.icon}</span>
                      <span className="font-semibold text-sm text-gray-200">{info.name}</span>
                      {account.verified && (
                        <span className="text-green-500 text-xs" title="已验证">✓</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRefresh(info.id)}
                        disabled={isLoading}
                        className="text-gray-400 hover:text-primary-500 text-xs p-1"
                        title="刷新数据"
                      >
                        {isLoading ? '⏳' : '🔄'}
                      </button>
                      <button
                        onClick={() => handleUnbind(info.id)}
                        className="text-gray-400 hover:text-red-500 text-xs p-1"
                        title="解绑"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* 统计数据 */}
                  {account.stats && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      {account.stats.rating !== null && (
                        <div>
                          <span className="text-gray-400">Rating</span>
                          <span className={`ml-1 font-bold ${ratingColor(account.stats.rating)}`}>
                            {account.stats.rating}
                          </span>
                          {account.stats.rank && (
                            <span className="text-gray-400 ml-1">({account.stats.rank})</span>
                          )}
                        </div>
                      )}
                      {account.stats.maxRating !== null && (
                        <div>
                          <span className="text-gray-400">最高</span>
                          <span className={`ml-1 font-semibold ${ratingColor(account.stats.maxRating)}`}>
                            {account.stats.maxRating}
                          </span>
                        </div>
                      )}
                      {account.stats.problemsSolved !== null && (
                        <div>
                          <span className="text-gray-400">已通过</span>
                          <span className="ml-1 font-semibold text-green-600">
                            {account.stats.problemsSolved}
                          </span>
                        </div>
                      )}
                      {account.stats.contestsParticipated !== null && (
                        <div>
                          <span className="text-gray-400">参赛</span>
                          <span className="ml-1 font-semibold text-blue-600">
                            {account.stats.contestsParticipated}
                          </span>
                        </div>
                      )}
                      {account.stats.acceptanceRate !== null && (
                        <div>
                          <span className="text-gray-400">通过率</span>
                          <span className="ml-1 font-semibold text-purple-600">
                            {account.stats.acceptanceRate}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400">
                    <span>@{account.handle}</span>
                    {account.lastUpdated && (
                      <span>· {new Date(account.lastUpdated).toLocaleDateString('zh-CN')}</span>
                    )}
                    <a
                      href={account.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-primary-500 hover:underline"
                      title="打开个人主页"
                    >
                      主页 ↗
                    </a>
                  </div>
                </div>
              ) : isBinding ? (
                /* 绑定中 */
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{info.icon}</span>
                    <span className="font-semibold text-sm text-gray-200">{info.name}</span>
                    <span className="text-xs text-primary-500">绑定中</span>
                  </div>

                  <input
                    type="text"
                    value={inputHandle}
                    onChange={(e) => setInputHandle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitBind()}
                    placeholder={
                      info.id === 'nowcoder'
                        ? '输入牛客UID（个人主页URL末尾的数字）'
                        : info.hasApi
                        ? '输入用户名/ID'
                        : '输入用户名或主页链接'
                    }
                    className="w-full text-xs border border-gray-600/50 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-primary-200"
                    autoFocus
                  />
                  {info.id === 'nowcoder' && (
                    <p className="text-[10px] text-gray-400 mb-2">
                      💡 在浏览器打开 <code className="bg-surface-400/60 px-1 rounded">ac.nowcoder.com/acm/contest/profile/你的UID</code>，复制末尾的数字
                    </p>
                  )}

                  {/* 手动平台：额外输入框 */}
                  {isManual && (
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                      <input
                        type="number"
                        placeholder="Rating"
                        className="text-xs border rounded px-2 py-1.5"
                        onChange={(e) => setStatsInput(s => ({ ...s, rating: parseInt(e.target.value) || null }))}
                      />
                      <input
                        type="number"
                        placeholder="已通过题数"
                        className="text-xs border rounded px-2 py-1.5"
                        onChange={(e) => setStatsInput(s => ({ ...s, problemsSolved: parseInt(e.target.value) || null }))}
                      />
                      <input
                        type="number"
                        placeholder="参赛次数"
                        className="text-xs border rounded px-2 py-1.5"
                        onChange={(e) => setStatsInput(s => ({ ...s, contestsParticipated: parseInt(e.target.value) || null }))}
                      />
                      <input
                        type="number"
                        placeholder="通过率(%)"
                        className="text-xs border rounded px-2 py-1.5"
                        onChange={(e) => setStatsInput(s => ({ ...s, acceptanceRate: parseInt(e.target.value) || null }))}
                      />
                    </div>
                  )}

                  {error && (
                    <p className="text-xs text-red-500 mb-2">{error}</p>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSubmitBind}
                      disabled={!inputHandle.trim() || isLoading}
                      className="btn-primary text-xs px-4 py-1.5"
                    >
                      {isLoading ? '拉取中...' : '确认绑定'}
                    </button>
                    <button
                      onClick={() => { setBinding(null); setError(null) }}
                      className="text-xs text-gray-400 hover:text-gray-400"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                /* 未绑定状态 */
                <button
                  onClick={() => handleBind(info.id)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl opacity-50">{info.icon}</span>
                    <span className="text-sm text-gray-500">{info.name}</span>
                  </div>
                  <span className="text-xs text-primary-500">+ 绑定</span>
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* 汇总统计 */}
      {accounts.length > 0 && (
        <SummaryCard accounts={accounts} />
      )}
    </div>
  )
}

/** 多平台汇总统计卡片 */
function SummaryCard({ accounts }: { accounts: PlatformAccount[] }) {
  const verifiedAccounts = accounts.filter(a => a.verified && a.stats)

  const totalProblems = verifiedAccounts.reduce(
    (sum, a) => sum + (a.stats?.problemsSolved || 0), 0
  )
  const totalContests = verifiedAccounts.reduce(
    (sum, a) => sum + (a.stats?.contestsParticipated || 0), 0
  )
  const maxRating = verifiedAccounts.reduce(
    (max, a) => Math.max(max, a.stats?.rating || 0), 0
  )

  if (verifiedAccounts.length === 0) return null

  return (
    <div className="card bg-gradient-to-r from-primary-50 to-blue-50 border-primary-100">
      <h4 className="text-sm font-semibold text-gray-200 mb-3">
        📊 多平台汇总 ({verifiedAccounts.length} 个平台已验证)
      </h4>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-green-600">{totalProblems}</div>
          <div className="text-xs text-gray-500">总做题数</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-purple-600">{totalContests}</div>
          <div className="text-xs text-gray-500">总参赛数</div>
        </div>
        <div>
          <div className={`text-2xl font-bold ${
            maxRating >= 2000 ? 'text-red-500' :
            maxRating >= 1600 ? 'text-blue-500' :
            maxRating >= 1200 ? 'text-green-500' :
            'text-gray-400'
          }`}>
            {maxRating || '—'}
          </div>
          <div className="text-xs text-gray-500">最高 Rating</div>
        </div>
      </div>
    </div>
  )
}
