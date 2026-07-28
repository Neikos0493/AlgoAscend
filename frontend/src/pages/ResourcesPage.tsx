import { useStore } from '../stores/useStore'
import ResourceGenerator from '../components/ResourceGenerator'
import AlgorithmAnimation from '../components/AlgorithmAnimation'
import { AppIcon } from '../components/Icon'

export default function ResourcesPage() {
  const { toggleSidebar } = useStore()

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <header className="flex items-center gap-3 px-6 py-4 bg-surface-100/80 backdrop-blur-xl border-b border-gray-700/30 shrink-0">
        <button className="lg:hidden text-gray-400 hover:text-gray-200" onClick={toggleSidebar}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div>
          <h2 className="text-lg font-semibold text-white">学习资源生成</h2>
          <p className="text-xs text-gray-500">AI 驱动的算法教学资源生成器</p>
        </div>
      </header>

      <div className="px-6 pt-4 shrink-0">
        <ResourceGenerator />
      </div>
      <div className="px-6 pt-4 pb-6 shrink-0">
        <AlgorithmAnimation />
      </div>
    </div>
  )
}
