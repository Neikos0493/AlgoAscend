import { useEffect, useState } from 'react'
import { useStore } from './stores/useStore'
import Sidebar from './components/Sidebar'
import OrbitParticleRing from './components/OrbitParticleRing'
import PageTransition from './components/PageTransition'
import ErrorBoundary from './components/ErrorBoundary'
import ChatPage from './pages/ChatPage'
import DashboardPage from './pages/DashboardPage'
import ResourcesPage from './pages/ResourcesPage'
import ProfilePage from './pages/ProfilePage'
import PathPage from './pages/PathPage'

export default function App() {
  const { activeTab, ensureAccount } = useStore()
  const [particleFocus, setParticleFocus] = useState(false)

  useEffect(() => {
    ensureAccount()
  }, [])

  return (
    <div className="flex h-screen overflow-hidden relative isolate bg-[#0a0a14]">
      {/* Canvas 粒子在深色背景之上、内容之下 */}
      <OrbitParticleRing
        enabled={activeTab === 'chat'}
        onFocusChange={setParticleFocus}
      />

      <div
        className={`relative z-20 flex h-full w-full origin-center transition-all duration-500 ease-out ${particleFocus ? 'pointer-events-none scale-[0.985] opacity-0' : 'scale-100 opacity-100'}`}
        aria-hidden={particleFocus}
      >
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <ErrorBoundary fallbackName="页面">
            <PageTransition pageKey={activeTab}>
              <ErrorBoundary fallbackName="智能对话">
                {activeTab === 'chat'      && <ChatPage />}
              </ErrorBoundary>
              <ErrorBoundary fallbackName="学习仪表盘">
                {activeTab === 'dashboard' && <DashboardPage />}
              </ErrorBoundary>
              <ErrorBoundary fallbackName="学习资源">
                {activeTab === 'resources' && <ResourcesPage />}
              </ErrorBoundary>
              <ErrorBoundary fallbackName="学习画像">
                {activeTab === 'profile'   && <ProfilePage />}
              </ErrorBoundary>
              <ErrorBoundary fallbackName="学习路径">
                {activeTab === 'path'      && <PathPage />}
              </ErrorBoundary>
            </PageTransition>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
