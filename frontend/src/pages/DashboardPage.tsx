import { useState, useEffect } from 'react'
import { useStore, type ResourceTab } from '../stores/useStore'
import RadarChart, { computeRadarDimensions } from '../components/RadarChart'
import KnowledgeGraph from '../components/KnowledgeGraph'
import { AppIcon } from '../components/Icon'
import { loadAccounts } from '../services/platformService'

interface Recommendation {
  type: string
  title: string
  description: string
  topic: string
  priority: 'high' | 'medium' | 'low'
  reason: string
}

const RESOURCE_TYPE_ICONS: Record<string, string> = {
  doc: '📄', mindmap: '🧠', reading: '📖', video: '🎬',
  code_case: '💻', exercise: '🏋️', project: '🏗️',
  ppt: '📊', image: '🎨',
}
const RESOURCE_TYPE_LABELS: Record<string, string> = {
  doc: '讲解文档', mindmap: '思维导图', reading: '拓展阅读',
  video: '教学视频', code_case: '代码实操', exercise: '练习题', project: '实践项目',
  ppt: '课件PPT', image: 'AI插图',
}
const PRIORITY_COLORS: Record<string, string> = {
  high: 'border-red-500/30 bg-red-500/5', medium: 'border-amber-500/30 bg-amber-500/5',
  low: 'border-line/30 bg-surface-300/30',
}
const PRIORITY_META: Record<string, { dot: string; label: string }> = {
  high: { dot: '🔴', label: '优先' }, medium: { dot: '🟡', label: '推荐' }, low: { dot: '🟢', label: '拓展' },
}

const statCards = [
  { key: 'total_exercises', label: '练习总数', icon: '🏋️', color: 'from-cyan-500/10 to-cyan-500/5 text-cyan-300 border-cyan-500/20' },
  { key: 'accuracy', label: '正确率', icon: '🎯', color: 'from-emerald-500/10 to-emerald-500/5 text-emerald-300 border-emerald-500/20', suffix: '%' },
  { key: 'total_resources', label: '学习资源', icon: '📚', color: 'from-violet-500/10 to-violet-500/5 text-violet-300 border-violet-500/20' },
  { key: 'total_paths', label: '学习路径', icon: '🗺️', color: 'from-amber-500/10 to-amber-500/5 text-amber-300 border-amber-500/20' },
  { key: 'total_assessments', label: '评估次数', icon: '📊', color: 'from-pink-500/10 to-pink-500/5 text-pink-300 border-pink-500/20' },
]

const RESOURCE_TYPE_NAMES: Record<string, string> = RESOURCE_TYPE_LABELS

export default function DashboardPage() {
  const { stats, profile, messages } = useStore()
  const { toggleSidebar, setActiveTab, setPendingResourceIntent, setPendingVaultIntent, setPendingChatMessage } = useStore()
  const [showKnowledgeGraph, setShowKnowledgeGraph] = useState(false)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [studyTip, setStudyTip] = useState('')
  const [recLoading, setRecLoading] = useState(false)

  const radarDimensions = computeRadarDimensions(profile, stats, Math.ceil(messages.length / 2))

  const handleRecommendation = (rec: Recommendation) => {
    const topic = rec.topic?.trim() || rec.title?.trim() || '这个主题'
    const resourceTypes: ResourceTab[] = ['image', 'ppt', 'mindmap', 'video', 'code_case', 'project']

    if (resourceTypes.includes(rec.type as ResourceTab)) {
      setPendingResourceIntent({ tab: rec.type as ResourceTab, topic })
      setActiveTab('resources')
      return
    }
    if (rec.type === 'reading') {
      setPendingVaultIntent({ kind: 'reading', query: topic })
      setActiveTab('vault')
      return
    }
    if (rec.type === 'exercise') {
      setPendingVaultIntent({ kind: 'problems', query: topic })
      setActiveTab('vault')
      return
    }

    const prompt = rec.type === 'doc'
      ? `请围绕「${topic}」生成一份结构清晰的讲解文档，包含核心概念、示例和学习要点。`
      : `我收到了关于「${topic}」的学习方向推荐。请先帮我理解这个主题，并建议下一步学习方式。`
    setPendingChatMessage(prompt)
    setActiveTab('chat')
  }

  const recommendationAction = (type: string) => ({
    image: '按主题生成插图', ppt: '按主题生成 PPT', mindmap: '按主题生成导图',
    video: '按主题生成视频', code_case: '生成代码案例', project: '生成项目方案',
    reading: '搜索拓展阅读', exercise: '搜索练习题', doc: '去对话生成讲解',
  }[type] || '去对话继续学习')

  // 加载推荐
  useEffect(() => {
    setRecLoading(true)
    fetch('/api/resources/recommend/1')
      .then(r => r.json())
      .then(data => {
        if (data.recommendations) {
          setRecommendations(data.recommendations)
          setStudyTip(data.study_tip || '')
        }
      })
      .catch(() => {})
      .finally(() => setRecLoading(false))
  }, [stats?.total_exercises, stats?.total_resources])

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <header className="flex items-center gap-3 px-6 py-4 page-header shrink-0">
        <button className="lg:hidden text-ink-muted hover:text-ink" onClick={toggleSidebar}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div className="flex-1"><h2 className="text-lg font-semibold text-ink-strong">学习仪表盘</h2><p className="text-xs text-ink-muted">实时追踪你的学习进度与成果（对话自动更新）</p></div>
        <button
          onClick={async () => {
            try {
              const resp = await fetch('/api/assessment/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_id: 1 }),
              })
              const data = await resp.json()
              alert(`评估完成！\n\n${data.stats?.total_exercises || 0} 题练习\n正确率: ${data.stats?.accuracy || 0}%\n\n评估报告已生成，路径已自动调整。`)
              window.location.reload()
            } catch (e: any) {
              alert('评估失败: ' + (e.message || '未知错误'))
            }
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 rounded-lg border border-primary-500/20 transition-colors shrink-0"
        >
          <AppIcon name="📊" size={15} /> 立即评估
        </button>
      </header>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {statCards.map((card) => {
            const value = stats?.[card.key as keyof typeof stats]
            const displayValue = typeof value === 'number' ? (card.key === 'accuracy' ? value.toFixed(1) : value) : 0
            return (
              <div key={card.key} className={`card bg-gradient-to-br ${card.color} border`}>
                <div className="flex items-center justify-between mb-2"><AppIcon name={card.icon} size={24} /></div>
                <div className="text-2xl font-bold">{displayValue}{card.suffix || ''}</div>
                <div className="text-sm opacity-60 mt-1">{card.label}</div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-ink-strong mb-4"><AppIcon name="🎯" size={19} className="text-primary-400" /> 五维评估雷达图</h3>
            <RadarChart dimensions={radarDimensions} size={260} />
            <p className="text-xs text-ink-subtle text-center mt-1">基于画像六维数据、练习统计和对话历史动态计算</p>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-ink-strong"><AppIcon name="🕸️" size={19} className="text-primary-400" /> 课程知识图谱</h3>
              <button onClick={() => setShowKnowledgeGraph(!showKnowledgeGraph)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${showKnowledgeGraph ? 'bg-primary-500/10 text-primary-300 border-primary-500/30' : 'bg-surface-300/30 text-ink-muted border-line/30 hover:border-line'}`}>
                {showKnowledgeGraph ? '收起' : '展开'}
              </button>
            </div>
            {showKnowledgeGraph ? (
              <div className="overflow-x-auto"><KnowledgeGraph width={500} /></div>
            ) : (
              <div className="text-center py-16 text-ink-subtle"><AppIcon name="🕸️" size={40} className="mx-auto mb-3 text-ink-subtle" /><p className="text-sm">展开查看 C++ 算法课程体系</p><p className="text-xs mt-1">17 个课程模块前置依赖关系</p></div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-ink-strong mb-4"><AppIcon name="📦" size={19} className="text-primary-400" /> 资源类型分布</h3>
            {stats?.resources_by_type && Object.keys(stats.resources_by_type).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(stats.resources_by_type).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-sm min-w-[120px] text-ink"><AppIcon name={RESOURCE_TYPE_ICONS[type] || '📦'} size={14} className="text-ink-subtle" />{RESOURCE_TYPE_NAMES[type] || type}</span>
                    <div className="flex-1 bg-surface-400/60 rounded-full h-2.5">
                      <div className="bg-gradient-to-r from-primary-500 to-accent-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (count as number) / Math.max(1, stats.total_resources) * 100)}%` }} />
                    </div>
                    <span className="text-sm font-medium text-ink-muted w-8 text-right">{count as number}</span>
                  </div>
                ))}
              </div>
            ) : (<p className="flex items-center gap-1.5 text-ink-subtle text-sm">暂无资源数据，去对话页面生成学习资料吧 <AppIcon name="🚀" size={14} /></p>)}
          </div>
          <div className="card">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-ink-strong mb-4"><AppIcon name="🧠" size={19} className="text-primary-400" /> 画像完善度</h3>
            {profile ? (
              <div className="space-y-4">
                {[
                  { key: 'knowledge_base', label: '知识基础', icon: '📖' }, { key: 'cognitive_style', label: '认知风格', icon: '💭' },
                  { key: 'learning_goals', label: '学习目标', icon: '🎯' }, { key: 'error_patterns', label: '易错点偏好', icon: '⚠️' },
                  { key: 'learning_pace', label: '学习节奏', icon: '⏱️' }, { key: 'interests', label: '兴趣领域', icon: '💡' },
                ].map((dim) => {
                  const data = (profile as any)[dim.key]
                  const filled = data && typeof data === 'object' && Object.values(data).some(v => v)
                  return (
                    <div key={dim.key} className="flex items-center gap-3">
                      <AppIcon name={dim.icon} size={17} className="text-ink-muted" />
                      <span className="text-sm text-ink flex-1">{dim.label}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${filled ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-surface-300/50 text-ink-subtle'}`}>
                        {filled ? <><AppIcon name="✓" size={12} /> 已收集</> : '待收集'}
                      </span>
                    </div>
                  )
                })}
                <div className="pt-3 border-t border-line/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-ink-muted">整体置信度</span>
                    <span className="text-sm font-semibold text-primary-300">{((profile.confidence_score || 0) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="bg-surface-400/60 rounded-full h-2">
                    <div className="bg-gradient-to-r from-primary-400 to-accent-500 h-2 rounded-full transition-all duration-500 shadow-glow-sm"
                      style={{ width: `${(profile.confidence_score || 0) * 100}%` }} />
                  </div>
                </div>
              </div>
            ) : (<p className="flex items-center gap-1.5 text-ink-subtle text-sm">画像尚未构建，去对话页面和AI聊聊吧 <AppIcon name="💬" size={14} /></p>)}
          </div>
        </div>

        {/* 为你推荐 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-ink-strong"><AppIcon name="🎯" size={19} className="text-primary-400" /> 为你推荐</h3>
            {studyTip && <span className="inline-flex items-center gap-1 text-xs text-primary-400 italic"><AppIcon name="💬" size={12} /> {studyTip}</span>}
          </div>
          {recLoading ? (
            <div className="text-center py-8"><AppIcon name="🔄" size={30} className="mx-auto text-primary-400 animate-spin" /><p className="text-ink-muted text-sm mt-2">AI 正在分析你的学习画像...</p></div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-8">
              <AppIcon name="📭" size={40} className="mx-auto mb-2 text-ink-subtle" />
              <p className="text-ink-muted text-sm mb-3">完成学习画像后即可获得个性化推荐</p>
              <button type="button" onClick={() => setActiveTab('chat')} className="btn-secondary text-sm">去对话完善学习画像</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recommendations.map((rec) => (
                <article key={`${rec.type}-${rec.topic}-${rec.title}`} className={`p-4 rounded-xl border ${PRIORITY_COLORS[rec.priority] || PRIORITY_COLORS.low} hover:border-primary-500/30 transition-all group`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AppIcon name={RESOURCE_TYPE_ICONS[rec.type] || '📦'} size={20} className="text-primary-300" />
                    <span className="text-xs font-medium text-ink-subtle">{RESOURCE_TYPE_LABELS[rec.type] || rec.type}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-ink-subtle ml-auto">
                      <AppIcon name={PRIORITY_META[rec.priority]?.dot || '🟢'} size={12} />{PRIORITY_META[rec.priority]?.label || ''}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-ink group-hover:text-primary-300 transition-colors mb-1">{rec.title}</h4>
                  <p className="text-xs text-ink-muted mb-2">{rec.description}</p>
                  <p className="flex items-start gap-1 text-[10px] text-ink-subtle italic mb-3"><AppIcon name="💡" size={11} className="mt-px" /> {rec.reason}</p>
                  <button
                    type="button"
                    onClick={() => handleRecommendation(rec)}
                    className="w-full rounded-lg border border-primary-500/20 bg-primary-500/10 px-3 py-2 text-xs font-semibold text-primary-300 hover:bg-primary-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60"
                    aria-label={`${recommendationAction(rec.type)}：${rec.title}`}
                  >
                    {recommendationAction(rec.type)}
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>

        <PlatformStatsWidget />
      </div>
    </div>
  )
}

function PlatformStatsWidget() {
  const accounts = loadAccounts()
  const verified = accounts.filter(a => a.verified && a.stats)
  if (verified.length === 0) return null
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-ink-strong"><AppIcon name="🏆" size={19} className="text-primary-400" /> 竞赛平台数据</h3>
        <span className="text-xs text-ink-subtle">{verified.length} 个平台已绑定</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {verified.map((acc) => (
          <a key={acc.platform} href={acc.profileUrl} target="_blank" rel="noopener noreferrer"
            className="flex flex-col items-center p-3 rounded-xl bg-surface-400/40 hover:bg-surface-300/40 transition-colors border border-line/20">
            <AppIcon name={{ codeforces: '🏆', atcoder: '🏆', luogu: '🏔️', nowcoder: '🐮', leetcode: '💻', acwing: '🧪', lanqiao: '🏅' }[acc.platform] || '🏆'} size={22} className="mb-1 text-primary-300" />
            <span className="text-[10px] text-ink-subtle mb-1">@{acc.handle}</span>
            {acc.stats?.rating ? <span className="text-lg font-bold text-primary-300">{acc.stats.rating}</span> : null}
            {acc.stats?.problemsSolved ? <span className="text-xs text-emerald-400">{acc.stats.problemsSolved} 题</span> : null}
          </a>
        ))}
      </div>
    </div>
  )
}
