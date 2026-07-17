import { useEffect, useState } from 'react'
import { useStore } from '../stores/useStore'
import { fetchDashboard } from '../services/api'
import RadarChart, { computeRadarDimensions } from '../components/RadarChart'
import KnowledgeGraph from '../components/KnowledgeGraph'
import { loadAccounts } from '../services/platformService'

const statCards = [
  { key: 'total_exercises', label: '练习总数', icon: '🏋️', color: 'from-cyan-500/10 to-cyan-500/5 text-cyan-300 border-cyan-500/20' },
  { key: 'accuracy', label: '正确率', icon: '🎯', color: 'from-emerald-500/10 to-emerald-500/5 text-emerald-300 border-emerald-500/20', suffix: '%' },
  { key: 'total_resources', label: '学习资源', icon: '📚', color: 'from-violet-500/10 to-violet-500/5 text-violet-300 border-violet-500/20' },
  { key: 'total_paths', label: '学习路径', icon: '🗺️', color: 'from-amber-500/10 to-amber-500/5 text-amber-300 border-amber-500/20' },
  { key: 'total_assessments', label: '评估次数', icon: '📊', color: 'from-pink-500/10 to-pink-500/5 text-pink-300 border-pink-500/20' },
]

const RESOURCE_TYPE_NAMES: Record<string, string> = {
  doc: '📄 讲解文档', mindmap: '🧠 思维导图', reading: '📖 拓展阅读',
  video_script: '🎬 视频脚本', code_case: '💻 代码案例', exercise: '🏋️ 练习题',
}

export default function DashboardPage() {
  const { stats, profile, messages, setStats } = useStore()
  const { toggleSidebar } = useStore()
  const [showKnowledgeGraph, setShowKnowledgeGraph] = useState(false)

  const radarDimensions = computeRadarDimensions(profile, stats, Math.ceil(messages.length / 2))

  useEffect(() => { loadData() }, [])
  const loadData = async () => { try { const data = await fetchDashboard(1); setStats(data.stats) } catch (err) { console.log('加载失败', err) } }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <header className="flex items-center gap-3 px-6 py-4 bg-surface-100/80 backdrop-blur-xl border-b border-gray-700/30 shrink-0">
        <button className="lg:hidden text-gray-400 hover:text-gray-200" onClick={toggleSidebar}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div><h2 className="text-lg font-semibold text-white">学习仪表盘</h2><p className="text-xs text-gray-400">实时追踪你的学习进度与成果</p></div>
        <button onClick={loadData} className="ml-auto text-sm text-primary-400 hover:text-primary-300 transition-colors">🔄 刷新</button>
      </header>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {statCards.map((card) => {
            const value = stats?.[card.key as keyof typeof stats]
            const displayValue = typeof value === 'number' ? (card.key === 'accuracy' ? value.toFixed(1) : value) : 0
            return (
              <div key={card.key} className={`card bg-gradient-to-br ${card.color} border`}>
                <div className="flex items-center justify-between mb-2"><span className="text-2xl">{card.icon}</span></div>
                <div className="text-2xl font-bold">{displayValue}{card.suffix || ''}</div>
                <div className="text-sm opacity-60 mt-1">{card.label}</div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">🎯 五维评估雷达图</h3>
            <RadarChart dimensions={radarDimensions} size={260} />
            <p className="text-xs text-gray-500 text-center mt-1">基于画像六维数据、练习统计和对话历史动态计算</p>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">🕸️ 课程知识图谱</h3>
              <button onClick={() => setShowKnowledgeGraph(!showKnowledgeGraph)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${showKnowledgeGraph ? 'bg-primary-500/10 text-primary-300 border-primary-500/30' : 'bg-surface-300/30 text-gray-400 border-gray-700/30 hover:border-gray-600'}`}>
                {showKnowledgeGraph ? '收起' : '展开'}
              </button>
            </div>
            {showKnowledgeGraph ? (
              <div className="overflow-x-auto"><KnowledgeGraph width={500} height={480} /></div>
            ) : (
              <div className="text-center py-16 text-gray-500"><div className="text-4xl mb-2">🕸️</div><p className="text-sm">展开查看 C++ 算法课程体系</p><p className="text-xs mt-1">17 个课程模块前置依赖关系</p></div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">📦 资源类型分布</h3>
            {stats?.resources_by_type && Object.keys(stats.resources_by_type).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(stats.resources_by_type).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-sm min-w-[120px] text-gray-300">{RESOURCE_TYPE_NAMES[type] || type}</span>
                    <div className="flex-1 bg-gray-700/50 rounded-full h-2.5">
                      <div className="bg-gradient-to-r from-primary-500 to-accent-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (count as number) / Math.max(1, stats.total_resources) * 100)}%` }} />
                    </div>
                    <span className="text-sm font-medium text-gray-400 w-8 text-right">{count as number}</span>
                  </div>
                ))}
              </div>
            ) : (<p className="text-gray-500 text-sm">暂无资源数据，去对话页面生成学习资料吧 🚀</p>)}
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">🧠 画像完善度</h3>
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
                      <span className="text-lg">{dim.icon}</span>
                      <span className="text-sm text-gray-300 flex-1">{dim.label}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${filled ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-gray-700/30 text-gray-500'}`}>
                        {filled ? '✓ 已收集' : '待收集'}
                      </span>
                    </div>
                  )
                })}
                <div className="pt-3 border-t border-gray-700/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">整体置信度</span>
                    <span className="text-sm font-semibold text-primary-300">{((profile.confidence_score || 0) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="bg-gray-700/50 rounded-full h-2">
                    <div className="bg-gradient-to-r from-primary-400 to-accent-500 h-2 rounded-full transition-all duration-500 shadow-glow-sm"
                      style={{ width: `${(profile.confidence_score || 0) * 100}%` }} />
                  </div>
                </div>
              </div>
            ) : (<p className="text-gray-500 text-sm">画像尚未构建，去对话页面和AI聊聊吧 💬</p>)}
          </div>
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
        <h3 className="text-lg font-semibold text-white">🏆 竞赛平台数据</h3>
        <span className="text-xs text-gray-500">{verified.length} 个平台已绑定</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {verified.map((acc) => (
          <a key={acc.platform} href={acc.profileUrl} target="_blank" rel="noopener noreferrer"
            className="flex flex-col items-center p-3 rounded-xl bg-surface-400/40 hover:bg-surface-300/40 transition-colors border border-gray-700/20">
            <span className="text-lg mb-1">{{ codeforces: '🇷🇺', atcoder: '🇯🇵', luogu: '🏔️', nowcoder: '🐮', leetcode: '💻', acwing: '🧪', lanqiao: '🏅' }[acc.platform] || '🏆'}</span>
            <span className="text-[10px] text-gray-500 mb-1">@{acc.handle}</span>
            {acc.stats?.rating ? <span className="text-lg font-bold text-primary-300">{acc.stats.rating}</span> : null}
            {acc.stats?.problemsSolved ? <span className="text-xs text-emerald-400">{acc.stats.problemsSolved} 题</span> : null}
          </a>
        ))}
      </div>
    </div>
  )
}
