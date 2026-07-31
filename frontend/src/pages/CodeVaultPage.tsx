import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '../stores/useStore'
import { scrapeResources, SEARCH_TAGS, clearScrapeCache } from '../services/scrapeResources'
import type { ScrapedResource, ScrapeParams } from '../services/scrapeResources'
import { fetchKBSections, fetchKBEntries, fetchKBEntryContent } from '../services/knowledgeService'
import type { KBSection, KnowledgeEntry, KnowledgeFullEntry } from '../services/knowledgeService'
import MarkdownRenderer from '../components/MarkdownRenderer'
import { AppIcon } from '../components/Icon'
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, ExternalLink, RefreshCw, Search, Trash2 } from 'lucide-react'
import { openProblemInEditor } from '../services/editorHandoff'

// ===== 平台配置 =====

const PLATFORM_TABS = [
  { id: 'nowcoder', name: '牛客', icon: '🐮', color: '#ff6b6b' },
  { id: 'luogu', name: '洛谷', icon: '🏔️', color: '#3498db' },
  { id: 'leetcode', name: '力扣', icon: '💻', color: '#ffa116' },
  { id: 'runoob_kb', name: '基础语法', icon: '📗', color: '#10b981', badge: '拓展阅读' },
  { id: 'hello_algo_kb', name: '算法教程', icon: '📘', color: '#6366f1', badge: '拓展阅读' },
] as const

type PlatformTab = typeof PLATFORM_TABS[number]['id']
const DEFAULT_PROBLEM_PLATFORM: ScrapeParams['platform'] = 'nowcoder'
const KB_TABS: PlatformTab[] = ['runoob_kb', 'hello_algo_kb']
const KB_SOURCE_MAP: Record<string, string> = { runoob_kb: 'runoob', hello_algo_kb: 'hello-algo' }

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

// ===== 知识库分类图标映射 =====
const CATEGORY_ICONS: Record<string, string> = {
  'c++基础': '📗', 'c++面向对象': '🏛️', 'c++高级': '📘', 'c++参考': '📙', 'STL库': '🧩',
  '序': '📖', '前言': '📝', '初识算法': '🎯', '复杂度分析': '📊', '数据结构': '🏗️',
  '数组与链表': '🔗', '栈与队列': '📋', '哈希表': '🔑', '树': '🌳', '堆': '⛰️',
  '图': '🕸️', '搜索': '🔍', '排序': '📶', '分治': '✂️', '回溯': '↩️',
  '动态规划': '🧩', '贪心': '🎯', '附录': '📎',
}

// ===== 组件 =====

export default function CodeVaultPage() {
  const { toggleSidebar, pendingVaultIntent, setPendingVaultIntent } = useStore()

  // 状态 — 题库
  const [platform, setPlatform] = useState<PlatformTab>(DEFAULT_PROBLEM_PLATFORM)
  const [keyword, setKeyword] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [page, setPage] = useState(1)
  const [resources, setResources] = useState<ScrapedResource[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState('')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<ScrapedResource | null>(null)

  // 状态 — 知识库
  const [kbSections, setKbSections] = useState<KBSection[]>([])
  const [kbEntries, setKbEntries] = useState<KnowledgeEntry[]>([])
  const [kbSection, setKbSection] = useState('')      // 当前筛选分类
  const [kbSearch, setKbSearch] = useState('')         // 知识库内搜索
  const [kbLoading, setKbLoading] = useState(false)
  const [kbDetail, setKbDetail] = useState<KnowledgeFullEntry | null>(null)
  const [kbDetailLoading, setKbDetailLoading] = useState(false)

  const problemRequestIdRef = useRef(0)
  const kbRequestIdRef = useRef(0)
  const initializedRef = useRef(false)
  const consumedVaultIntentRef = useRef<typeof pendingVaultIntent>(null)

  // ===== 题库搜索 =====
  const doSearch = useCallback(async (
    p: number = 1,
    force: boolean = false,
    overrides: { platform?: ScrapeParams['platform']; keyword?: string; difficulty?: string } = {},
  ) => {
    const requestId = ++problemRequestIdRef.current
    const requestPlatform = overrides.platform
      ?? (platform === 'nowcoder' ? 'nowcoder' : platform === 'leetcode' ? 'leetcode' : 'luogu')
    const requestKeyword = overrides.keyword ?? keyword
    const requestDifficulty = overrides.difficulty ?? difficulty

    setLoading(true)
    setError('')
    setSelected(null)

    try {
      const params: ScrapeParams = {
        platform: requestPlatform,
        page: p,
        limit: 20,
        forceRefresh: force,
      }
      if (requestKeyword) params.keyword = requestKeyword
      if (requestDifficulty) params.difficulty = requestDifficulty

      const result = await scrapeResources(params)
      if (requestId !== problemRequestIdRef.current) return

      setResources(result.resources)
      setTotal(result.total)
      setSource(result.source)
      setPage(p)

      if (result.resources.length === 0 && result.source !== 'cache') {
        setError(result.failure?.message || '未找到题目，试试换个关键词？或确认后端服务已启动')
      }
    } catch (err: any) {
      if (requestId !== problemRequestIdRef.current) return
      setError(err.message || '加载失败')
      setResources([])
    } finally {
      if (requestId === problemRequestIdRef.current) setLoading(false)
    }
  }, [platform, keyword, difficulty])

  // ===== 知识库加载 =====
  const loadKnowledgeBase = useCallback(async (section?: string, sourceId?: string) => {
    const requestId = ++kbRequestIdRef.current
    setKbLoading(true)
    try {
      const src = sourceId || KB_SOURCE_MAP[platform as string] || ''
      const [sectionsData, entries] = await Promise.all([
        fetchKBSections(src),
        fetchKBEntries(section, src),
      ])
      if (requestId !== kbRequestIdRef.current) return
      setKbSections(sectionsData.sections)
      setKbEntries(entries)
    } catch {
      if (requestId !== kbRequestIdRef.current) return
      setKbSections([])
      setKbEntries([])
    } finally {
      if (requestId === kbRequestIdRef.current) setKbLoading(false)
    }
  }, [platform])

  const handlePlatformChange = (nextPlatform: PlatformTab) => {
    problemRequestIdRef.current += 1
    kbRequestIdRef.current += 1
    setLoading(false)
    setKbLoading(false)
    setPlatform(nextPlatform)
    setKeyword('')
    setDifficulty('')
    setPage(1)
    setResources([])
    setTotal(0)
    setSource('')
    setError('')
    setSelected(null)
    setKbSection('')
    setKbSearch('')
    setKbDetail(null)

    if (nextPlatform === 'runoob_kb' || nextPlatform === 'hello_algo_kb') {
      loadKnowledgeBase(undefined, KB_SOURCE_MAP[nextPlatform])
    } else {
      doSearch(1, false, { platform: nextPlatform, keyword: '', difficulty: '' })
    }
  }

  // 首次进入或接收仪表盘推荐时定位到相应内容
  useEffect(() => {
    if (pendingVaultIntent && consumedVaultIntentRef.current !== pendingVaultIntent) {
      consumedVaultIntentRef.current = pendingVaultIntent
      initializedRef.current = true
      problemRequestIdRef.current += 1
      kbRequestIdRef.current += 1
      setLoading(false)
      setKbLoading(false)
      setSelected(null)
      setKbDetail(null)

      if (pendingVaultIntent.kind === 'problems') {
        setPlatform('nowcoder')
        setKeyword(pendingVaultIntent.query)
        setDifficulty('0')
        setPage(1)
        setKbSearch('')
        doSearch(1, false, { platform: 'nowcoder', keyword: pendingVaultIntent.query, difficulty: '0' })
      } else {
        setPlatform('hello_algo_kb')
        setKeyword('')
        setDifficulty('')
        setKbSection('')
        setKbSearch(pendingVaultIntent.query)
        loadKnowledgeBase(undefined, KB_SOURCE_MAP.hello_algo_kb)
      }

      setPendingVaultIntent(null)
      return
    }

    if (!initializedRef.current && !pendingVaultIntent) {
      initializedRef.current = true
      doSearch(1, false, { platform: DEFAULT_PROBLEM_PLATFORM, keyword: '', difficulty: '' })
    }
  }, [pendingVaultIntent, setPendingVaultIntent, doSearch, loadKnowledgeBase])

  // 知识库分类切换
  const handleKbSectionChange = (section: string) => {
    const s = kbSection === section ? '' : section
    setKbSection(s)
    loadKnowledgeBase(s || undefined)
  }

  // 知识库搜索过滤（前端本地过滤）
  const filteredKBEntries = kbSearch
    ? kbEntries.filter(e =>
        e.title.toLowerCase().includes(kbSearch.toLowerCase()) ||
        e.summary.toLowerCase().includes(kbSearch.toLowerCase()) ||
        e.category.toLowerCase().includes(kbSearch.toLowerCase())
      )
    : kbEntries

  // 知识库条目点击 — 加载全文
  const handleKbEntryClick = async (entry: KnowledgeEntry) => {
    setKbDetailLoading(true)
    const content = await fetchKBEntryContent(entry.url)
    if (content) {
      setKbDetail(content)
    }
    setKbDetailLoading(false)
  }

  // 关闭知识库详情
  const handleKbDetailBack = () => {
    setKbDetail(null)
  }

  // 快捷标签搜索
  const handleTagClick = (tag: typeof SEARCH_TAGS[keyof typeof SEARCH_TAGS][number]) => {
    setKeyword(tag.keyword)
    doSearch(1, false, { keyword: tag.keyword })
  }

  // 难度变化
  const handleDifficultyChange = (val: string) => {
    setDifficulty(val)
    doSearch(1, false, { difficulty: val })
  }

  // 刷新
  const handleRefresh = () => doSearch(page, true)

  // 清除缓存
  const handleClearCache = () => {
    clearScrapeCache()
    setSource('')
  }

  const totalPages = Math.min(Math.ceil(total / 20), 10)

  // ===== 渲染知识库（基础语法 / 算法教程） =====
  if (KB_TABS.includes(platform as PlatformTab)) {
    const isAlgo = platform === 'hello_algo_kb'
    // 内置阅读器模式
    if (kbDetail) {
      return (
        <div className="flex flex-col h-full overflow-y-auto">
          <header className="flex items-center gap-3 px-6 py-4 page-header shrink-0">
            <button onClick={handleKbDetailBack} className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
              <ArrowLeft size={15} /> 返回知识库
            </button>
          </header>

          {kbDetailLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <AppIcon name={isAlgo ? '📘' : '📖'} size={40} className="animate-pulse-soft mx-auto mb-3 text-primary-400" />
                <p className="text-ink-muted">加载章节内容...</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="max-w-3xl mx-auto">
                {/* 标题 */}
                <h2 className="text-2xl font-bold text-ink-strong mb-2">{kbDetail.title}</h2>
                <div className="flex items-center gap-3 mb-6">
                  <span className="inline-flex items-center gap-1.5 text-xs bg-surface-300/50 text-ink-muted px-2.5 py-1 rounded-full border border-line/30">
                    <AppIcon name={CATEGORY_ICONS[kbDetail.category] || '📄'} size={12} /> {kbDetail.category}
                  </span>
                  <a
                    href={kbDetail.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 underline"
                  >
                    查看原文 <ExternalLink size={12} />
                  </a>
                </div>

                {/* 正文 */}
                <MarkdownRenderer content={kbDetail.content} />
              </div>
            </div>
          )}
        </div>
      )
    }

    // 列表模式
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        {/* 头部 */}
        <header className="flex items-center gap-3 px-6 py-4 page-header shrink-0">
          <button className="lg:hidden text-ink-muted hover:text-ink" onClick={toggleSidebar}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-ink-strong">
              {isAlgo ? '算法教程' : '基础语法'}
              <span className="ml-2 inline-flex items-center gap-1 text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20"><AppIcon name="📖" size={10} /> 拓展阅读材料</span>
            </h2>
            <p className="text-xs text-ink-subtle">
              {isAlgo ? 'Hello 算法 中文教程 · ' : '菜鸟教程 C++ 中文文档 · '}{kbEntries.length} 章 · 点击章节阅读全文
            </p>
          </div>
          <button onClick={() => loadKnowledgeBase(kbSection || undefined)} className="inline-flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300">
            <RefreshCw size={14} /> 刷新
          </button>
        </header>

        {/* 平台 Tab + 分类 + 搜索（保持不变） */}
        <div className="px-6 pt-4">
          <div className="flex gap-1 mb-4 bg-surface-400/60 rounded-xl p-1">
            {PLATFORM_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handlePlatformChange(tab.id as PlatformTab)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  platform === tab.id
                    ? 'bg-primary-500/15 text-primary-300 shadow-sm'
                    : 'text-ink-muted hover:text-ink hover:bg-surface-50/50'
                }`}
              >
                <AppIcon name={tab.icon} size={15} className="mr-1.5 inline-block align-[-2px]" />
                {tab.name}
              </button>
            ))}
          </div>

          {/* 分类筛选 + 搜索 */}
          <div className="flex gap-2 mb-4">
            <div className="flex flex-wrap gap-1.5 flex-1">
              {kbSections.length > 0 && (
                <button
                  onClick={() => handleKbSectionChange('')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    kbSection === ''
                      ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                      : 'bg-surface-300/30 text-ink-muted border border-line/30 hover:border-primary-500/30 hover:bg-primary-500/5'
                  }`}
                >
                  <span className="inline-flex items-center gap-1"><AppIcon name="📖" size={12} /> 全部 ({kbSections.reduce((a,b)=>a+b.count,0)})</span>
                </button>
              )}
              {kbSections.map((s) => (
                <button
                  key={s.name}
                  onClick={() => handleKbSectionChange(s.name)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    kbSection === s.name
                      ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30 shadow-glow-sm'
                      : 'bg-surface-300/30 text-ink-muted border border-line/30 hover:border-primary-500/30 hover:bg-primary-500/5'
                  }`}
                >
                  <span className="inline-flex items-center gap-1"><AppIcon name={CATEGORY_ICONS[s.name] || '📄'} size={12} /> {s.name} ({s.count})</span>
                </button>
              ))}
            </div>
            <div className="relative w-48 shrink-0">
              <input
                type="text"
                value={kbSearch}
                onChange={(e) => setKbSearch(e.target.value)}
                placeholder="搜索章节..."
                className="w-full px-3 py-2 text-sm bg-surface-300/50 border border-line/50 rounded-xl text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
            </div>
          </div>

          {/* 加载中 */}
          {kbLoading && (
            <div className="text-center py-12">
              <RefreshCw size={36} className="animate-spin mx-auto text-primary-400" />
              <p className="text-ink-muted mt-3">加载知识库...</p>
            </div>
          )}

          {/* 章节列表 — 点击打开内置阅读器 */}
          {!kbLoading && (
            <div className="space-y-1">
              {filteredKBEntries.map((entry, idx) => (
                <button
                  key={idx}
                  onClick={() => handleKbEntryClick(entry)}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-50/60 border border-transparent hover:border-line/30 transition-all group"
                >
                  <AppIcon name={CATEGORY_ICONS[entry.category] || '📄'} size={18} className="shrink-0 text-ink-muted group-hover:text-primary-300 transition-colors" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-ink group-hover:text-primary-300 transition-colors truncate">
                      {entry.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-ink-subtle bg-surface-300/50 px-1.5 py-0.5 rounded">
                        {entry.category}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                        <AppIcon name="📖" size={10} /> 拓展阅读
                      </span>
                      <span className="text-xs text-ink-subtle truncate hidden sm:inline">
                        {entry.summary.slice(0, 60)}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-ink-subtle group-hover:text-primary-400 shrink-0">
                    阅读 <ArrowRight size={13} />
                  </span>
                </button>
              ))}
              {filteredKBEntries.length === 0 && !kbLoading && (
                <div className="text-center py-12">
                  <AppIcon name="📭" size={44} className="mx-auto mb-4 text-ink-subtle" />
                  <h3 className="text-lg font-semibold text-ink mb-2">无匹配章节</h3>
                  <p className="text-ink-muted">尝试更换搜索关键词或分类筛选</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ===== 渲染题库（原有逻辑） =====
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* 头部 */}
      <header className="flex items-center gap-3 px-6 py-4 page-header shrink-0">
        <button
          className="lg:hidden text-ink-muted hover:text-ink"
          onClick={toggleSidebar}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-semibold text-ink-strong">代码宝库</h2>
          <p className="flex items-center gap-1.5 text-xs text-ink-subtle">
            洛谷/力扣/牛客精选题目 · 基础语法与算法教程
            {source === 'bank' && <span className="inline-flex items-center gap-1"><AppIcon name="📚" size={12} /> 内置题库</span>}
            {source === 'live' && <span className="inline-flex items-center gap-1"><AppIcon name="🌐" size={12} /> 实时数据</span>}
            {source === 'cache' && <span className="inline-flex items-center gap-1"><AppIcon name="📦" size={12} /> 缓存</span>}
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
              <ArrowLeft size={15} /> 返回列表
            </button>
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <AppIcon name={selected.platformIcon} size={30} className="text-primary-300" />
                <div>
                  <h3 className="text-xl font-bold text-ink-strong">{selected.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-surface-400/60 text-ink-muted px-2 py-0.5 rounded-full">
                      {selected.platformName}
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
                    {selected.acceptanceRate != null && (
                      <span className="text-xs text-ink-muted">
                        通过率 {selected.acceptanceRate}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 标签 */}
              {selected.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {selected.tags.map((tag, i) => (
                    <span key={i} className="text-xs bg-surface-300/50 text-ink px-2.5 py-1 rounded-full border border-line/30">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* 跳转按钮 */}
              <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3">
                <AppIcon name={selected.platformIcon} size={18} className="text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800">在 {selected.platformName} 上查看完整题目</p>
                  <p className="text-xs text-blue-500 mt-0.5">{selected.url}</p>
                </div>
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  打开原题 <ExternalLink size={14} />
                </a>
                <button
                  onClick={() => openProblemInEditor(selected)}
                  className="mt-2 flex w-full items-center justify-center rounded-xl border border-primary-500/25 bg-primary-500/10 px-4 py-2 text-sm font-medium text-primary-300 transition hover:border-primary-400/50 hover:bg-primary-500/20"
                >
                  <AppIcon name="💻" size={14} className="mr-1.5" /> 在线编辑
                </button>
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
                onClick={() => handlePlatformChange(tab.id as PlatformTab)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  platform === tab.id
                    ? 'bg-primary-500/15 text-primary-300 shadow-sm'
                    : 'text-ink-muted hover:text-ink hover:bg-surface-50/50'
                }`}
              >
                <AppIcon name={tab.icon} size={15} className="mr-1.5 inline-block align-[-2px]" />
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
                className="w-full px-4 py-2.5 pr-10 bg-surface-300/50 border border-line/50 rounded-xl text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/30"
              />
              <button
                onClick={() => doSearch(1, false)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-ink-muted hover:text-primary-400"
              >
                <Search size={17} />
              </button>
            </div>

            {/* 难度筛选 */}
            {platform === 'leetcode' ? (
              <select
                value={difficulty}
                onChange={(e) => handleDifficultyChange(e.target.value)}
                className="px-3 py-2.5 bg-surface-300/50 border border-line/50 rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              >
                {LEETCODE_DIFFICULTIES.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            ) : platform === 'nowcoder' ? (
              <select
                value={difficulty}
                onChange={(e) => handleDifficultyChange(e.target.value)}
                className="px-3 py-2.5 bg-surface-300/50 border border-line/50 rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary-500/30"
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
                className="px-3 py-2.5 bg-surface-300/50 border border-line/50 rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary-500/30"
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
              className="px-4 py-2.5 text-sm font-medium text-ink-muted bg-surface-300/50 border border-line/50 rounded-xl hover:bg-surface-200 disabled:opacity-50 transition-colors"
              title={source === 'cache' ? '强制刷新（清除缓存）' : '刷新'}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
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
                    : 'bg-surface-300/30 text-ink-muted border border-line/30 hover:border-primary-500/30 hover:bg-primary-500/5'
                }`}
              >
                <span className="inline-flex items-center gap-1"><AppIcon name={tag.icon} size={12} /> {tag.label}</span>
              </button>
            ))}
          </div>

          {/* 状态栏 */}
          <div className="flex items-center justify-between mb-4 text-xs text-ink-muted">
            <span>{total > 0 ? `共 ${total} 题` : ''}</span>
            <div className="flex gap-3">
              {source !== 'bank' && (
                <button onClick={handleClearCache} className="inline-flex items-center gap-1 hover:text-ink-muted">
                  <Trash2 size={12} /> 清除缓存
                </button>
              )}
              {source === 'bank' && total > 0 && (
                <span className="inline-flex items-center gap-1 text-green-500"><Check size={13} /> 题库已加载</span>
              )}
            </div>
          </div>

          {/* 加载中 */}
          {loading && (
            <div className="text-center py-12">
              <RefreshCw size={36} className="animate-spin mx-auto text-primary-400" />
              <p className="text-ink-muted mt-3">
                正在从 {PLATFORM_TABS.find(t => t.id === platform)?.name} 爬取题目...
              </p>
            </div>
          )}

          {/* 错误 */}
          {!loading && error && (
            <div className="text-center py-16">
              <div className="mb-4">
                <AppIcon name={error.includes('Failed to fetch') || error.includes('NetworkError') ? '🔌' : '⚠️'} size={44} className="mx-auto text-ink-subtle" />
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">
                {error.includes('Failed to fetch') || error.includes('NetworkError')
                  ? '无法连接到后端'
                  : '爬取遇到问题'}
              </h3>
              <p className="text-ink-muted max-w-md mx-auto mb-4">
                {error.includes('Failed to fetch') || error.includes('NetworkError')
                  ? '资源爬取需要后端服务支持。请确保已启动 FastAPI 后端：'
                  : '平台可能暂时限制了访问，请稍后重试或切换平台'}
              </p>
              {(error.includes('Failed to fetch') || error.includes('NetworkError')) && (
                <code className="bg-code-bg px-4 py-2 rounded-lg text-sm text-ink mb-3 block border border-code-line">
                  cd backend && python main.py
                </code>
              )}
              <p className="text-xs text-ink-subtle mt-3">{error}</p>
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
              <AppIcon name="📭" size={44} className="mx-auto mb-4 text-ink-subtle" />
              <h3 className="text-lg font-semibold text-ink mb-2">开始探索题目</h3>
              <p className="text-ink-muted max-w-sm mx-auto">
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
                      <AppIcon name={res.platformIcon} size={24} className="shrink-0 text-ink-muted group-hover:text-primary-300 transition-colors" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-ink group-hover:text-primary-300 transition-colors text-sm leading-snug line-clamp-2">
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
                          {res.acceptanceRate != null && (
                            <span className="text-xs text-ink-muted">
                              {res.acceptanceRate}%
                            </span>
                          )}
                          {res.tags.slice(0, 2).map((tag, i) => (
                            <span key={i} className="text-xs text-ink-muted">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-ink group-hover:text-primary-400 shrink-0" />
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
                    className="px-3 py-1.5 text-sm rounded-lg border border-line/50 hover:bg-surface-300/30 disabled:opacity-30"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => doSearch(i + 1, false)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                        page === i + 1
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'border-line/50 hover:bg-surface-300/30'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => doSearch(Math.min(totalPages, page + 1), false)}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 text-sm rounded-lg border border-line/50 hover:bg-surface-300/30 disabled:opacity-30"
                  >
                    <ChevronRight size={15} />
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
