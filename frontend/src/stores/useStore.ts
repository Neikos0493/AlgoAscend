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

// 设置类型
export interface AppSettings {
  apiKey: string
  maxTokens: number
  temperature: number
  maxContextMessages: number
  systemPrompt: string
}

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  maxTokens: 4096,
  temperature: 0.7,
  maxContextMessages: 10,
  systemPrompt: '',
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem('algoascend_settings')
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS }
}

function saveSettings(s: AppSettings) {
  try {
    localStorage.setItem('algoascend_settings', JSON.stringify(s))
  } catch { /* ignore */ }
}

// ===== localStorage 持久化 — profile & stats 本地存档 =====
const STORAGE_PROFILE = 'algoascend_profile'
const STORAGE_STATS = 'algoascend_stats'

function loadPersistedProfile(): { profile: Profile | null; dimensionsFilled: number } {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILE)
    if (raw) {
      const data = JSON.parse(raw)
      return { profile: data.profile || null, dimensionsFilled: data.dimensionsFilled || 0 }
    }
  } catch { /* ignore */ }
  return { profile: null, dimensionsFilled: 0 }
}

function savePersistedProfile(profile: Profile | null, dimensionsFilled: number) {
  try {
    localStorage.setItem(STORAGE_PROFILE, JSON.stringify({ profile, dimensionsFilled }))
  } catch { /* ignore */ }
}

function loadPersistedStats(): DashboardStats | null {
  try {
    const raw = localStorage.getItem(STORAGE_STATS)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return null
}

function savePersistedStats(stats: DashboardStats | null) {
  try {
    if (stats) {
      localStorage.setItem(STORAGE_STATS, JSON.stringify(stats))
    } else {
      localStorage.removeItem(STORAGE_STATS)
    }
  } catch { /* ignore */ }
}

function clearPersistedData() {
  try {
    localStorage.removeItem(STORAGE_PROFILE)
    localStorage.removeItem(STORAGE_STATS)
  } catch { /* ignore */ }
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
  activeTab: 'chat' | 'dashboard' | 'resources' | 'profile' | 'path'

  // 模型选择
  selectedModel: string
  setSelectedModel: (model: string) => void

  // 设置
  settings: AppSettings
  settingsOpen: boolean
  setSettings: (s: Partial<AppSettings>) => void
  resetSettings: () => void
  setSettingsOpen: (open: boolean) => void

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
  setActiveTab: (tab: 'chat' | 'dashboard' | 'resources' | 'profile' | 'path') => void
  clearMessages: () => void
  resetAll: () => void
}

let msgId = 0
const nextId = () => `msg_${++msgId}_${Date.now()}`

export const useStore = create<AppState>((set, get) => ({
  messages: [],
  isStreaming: false,
  currentStreaming: '',
  currentAgent: '',
  profile: loadPersistedProfile().profile,
  dimensionsFilled: loadPersistedProfile().dimensionsFilled,
  stats: loadPersistedStats(),
  sidebarOpen: false,
  activeTab: 'chat',

  selectedModel: 'deepseek-v4-flash',
  setSelectedModel: (model) => set({ selectedModel: model }),

  settings: loadSettings(),
  settingsOpen: false,
  setSettings: (partial) => {
    const current = get().settings
    const next = { ...current, ...partial }
    saveSettings(next)
    set({ settings: next })
  },
  resetSettings: () => {
    saveSettings(DEFAULT_SETTINGS)
    set({ settings: { ...DEFAULT_SETTINGS } })
  },
  setSettingsOpen: (open) => set({ settingsOpen: open }),

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

  setProfile: (profile) => {
    set({ profile })
    savePersistedProfile(profile, get().dimensionsFilled)
  },
  setDimensionsFilled: (n) => {
    set({ dimensionsFilled: n })
    savePersistedProfile(get().profile, n)
  },
  setStats: (stats) => {
    set({ stats })
    savePersistedStats(stats)
  },
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setActiveTab: (tab) => set({ activeTab: tab, sidebarOpen: false }),
  clearMessages: () => set({ messages: [], currentStreaming: '' }),
  resetAll: () => {
    clearPersistedData()
    set({
      messages: [], currentStreaming: '', isStreaming: false,
      profile: null, dimensionsFilled: 0, stats: null,
    })
  }
}))
