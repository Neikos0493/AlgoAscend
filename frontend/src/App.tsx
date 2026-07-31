import { useEffect, useMemo, useState } from 'react'
import usePrefersReducedMotion from './hooks/usePrefersReducedMotion'
import { useStore, isAccountConfigured } from './stores/useStore'
import Sidebar from './components/Sidebar'
import OrbitParticleRing from './components/OrbitParticleRing'
import PageTransition from './components/PageTransition'
import ErrorBoundary from './components/ErrorBoundary'
import ChatPage from './pages/ChatPage'
import DashboardPage from './pages/DashboardPage'
import ResourcesPage from './pages/ResourcesPage'
import CodeVaultPage from './pages/CodeVaultPage'
import ProfilePage from './pages/ProfilePage'
import PathPage from './pages/PathPage'
import CodeEditorPage from './pages/CodeEditorPage'
import ErrorNotebookPage from './pages/ErrorNotebookPage'
import SettingsModal from './components/SettingsModal'
import LocalProfilePage from './components/LocalProfilePage'
import BrandIntro from './components/brand/BrandIntro'
import BrandMark from './components/brand/BrandMark'

type StartupStage = 'constructing' | 'shrinking' | 'welcome' | 'profiles' | 'app'

export default function App() {
  const activeTab = useStore(state => state.activeTab)
  const ensureAccount = useStore(state => state.ensureAccount)
  const accounts = useStore(state => state.accounts)
  const activeAccountId = useStore(state => state.activeAccountId)
  const onboardingCompleted = useStore(state => state.onboardingCompleted)
  const [particleFocus, setParticleFocus] = useState(false)
  const [startupStage, setStartupStage] = useState<StartupStage>('constructing')
  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    ensureAccount()
  }, [ensureAccount])

  const currentAccount = useMemo(
    () => accounts.find(account => account.id === activeAccountId),
    [accounts, activeAccountId],
  )
  const configured = isAccountConfigured(currentAccount, onboardingCompleted)

  useEffect(() => {
    if (startupStage !== 'shrinking') return
    const timeout = window.setTimeout(() => setStartupStage('welcome'), 780)
    return () => window.clearTimeout(timeout)
  }, [startupStage])

  if (startupStage === 'constructing') {
    return (
      <div className="startup-shell startup-shell-constructing">
        <BrandIntro onComplete={() => setStartupStage(prefersReducedMotion ? 'welcome' : 'shrinking')} />
      </div>
    )
  }

  if (startupStage === 'shrinking' || startupStage === 'welcome') {
    const showingWelcome = startupStage === 'welcome'
    return (
      <div className={`startup-shell ${showingWelcome ? '' : 'startup-shell-constructing'}`}>
        <div
          className={`startup-welcome startup-welcome-grid ${showingWelcome ? '' : 'startup-welcome-grid-transition'}`}
          aria-live={showingWelcome ? 'polite' : undefined}
        >
          <div
            className="startup-mark-slot"
            onAnimationEnd={event => {
              if (!showingWelcome && event.animationName === 'startup-mark-shrink') setStartupStage('welcome')
            }}
          >
            <BrandMark
              size="clamp(168px, 25vw, 260px)"
              className={showingWelcome ? 'startup-complete-mark' : 'startup-shrink-mark'}
            />
          </div>
          <div className="startup-greeting-slot">
            {showingWelcome && <h1 className="startup-greeting">欢迎</h1>}
          </div>
          <div className="startup-action-slot">
            {showingWelcome && (
              <button
                type="button"
                onClick={() => setStartupStage(configured ? 'app' : 'profiles')}
                className="startup-enter-button"
              >
                {configured ? '进入 AlgoAscend' : '登录'}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (startupStage === 'profiles') {
    return (
      <LocalProfilePage
        onBack={() => setStartupStage('welcome')}
        onComplete={() => setStartupStage('welcome')}
      />
    )
  }

  return (
    <div className="flex h-screen overflow-hidden relative isolate bg-canvas transition-colors duration-200">
      <OrbitParticleRing enabled={activeTab === 'chat'} onFocusChange={setParticleFocus} />
      <div className={`relative z-20 flex h-full w-full origin-center transition-all duration-500 ease-out ${particleFocus ? 'pointer-events-none scale-[0.985] opacity-0' : 'scale-100 opacity-100'}`} aria-hidden={particleFocus}>
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <ErrorBoundary fallbackName="页面">
            <PageTransition pageKey={activeTab}>
              <ErrorBoundary fallbackName="智能对话">{activeTab === 'chat' && <ChatPage />}</ErrorBoundary>
              <ErrorBoundary fallbackName="学习仪表盘">{activeTab === 'dashboard' && <DashboardPage />}</ErrorBoundary>
              <ErrorBoundary fallbackName="学习资源生成">{activeTab === 'resources' && <ResourcesPage />}</ErrorBoundary>
              <ErrorBoundary fallbackName="代码宝库">{activeTab === 'vault' && <CodeVaultPage />}</ErrorBoundary>
              <ErrorBoundary fallbackName="学习画像">{activeTab === 'profile' && <ProfilePage />}</ErrorBoundary>
              <ErrorBoundary fallbackName="学习路径">{activeTab === 'path' && <PathPage />}</ErrorBoundary>
              <ErrorBoundary fallbackName="代码编辑器">{activeTab === 'editor' && <CodeEditorPage />}</ErrorBoundary>
              <ErrorBoundary fallbackName="错题本">{activeTab === 'errors' && <ErrorNotebookPage />}</ErrorBoundary>
            </PageTransition>
          </ErrorBoundary>
        </main>
      </div>
      <SettingsModal />
    </div>
  )
}
