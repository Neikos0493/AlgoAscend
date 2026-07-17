import { useStore } from '../stores/useStore'

const navItems = [
  { id: 'chat' as const, label: '智能对话', icon: '💬' },
  { id: 'dashboard' as const, label: '学习仪表盘', icon: '📊' },
  { id: 'path' as const, label: '学习路径', icon: '🗺️' },
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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-surface-100/95 backdrop-blur-2xl border-r border-gray-700/30 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo区域 */}
        <div className="p-5 border-b border-gray-700/30">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-float">⚡</span>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">
                C++算法学习平台
              </h1>
              <p className="text-xs text-primary-400">多智能体AI辅助系统</p>
            </div>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 mb-2 text-[10px] font-semibold text-gray-500 uppercase tracking-[0.15em]">
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
                  ? 'bg-primary-500/10 text-primary-300 border border-primary-500/20 shadow-glow-sm'
                  : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
                }
              `}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
              {activeTab === item.id && (
                <span className="ml-auto w-1.5 h-6 bg-primary-400 rounded-full shadow-glow-sm" />
              )}
            </button>
          ))}

          {/* 智能体状态 */}
          <div className="mt-6">
            <p className="px-3 mb-2 text-[10px] font-semibold text-gray-500 uppercase tracking-[0.15em]">
              智能体状态
            </p>
            <div className="space-y-0.5">
              {agentList.map((agent) => (
                <div
                  key={agent.name}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors rounded-md"
                >
                  <span>{agent.icon}</span>
                  <span className="truncate">{agent.name}</span>
                  <span className="ml-auto relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-400" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </nav>

        {/* 底部信息 */}
        <div className="p-4 border-t border-gray-700/30 space-y-2">
          <button
            onClick={() => useStore.getState().setSettingsOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400
                       hover:bg-white/[0.04] hover:text-gray-200 transition-colors"
          >
            <span>⚙️</span>
            <span>设置</span>
          </button>
          <div className="text-[10px] text-gray-500 text-center space-y-0.5">
            <p className="text-primary-500/60">基于 DeepSeek / OpenAI</p>
            <p>多智能体协作架构</p>
          </div>
        </div>
      </aside>
    </>
  )
}
