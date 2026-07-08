import { create } from 'zustand'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  agentType: string
  content: string
  contentType: string
  metadata?: any
  timestamp: Date
}

interface Profile {
  knowledge_base: any
  cognitive_style: any
  learning_goals: any
  error_patterns: any
  learning_pace: any
  interests: any
  confidence_score: number
  version: number
}

interface DashboardStats {
  total_exercises: number
  correct_exercises: number
  accuracy: number
  total_resources: number
  total_paths: number
  total_assessments: number
  resources_by_type: Record<string, number>
}

interface AppState {
  // 对话
  messages: Message[]
  isStreaming: boolean
  currentStreaming: string
  currentAgent: string

  // 画像
  profile: Profile | null
  dimensionsFilled: number

  // 仪表盘
  stats: DashboardStats | null

  // 侧边栏
  sidebarOpen: boolean
  activeTab: 'chat' | 'dashboard' | 'resources' | 'profile'

  // 操作
  addMessage: (msg: Message) => void
  setStreaming: (val: boolean) => void
  appendToStream: (content: string) => void
  clearStream: () => void
  setCurrentAgent: (agent: string) => void
  setProfile: (profile: Profile) => void
  setDimensionsFilled: (n: number) => void
  setStats: (stats: DashboardStats) => void
  toggleSidebar: () => void
  setActiveTab: (tab: 'chat' | 'dashboard' | 'resources' | 'profile') => void
  clearMessages: () => void
}

let msgId = 0
const nextId = () => `msg_${++msgId}_${Date.now()}`

export const useStore = create<AppState>((set, get) => ({
  messages: [],
  isStreaming: false,
  currentStreaming: '',
  currentAgent: '',
  profile: null,
  dimensionsFilled: 0,
  stats: null,
  sidebarOpen: false,
  activeTab: 'chat',

  addMessage: (msg) => set((s) => ({
    messages: [...s.messages, { ...msg, id: msg.id || nextId() }],
  })),

  setStreaming: (val) => set({ isStreaming: val }),

  appendToStream: (content) => set((s) => ({
    currentStreaming: s.currentStreaming + content,
  })),

  clearStream: () => {
    const content = get().currentStreaming
    const agent = get().currentAgent
    if (content) {
      get().addMessage({
        id: nextId(),
        role: 'assistant',
        agentType: agent,
        content,
        contentType: 'markdown',
        timestamp: new Date(),
      })
    }
    set({ currentStreaming: '', isStreaming: false, currentAgent: '' })
  },

  setCurrentAgent: (agent) => set({ currentAgent: agent }),

  setProfile: (profile) => set({ profile }),
  setDimensionsFilled: (n) => set({ dimensionsFilled: n }),
  setStats: (stats) => set({ stats }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setActiveTab: (tab) => set({ activeTab: tab, sidebarOpen: false }),
  clearMessages: () => set({ messages: [], currentStreaming: '' }),
}))
