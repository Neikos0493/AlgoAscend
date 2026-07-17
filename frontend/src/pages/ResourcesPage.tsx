import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../stores/useStore'
import { scrapeResources, SEARCH_TAGS, clearScrapeCache } from '../services/scrapeResources'
import type { ScrapedResource, ScrapeParams } from '../services/scrapeResources'

// ===== 平台配置 =====

const PLATFORM_TABS = [
  { id: 'luogu', name: '洛谷', icon: '🏔️', color: '#3498db' },
  { id: 'leetcode', name: '力扣', icon: '💻', color: '#ffa116' },
  { id: 'nowcoder', name: '牛客', icon: '🐮', color: '#ff6b6b' },
] as const

type PlatformTab = typeof PLATFORM_TABS[number]['id']

// ===== 力扣难度选项 =====
const LEETCODE_DIFFICULTIES = [
  { value: '', label: '全部难度' },
  { value: 'EASY', label: '简单' },
  { value: 'MEDIUM', label: '中等' },
  { value: 'HARD', label: '困难' },
]

const NOWCODER_DIFFICULTIES = [
  { value: '0', label: '全部难度' },
  { value: '1', label: '简单' },
  { value: '2', label: '中等' },
  { value: '3', label: '困难' },
]

// ===== 组件 =====

export default function ResourcesPage() {
  const { toggleSidebar } = useStore()

  // 状态
  const [platform, setPlatform] = useState<PlatformTab>('luogu')
  const [keyword, setKeyword] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [page, setPage] = useState(1)
  const [resources, setResources] = useState<ScrapedResource[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState('') // 'bank' | 'live' | 'cache' | 'error'
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<ScrapedResource | null>(null)

  // 搜索
  const doSearch = useCallback(async (p: number = 1, force: boolean = false) => {
    setLoading(true)
    setError('')
    setSelected(null)

    try {
      const params: ScrapeParams = {
        platform: platform === 'nowcoder' ? 'nowcoder' : platform === 'leetcode' ? 'leetcode' : 'luogu',
        page: p,
        limit: 20,
        forceRefresh: force,
      }
      if (keyword) params.keyword = keyword
      if (difficulty) params.difficulty = difficulty

      const result = await scrapeResources(params)
      setResources(result.resources)
      setTotal(result.total)
      setSource(result.source)
      setPage(p)

      if (result.resources.length === 0 && result.source !== 'cache') {
        setError('未找到题目，试试换个关键词？或确认后端服务已启动')
      }
    } catch (err: any) {
      setError(err.message || '加载失败')
      setResources([])
    } finally {
      setLoading(false)
    }
  }, [platform, keyword, difficulty])

  // 切换平台时重置
  useEffect(() => {
    setKeyword('')
    setDifficulty('')
    setPage(1)
    setResources([])
    setTotal(0)
    setError('')
    setSelected(null)
  }, [platform])

  // 快捷标签搜索
  const handleTagClick = (tag: typeof SEARCH_TAGS[keyof typeof SEARCH_TAGS][number]) => {
    setKeyword(tag.keyword)
    setTimeout(() => doSearch(1, false), 0)
  }

  // 难度变化
  const handleDifficultyChange = (val: string) => {
    setDifficulty(val)
    setTimeout(() => doSearch(1, false), 0)
  }

  // 刷新
  const handleRefresh = () => doSearch(page, true)

  // 清除缓存
  const handleClearCache = () => {
    clearScrapeCache()
    setSource('')
  }

  // 分页
  const totalPages = Math.min(Math.ceil(total / 20), 10)

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* 头部 */}
      <header className="flex items-center gap-3 px-6 py-4 bg-surface-100/80 backdrop-blur-xl border-b border-gray-700/30 shrink-0">
        <button
          className="lg:hidden text-gray-400 hover:text-gray-200"
          onClick={toggleSidebar}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-semibold text-white">资源库</h2>
          <p className="text-xs text-gray-500">
            从洛谷/力扣/牛客精选题目 · {source === 'bank' ? '📚 内置题库' : source === 'live' ? '🌐 实时数据' : source === 'cache' ? '📦 缓存' : ''}
          </p>
        </div>
      </header>

      {selected ? (
        /* === 题目详情 === */
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => setSelected(null)}
              className="mb-4 text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
            >
              ← 返回列表
            </button>
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{selected.platform_icon}</span>
                <div>
                  <h3 className="text-xl font-bold text-white">{selected.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-surface-400/60 text-gray-400 px-2 py-0.5 rounded-full">
                      {selected.platform_name}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      selected.difficulty.includes('困难') || selected.difficulty.includes('HARD')
                        ? 'bg-red-50 text-red-600'
                        : selected.difficulty.includes('中等') || selected.difficulty.includes('MEDIUM')
                        ? 'bg-yellow-50 text-yellow-600'
                        : 'bg-green-50 text-green-600'
                    }`}>
                      {selected.difficulty}
                    </span>
                    {selected.ac_rate != null && (
                      <span className="text-xs text-gray-400">
                        通过率 {selected.ac_rate}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 标签 */}
              {selected.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {selected.tags.map((tag, i) => (
                    <span key={i} className="text-xs bg-surface-300/50 text-gray-300 px-2.5 py-1 rounded-full border border-gray-700/30">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* 跳转按钮 */}
              <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3">
                <span className="text-blue-600 text-lg">{selected.platform_icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800">在 {selected.platform_name} 上查看完整题目</p>
                  <p className="text-xs text-blue-500 mt-0.5">{selected.url}</p>
                </div>
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  打开原题 →
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* === 资源列表 === */
        <div className="p-6">
          {/* 平台 Tab */}
          <div className="flex gap-1 mb-4 bg-surface-400/60 rounded-xl p-1">
            {PLATFORM_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPlatform(tab.id as PlatformTab)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  platform === tab.id
                    ? 'bg-surface-300/50 text-white border border-gray-600/50'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>

          {/* 搜索栏 + 难度筛选 */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doSearch(1, false)}
                placeholder={`在 ${PLATFORM_TABS.find(t => t.id === platform)?.name || ''} 中搜索题目...`}
                className="w-full px-4 py-2.5 pr-10 bg-surface-300/50 border border-gray-600/50 rounded-xl text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/30"
              />
              <button
                onClick={() => doSearch(1, false)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-primary-400"
              >
                🔍
              </button>
            </div>

            {/* 难度筛选 */}
            {platform === 'leetcode' ? (
              <select
                value={difficulty}
                onChange={(e) => handleDifficultyChange(e.target.value)}
                className="px-3 py-2.5 bg-surface-300/50 border border-gray-600/50 rounded-xl text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              >
                {LEETCODE_DIFFICULTIES.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            ) : platform === 'nowcoder' ? (
              <select
                value={difficulty}
                onChange={(e) => handleDifficultyChange(e.target.value)}
                className="px-3 py-2.5 bg-surface-300/50 border border-gray-600/50 rounded-xl text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              >
                {NOWCODER_DIFFICULTIES.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            ) : (
              /* 洛谷难度 */
              <select
                value={difficulty}
                onChange={(e) => handleDifficultyChange(e.target.value)}
                className="px-3 py-2.5 bg-surface-300/50 border border-gray-600/50 rounded-xl text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              >
                <option value="0">全部难度</option>
                <option value="1">入门</option>
                <option value="2">普及−</option>
                <option value="3">普及/提高−</option>
                <option value="4">普及+/提高</option>
                <option value="5">提高+/省选−</option>
                <option value="6">省选/NOI−</option>
                <option value="7">NOI/NOI+</option>
              </select>
            )}

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-4 py-2.5 text-sm font-medium text-gray-400 bg-surface-300/50 border border-gray-600/50 rounded-xl hover:bg-surface-200 disabled:opacity-50 transition-colors"
              title={source === 'cache' ? '强制刷新（清除缓存）' : '刷新'}
            >
              🔄
            </button>
          </div>

          {/* 快捷标签 */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {(SEARCH_TAGS[platform] || []).map((tag, i) => (
              <button
                key={i}
                onClick={() => handleTagClick(tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  keyword === tag.keyword
                    ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30 shadow-glow-sm'
                    : 'bg-surface-300/30 text-gray-400 border border-gray-700/30 hover:border-primary-500/30 hover:bg-primary-500/5'
                }`}
              >
                {tag.icon} {tag.label}
              </button>
            ))}
          </div>

          {/* 状态栏 */}
          <div className="flex items-center justify-between mb-4 text-xs text-gray-400">
            <span>{total > 0 ? `共 ${total} 题` : ''}</span>
            <div className="flex gap-3">
              {source !== 'bank' && (
                <button onClick={handleClearCache} className="hover:text-gray-400">
                  🗑️ 清除缓存
                </button>
              )}
              {source === 'bank' && total > 0 && (
                <span className="text-green-500">✓ 题库已加载</span>
              )}
            </div>
          </div>

          {/* 加载中 */}
          {loading && (
            <div className="text-center py-12">
              <div className="text-4xl animate-pulse-soft">🔄</div>
              <p className="text-gray-400 mt-3">
                正在从 {PLATFORM_TABS.find(t => t.id === platform)?.name} 爬取题目...
              </p>
            </div>
          )}

          {/* 错误 */}
          {!loading && error && (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">
                {error.includes('Failed to fetch') || error.includes('NetworkError') ? '🔌' : '⚠️'}
              </div>
              <h3 className="text-lg font-semibold text-gray-200 mb-2">
                {error.includes('Failed to fetch') || error.includes('NetworkError')
                  ? '无法连接到后端'
                  : '爬取遇到问题'}
              </h3>
              <p className="text-gray-400 max-w-md mx-auto mb-4">
                {error.includes('Failed to fetch') || error.includes('NetworkError')
                  ? '资源爬取需要后端服务支持。请确保已启动 FastAPI 后端：'
                  : '平台可能暂时限制了访问，请稍后重试或切换平台'}
              </p>
              {(error.includes('Failed to fetch') || error.includes('NetworkError')) && (
                <code className="bg-surface-400/60 px-4 py-2 rounded-lg text-sm text-gray-300 mb-3 block border border-gray-700/30">
                  cd backend && python main.py
                </code>
              )}
              <p className="text-xs text-gray-500 mt-3">{error}</p>
              <button
                onClick={() => doSearch(page, true)}
                className="mt-4 px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                重试
              </button>
            </div>
          )}

          {/* 空结果 */}
          {!loading && !error && resources.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="text-lg font-semibold text-gray-200 mb-2">开始探索题目</h3>
              <p className="text-gray-400 max-w-sm mx-auto">
                输入关键词搜索，或点击快捷标签，从 {PLATFORM_TABS.find(t => t.id === platform)?.name} 获取题目资源
              </p>
            </div>
          )}

          {/* 题目列表 */}
          {!loading && resources.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {resources.map((res) => (
                  <button
                    key={res.id}
                    onClick={() => setSelected(res)}
                    className="card text-left hover:border-primary-300 transition-all duration-200 group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl shrink-0">{res.platform_icon}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-200 group-hover:text-primary-300 transition-colors text-sm leading-snug line-clamp-2">
                          {res.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            res.difficulty.includes('困难') || res.difficulty.includes('HARD')
                              ? 'bg-red-50 text-red-600'
                              : res.difficulty.includes('中等') || res.difficulty.includes('MEDIUM')
                              ? 'bg-yellow-50 text-yellow-600'
                              : 'bg-green-50 text-green-600'
                          }`}>
                            {res.difficulty}
                          </span>
                          {res.ac_rate != null && (
                            <span className="text-xs text-gray-400">
                              {res.ac_rate}%
                            </span>
                          )}
                          {res.tags.slice(0, 2).map((tag, i) => (
                            <span key={i} className="text-xs text-gray-400">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="text-gray-300 group-hover:text-primary-400 shrink-0">→</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-6">
                  <button
                    onClick={() => doSearch(Math.max(1, page - 1), false)}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-600/50 hover:bg-surface-300/30 disabled:opacity-30"
                  >
                    ←
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => doSearch(i + 1, false)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                        page === i + 1
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'border-gray-600/50 hover:bg-surface-300/30'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => doSearch(Math.min(totalPages, page + 1), false)}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-600/50 hover:bg-surface-300/30 disabled:opacity-30"
                  >
                    →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
