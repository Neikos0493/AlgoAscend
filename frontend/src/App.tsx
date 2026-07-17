import { useEffect } from 'react'
import { useStore } from './stores/useStore'
import { fetchDashboard, fetchProfile } from './services/api'
import Sidebar from './components/Sidebar'
import OrbitParticleRing from './components/OrbitParticleRing'
import PageTransition from './components/PageTransition'
import ChatPage from './pages/ChatPage'
import DashboardPage from './pages/DashboardPage'
import ResourcesPage from './pages/ResourcesPage'
import ProfilePage from './pages/ProfilePage'
import PathPage from './pages/PathPage'

export default function App() {
  const { activeTab, setProfile, setDimensionsFilled, setStats } = useStore()

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      const [profileData, dashData] = await Promise.all([
        fetchProfile(1),
        fetchDashboard(1),
      ])
      if (profileData.profile) {
        setProfile(profileData.profile)
        setDimensionsFilled(profileData.dimensions_filled || 0)
      }
      if (dashData.stats) setStats(dashData.stats)
    } catch (err) {
      console.log('初始数据加载中...', err)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden relative bg-[#0a0a14]">
      {/* Canvas 粒子在深色背景之上、内容之下 */}
      <OrbitParticleRing />

      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden relative z-20">
        <PageTransition pageKey={activeTab}>
          {activeTab === 'chat'      && <ChatPage />}
          {activeTab === 'dashboard' && <DashboardPage />}
          {activeTab === 'resources' && <ResourcesPage />}
          {activeTab === 'profile'   && <ProfilePage />}
          {activeTab === 'path'      && <PathPage />}
        </PageTransition>
      </main>
    </div>
  )
}
