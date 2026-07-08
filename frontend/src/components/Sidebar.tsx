import { useStore } from '../stores/useStore'

const navItems = [
  { id: 'chat' as const, label: '智能对话', icon: '💬' },
  { id: 'dashboard' as const, label: '学习仪表盘', icon: '📊' },
  { id: 'resources' as const, label: '学习资源', icon: '📚' },
  { id: 'profile' as const, label: '学习画像', icon: '🧠' },
]

const agentList = [
  { name: '学习画像分析师', icon: '🧠' },
  { name: '内容生成专家', icon: '📚' },
  { name: '练习设计教练', icon: '🏋️' },
  { name: '学习路径规划师', icon: '🗺️' },
  { name: '智能辅导老师', icon: '🎓' },
  { name: '学习评估分析师', icon: '📊' },
]

export default function Sidebar() {
  const { activeTab, setActiveTab, sidebarOpen, toggleSidebar } = useStore()

  return (
    <>
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-white border-r border-gray-200 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo区域 */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚡</span>
            <div>
              <h1 className="text-lg font-bold text-gray-900">C++算法学习平台</h1>
              <p className="text-xs text-gray-500">多智能体AI辅助系统</p>
            </div>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            功能导航
          </p>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200
                ${activeTab === item.id
                  ? 'bg-primary-50 text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
              {activeTab === item.id && (
                <span className="ml-auto w-1.5 h-6 bg-primary-500 rounded-full" />
              )}
            </button>
          ))}

          {/* 智能体状态 */}
          <div className="mt-6">
            <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              智能体状态
            </p>
            <div className="space-y-1">
              {agentList.map((agent) => (
                <div
                  key={agent.name}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500"
                >
                  <span>{agent.icon}</span>
                  <span className="truncate">{agent.name}</span>
                  <span className="ml-auto w-1.5 h-1.5 bg-accent-400 rounded-full" title="在线" />
                </div>
              ))}
            </div>
          </div>
        </nav>

        {/* 底部信息 */}
        <div className="p-4 border-t border-gray-100">
          <div className="text-xs text-gray-400 text-center">
            <p>基于 DeepSeek / OpenAI</p>
            <p className="mt-0.5">多智能体协作架构</p>
          </div>
        </div>
      </aside>
    </>
  )
}
