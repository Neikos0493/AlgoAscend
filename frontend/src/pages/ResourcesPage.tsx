import { useState, useEffect } from 'react'
import { useStore } from '../stores/useStore'
import { fetchResources } from '../services/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const TYPE_ICONS: Record<string, string> = {
  doc: '📄',
  mindmap: '🧠',
  reading: '📖',
  video_script: '🎬',
  code_case: '💻',
  exercise: '🏋️',
}

const TYPE_NAMES: Record<string, string> = {
  doc: '讲解文档',
  mindmap: '思维导图',
  reading: '拓展阅读',
  video_script: '视频脚本',
  code_case: '代码案例',
  exercise: '练习题',
}

interface Resource {
  id: number
  title: string
  resource_type: string
  content: string
  topic: string
  difficulty: string
  tags: string[]
  agent_generated: string
  created_at: string
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [grouped, setGrouped] = useState<Record<string, Resource[]>>({})
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selected, setSelected] = useState<Resource | null>(null)
  const [loading, setLoading] = useState(true)
  const { toggleSidebar } = useStore()

  useEffect(() => {
    loadResources()
  }, [])

  const loadResources = async () => {
    try {
      setLoading(true)
      const data = await fetchResources(1)
      setResources(data.resources || [])
      setGrouped(data.by_type || {})
    } catch (err) {
      console.log('加载资源失败', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredResources = selectedType === 'all'
    ? resources
    : resources.filter(r => r.resource_type === selectedType)

  const types = Object.keys(grouped)

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
          <h2 className="text-lg font-semibold text-gray-900">学习资源库</h2>
          <p className="text-xs text-gray-500">由多智能体协同生成的个性化学习资料</p>
        </div>
      </header>

      {selected ? (
        /* 资源详情 */
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => setSelected(null)}
              className="mb-4 text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              ← 返回列表
            </button>
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{TYPE_ICONS[selected.resource_type] || '📄'}</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selected.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {TYPE_NAMES[selected.resource_type] || selected.resource_type}
                    </span>
                    {selected.difficulty && (
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                        {selected.difficulty}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {selected.created_at ? new Date(selected.created_at).toLocaleDateString('zh-CN') : ''}
                    </span>
                  </div>
                </div>
              </div>
              <div className="markdown-body border-t border-gray-100 pt-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selected.content || '无内容'}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 资源列表 */
        <div className="p-6">
          {/* 类型筛选 */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedType === 'all'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
              }`}
            >
              📦 全部 ({resources.length})
            </button>
            {types.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedType === type
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
                }`}
              >
                {TYPE_ICONS[type] || '📄'} {TYPE_NAMES[type] || type} ({grouped[type]?.length || 0})
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-4xl animate-pulse-soft">📚</div>
              <p className="text-gray-400 mt-3">加载中...</p>
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">暂无学习资源</h3>
              <p className="text-gray-400 max-w-sm mx-auto">
                去「智能对话」页面，让AI为你生成个性化的学习资料吧！
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredResources.map((res) => (
                <button
                  key={res.id}
                  onClick={() => setSelected(res)}
                  className="card text-left hover:border-primary-300 transition-all duration-200 group"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{TYPE_ICONS[res.resource_type] || '📄'}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-800 group-hover:text-primary-700 transition-colors truncate">
                        {res.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {TYPE_NAMES[res.resource_type] || res.resource_type}
                        </span>
                        {res.difficulty && (
                          <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                            {res.difficulty}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        {res.created_at ? new Date(res.created_at).toLocaleDateString('zh-CN') : ''}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

