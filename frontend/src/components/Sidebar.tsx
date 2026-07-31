import { useStore } from '../stores/useStore'
import { AppIcon } from './Icon'
import BrandMark from './brand/BrandMark'

const navItems = [
  { id: 'chat' as const, label: '智能对话', icon: '💬' },
  { id: 'dashboard' as const, label: '学习仪表盘', icon: '📊' },
  { id: 'path' as const, label: '学习路径', icon: '🗺️' },
  { id: 'editor' as const, label: '代码编辑器', icon: '💻' },
  { id: 'vault' as const, label: '代码宝库', icon: '🏛️' },
  { id: 'resources' as const, label: '资源生成', icon: '🎨' },
  { id: 'profile' as const, label: '学习画像', icon: '🧠' },
  { id: 'errors' as const, label: '我的笔记', icon: '📝' },
]

export default function Sidebar() {
  const { activeTab, setActiveTab, sidebarOpen, toggleSidebar, accounts, activeAccountId, theme, toggleTheme } = useStore()
  const currentAccount = accounts.find(a => a.id === activeAccountId)

  return (
    <>
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-[rgb(var(--color-overlay)/0.55)] backdrop-blur-sm z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-sidebar/95 backdrop-blur-2xl border-r border-line/30 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo区域 */}
        <div className="p-5 border-b border-line/30">
          <div className="flex items-center gap-3">
            <BrandMark size={40} decorative />
            <div>
              <h1 className="text-lg font-bold text-ink-strong tracking-wide">
                AlgoAscend
              </h1>
              <p className="text-xs text-primary-400">顶峰相见</p>
            </div>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 mb-2 text-[10px] font-semibold text-ink-subtle uppercase tracking-[0.15em]">
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
                  ? 'bg-primary-500/10 text-primary-500 border border-primary-500/20 shadow-glow-sm'
                  : 'text-ink-muted hover:bg-surface-300/40 hover:text-ink-strong'
                }
              `}
            >
              <AppIcon name={item.icon} size={18} />
              <span>{item.label}</span>
              {activeTab === item.id && (
                <span className="ml-auto w-1.5 h-6 bg-primary-400 rounded-full shadow-glow-sm" />
              )}
            </button>
          ))}

        </nav>

        {/* 底部信息 */}
        <div className="p-4 border-t border-line/30 space-y-2">
          {/* 当前账号 */}
          {currentAccount && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-300/20 border border-line/30">
              <div className="w-8 h-8 rounded-lg bg-primary-500/15 border border-primary-500/30 flex items-center justify-center text-primary-500">
                <AppIcon name={currentAccount.avatar} size={17} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-ink-strong truncate">{currentAccount.nickname}</p>
                <p className="text-[10px] text-ink-subtle">当前账号</p>
              </div>
            </div>
          )}
          <button
            type="button"
            role="switch"
            aria-checked={theme === 'light'}
            aria-label={`切换到${theme === 'dark' ? '浅色' : '深色'}模式`}
            onClick={toggleTheme}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink-muted
                       hover:bg-surface-300/40 hover:text-ink-strong transition-colors
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
          >
            <AppIcon name={theme === 'dark' ? '🌙' : '☀️'} size={16} />
            <span>{theme === 'dark' ? '深色模式' : '浅色模式'}</span>
          </button>
          <button
            onClick={() => useStore.getState().setSettingsOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink-muted
                       hover:bg-surface-300/40 hover:text-ink-strong transition-colors"
          >
            <AppIcon name="⚙️" size={16} />
            <span>设置</span>
          </button>
          <div className="text-[10px] text-ink-subtle text-center space-y-0.5">
            <p className="text-primary-500/60">终抵群星</p>
            <p>多智能体协作架构</p>
            <p className="text-ink-subtle">v3.1 — 代码宝库 · 智能笔记 · 多Agent联动</p>
          </div>
        </div>
      </aside>
    </>
  )
}
