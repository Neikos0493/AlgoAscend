import { useEffect } from 'react'
import { useStore } from '../stores/useStore'
import { fetchDashboard } from '../services/api'

const statCards = [
  { key: 'total_exercises', label: '练习总数', icon: '🏋️', color: 'bg-blue-50 text-blue-700' },
  { key: 'accuracy', label: '正确率', icon: '🎯', color: 'bg-green-50 text-green-700', suffix: '%' },
  { key: 'total_resources', label: '学习资源', icon: '📚', color: 'bg-purple-50 text-purple-700' },
  { key: 'total_paths', label: '学习路径', icon: '🗺️', color: 'bg-amber-50 text-amber-700' },
  { key: 'total_assessments', label: '评估次数', icon: '📊', color: 'bg-pink-50 text-pink-700' },
]

const RESOURCE_TYPE_NAMES: Record<string, string> = {
  doc: '📄 讲解文档',
  mindmap: '🧠 思维导图',
  reading: '📖 拓展阅读',
  video_script: '🎬 视频脚本',
  code_case: '💻 代码案例',
  exercise: '🏋️ 练习题',
}

export default function DashboardPage() {
  const { stats, profile, setStats } = useStore()
  const { toggleSidebar } = useStore()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const data = await fetchDashboard(1)
      setStats(data.stats)
    } catch (err) {
      console.log('加载仪表盘数据失败', err)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <header className="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <button
          className="lg:hidden text-gray-500 hover:text-gray-700"
          onClick={toggleSidebar}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">学习仪表盘</h2>
          <p className="text-xs text-gray-500">实时追踪你的学习进度与成果</p>
        </div>
        <button
          onClick={loadData}
          className="ml-auto text-sm text-primary-600 hover:text-primary-700 transition-colors"
        >
          🔄 刷新
        </button>
      </header>

      <div className="p-6 space-y-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {statCards.map((card) => {
            const value = stats?.[card.key as keyof typeof stats]
            const displayValue = typeof value === 'number'
              ? (card.key === 'accuracy' ? value.toFixed(1) : value)
              : 0

            return (
              <div key={card.key} className={`card ${card.color} border-0`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{card.icon}</span>
                </div>
                <div className="text-2xl font-bold">
                  {displayValue}{card.suffix || ''}
                </div>
                <div className="text-sm opacity-75 mt-1">{card.label}</div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 资源分布 */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📦 资源类型分布</h3>
            {stats?.resources_by_type && Object.keys(stats.resources_by_type).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(stats.resources_by_type).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-sm min-w-[120px]">
                      {RESOURCE_TYPE_NAMES[type] || type}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                      <div
                        className="bg-primary-500 h-2.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (count as number) / Math.max(1, stats.total_resources) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-600 w-8 text-right">
                      {count as number}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">暂无资源数据，去对话页面生成学习资料吧 🚀</p>
            )}
          </div>

          {/* 画像概览 */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🧠 画像完善度</h3>
            {profile ? (
              <div className="space-y-4">
                {[
                  { key: 'knowledge_base', label: '知识基础', icon: '📖' },
                  { key: 'cognitive_style', label: '认知风格', icon: '💭' },
                  { key: 'learning_goals', label: '学习目标', icon: '🎯' },
                  { key: 'error_patterns', label: '易错点偏好', icon: '⚠️' },
                  { key: 'learning_pace', label: '学习节奏', icon: '⏱️' },
                  { key: 'interests', label: '兴趣领域', icon: '💡' },
                ].map((dim) => {
                  const data = (profile as any)[dim.key]
                  const filled = data && typeof data === 'object' && Object.values(data).some(v => v)
                  return (
                    <div key={dim.key} className="flex items-center gap-3">
                      <span className="text-lg">{dim.icon}</span>
                      <span className="text-sm text-gray-700 flex-1">{dim.label}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          filled
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {filled ? '✓ 已收集' : '待收集'}
                      </span>
                    </div>
                  )
                })}
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">整体置信度</span>
                    <span className="text-sm font-semibold text-primary-700">
                      {((profile.confidence_score || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-primary-400 to-primary-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(profile.confidence_score || 0) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">画像尚未构建，去对话页面和AI聊聊吧 💬</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
