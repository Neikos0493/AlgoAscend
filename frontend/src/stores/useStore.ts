import { create } from 'zustand'

// ===== 类型定义 =====

export interface MessageAttachment {
  type: 'mindmap' | 'image' | 'ppt' | 'video' | 'doc' | 'knowledge' | 'knowledge_entry' | 'problems'
  data: any
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  agentType: string
  content: string
  contentType: string
  metadata?: any
  attachments?: MessageAttachment[]
  timestamp: Date
}

export interface Profile {
  knowledge_base: any
  cognitive_style: any
  learning_goals: any
  error_patterns: any
  learning_pace: any
  interests: any
  confidence_score: number
  version: number
}

export interface DashboardStats {
  total_exercises: number
  correct_exercises: number
  accuracy: number
  total_resources: number
  total_paths: number
  total_assessments: number
  resources_by_type: Record<string, number>
}

export interface PathProgress {
  stageId: number
  progress: number  // 0-100
  completedMilestones: string[]
}

export interface AppSettings {
  selectedModelIds: { llm: string; image_gen: string; digital_human: string }
  modelCreds: Record<string, Record<string, string>>  // modelId → { api_key, app_id, ... }
  maxTokens: number
  temperature: number
  maxContextMessages: number
  systemPrompt: string
}

export interface Account {
  id: string
  name: string
  avatar: string
  createdAt: string
}

// ===== 默认值 =====

const DEFAULT_SETTINGS: AppSettings = {
  selectedModelIds: { llm: 'deepseek-v4-flash', image_gen: 'xfyun-tti', digital_human: 'xfyun-digital-human' },
  modelCreds: {},
  maxTokens: 4096,
  temperature: 0.7,
  maxContextMessages: 10,
  systemPrompt: '',
}

const DEFAULT_AVATARS = ['🧑‍💻', '👩‍💻', '🧑‍🎓', '👨‍🔬', '👩‍🏫', '🧑‍🚀', '🦊', '🐱', '🐶', '🐼']

// ===== localStorage 工具函数 =====

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem('algoascend_settings')
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS }
}

function saveSettings(s: AppSettings) {
  try { localStorage.setItem('algoascend_settings', JSON.stringify(s)) } catch { /* ignore */ }
}

function loadAccounts(): Account[] {
  try {
    const raw = localStorage.getItem('algoascend_accounts')
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveAccounts(accounts: Account[]) {
  try { localStorage.setItem('algoascend_accounts', JSON.stringify(accounts)) } catch { /* ignore */ }
}

function loadActiveAccountId(): string | null {
  try { return localStorage.getItem('algoascend_active_account_id') } catch { return null }
}

function saveActiveAccountId(id: string) {
  try { localStorage.setItem('algoascend_active_account_id', id) } catch { /* ignore */ }
}

// 按账号隔离的持久化
function storageKey(accountId: string, suffix: string) {
  return `algoascend_${suffix}_${accountId}`
}

function loadAccountData<T>(accountId: string, suffix: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(storageKey(accountId, suffix))
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return fallback
}

function saveAccountData(accountId: string, suffix: string, data: any) {
  try {
    if (data !== null && data !== undefined) {
      localStorage.setItem(storageKey(accountId, suffix), JSON.stringify(data))
    } else {
      localStorage.removeItem(storageKey(accountId, suffix))
    }
  } catch { /* ignore */ }
}

function removeAccountData(accountId: string) {
  const suffixes = ['profile', 'stats', 'messages', 'path']
  suffixes.forEach(s => {
    try { localStorage.removeItem(storageKey(accountId, s)) } catch { /* ignore */ }
  })
}

// ===== Zustand Store =====

interface AppState {
  // 账号系统
  accounts: Account[]
  activeAccountId: string | null
  ensureAccount: () => void
  createAccount: (name: string, avatar: string) => void
  switchAccount: (id: string) => void
  deleteAccount: (id: string) => void
  renameAccount: (id: string, name: string) => void

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

  // 学习路径
  pathProgress: PathProgress[]

  // 自动分析
  isAnalyzing: boolean
  lastAnalyzedMessageCount: number

  // 侧边栏
  sidebarOpen: boolean
  activeTab: 'chat' | 'dashboard' | 'resources' | 'vault' | 'profile' | 'path' | 'editor' | 'errors'
  pendingEditorMessage: string | null
  setPendingEditorMessage: (msg: string | null) => void
  pendingProblem: any | null
  setPendingProblem: (p: any | null) => void

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
  setPathProgress: (progress: PathProgress[]) => void
  setAnalyzing: (val: boolean) => void
  setLastAnalyzedMessageCount: (n: number) => void
  toggleSidebar: () => void
  setActiveTab: (tab: 'chat' | 'dashboard' | 'resources' | 'vault' | 'profile' | 'path' | 'editor' | 'errors') => void
  clearMessages: () => void
  resetAll: () => void
  addAttachment: (attachment: MessageAttachment) => void
}

let msgId = 0
const nextId = () => `msg_${++msgId}_${Date.now()}`

// 初始化账号系统
function initAccounts(): { accounts: Account[]; activeId: string | null } {
  const accounts = loadAccounts()
  let activeId = loadActiveAccountId()

  // 如果没有账号，自动创建默认账号
  if (accounts.length === 0) {
    const defaultAccount: Account = {
      id: 'default_' + Date.now(),
      name: '默认用户',
      avatar: DEFAULT_AVATARS[0],
      createdAt: new Date().toISOString(),
    }
    accounts.push(defaultAccount)
    saveAccounts(accounts)
    activeId = defaultAccount.id
    saveActiveAccountId(activeId)
  }

  // 如果 activeId 不存在，使用第一个
  if (activeId && !accounts.find(a => a.id === activeId)) {
    activeId = accounts[0].id
    saveActiveAccountId(activeId)
  }
  if (!activeId) {
    activeId = accounts[0].id
    saveActiveAccountId(activeId)
  }

  return { accounts, activeId }
}

const init = initAccounts()

function loadMessagesForAccount(accountId: string): Message[] {
  const raw = loadAccountData<Message[]>(accountId, 'messages', [])
  return raw.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
}

function saveMessagesForAccount(accountId: string, messages: Message[]) {
  saveAccountData(accountId, 'messages', messages.slice(-100))  // 只保留最近100条
}

function loadProfileForAccount(accountId: string): { profile: Profile | null; dimensionsFilled: number } {
  return loadAccountData(accountId, 'profile', { profile: null, dimensionsFilled: 0 })
}

function saveProfileForAccount(accountId: string, profile: Profile | null, dimensionsFilled: number) {
  saveAccountData(accountId, 'profile', { profile, dimensionsFilled })
}

function loadStatsForAccount(accountId: string): DashboardStats | null {
  return loadAccountData<DashboardStats | null>(accountId, 'stats', null)
}

function saveStatsForAccount(accountId: string, stats: DashboardStats | null) {
  saveAccountData(accountId, 'stats', stats)
}

function loadPathForAccount(accountId: string): PathProgress[] {
  return loadAccountData<PathProgress[]>(accountId, 'path', [])
}

function savePathForAccount(accountId: string, progress: PathProgress[]) {
  saveAccountData(accountId, 'path', progress)
}

export const useStore = create<AppState>((set, get) => ({
  // 账号系统
  accounts: init.accounts,
  activeAccountId: init.activeId,

  ensureAccount: () => {
    let { accounts, activeAccountId } = get()
    if (accounts.length === 0) {
      const defaultAccount: Account = {
        id: 'default_' + Date.now(),
        name: '默认用户',
        avatar: DEFAULT_AVATARS[0],
        createdAt: new Date().toISOString(),
      }
      accounts = [defaultAccount]
      activeAccountId = defaultAccount.id
      saveAccounts(accounts)
      saveActiveAccountId(activeAccountId)
      set({ accounts, activeAccountId })
    }
  },

  createAccount: (name, avatar) => {
    const accounts = [...get().accounts]
    const newAccount: Account = {
      id: 'acc_' + Date.now(),
      name: name.trim() || '新用户',
      avatar: avatar || DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)],
      createdAt: new Date().toISOString(),
    }
    accounts.push(newAccount)
    saveAccounts(accounts)
    // 切换到新账号
    get().switchAccount(newAccount.id)
  },

  switchAccount: (id) => {
    const account = get().accounts.find(a => a.id === id)
    if (!account) return

    saveActiveAccountId(id)

    // 保存当前账号数据
    const prevId = get().activeAccountId
    if (prevId && prevId !== id) {
      saveMessagesForAccount(prevId, get().messages)
      saveProfileForAccount(prevId, get().profile, get().dimensionsFilled)
      saveStatsForAccount(prevId, get().stats)
      savePathForAccount(prevId, get().pathProgress)
    }

    // 加载新账号数据
    const messages = loadMessagesForAccount(id)
    const profileData = loadProfileForAccount(id)
    const stats = loadStatsForAccount(id)
    const pathProgress = loadPathForAccount(id)

    set({
      activeAccountId: id,
      messages,
      profile: profileData.profile,
      dimensionsFilled: profileData.dimensionsFilled,
      stats,
      pathProgress,
      currentStreaming: '',
      isStreaming: false,
      currentAgent: '',
      lastAnalyzedMessageCount: 0,
    })
  },

  deleteAccount: (id) => {
    const { accounts, activeAccountId } = get()
    if (accounts.length <= 1) return  // 至少保留一个账号

    const newAccounts = accounts.filter(a => a.id !== id)
    saveAccounts(newAccounts)
    removeAccountData(id)

    let newActiveId = activeAccountId
    if (activeAccountId === id) {
      newActiveId = newAccounts[0].id
      saveActiveAccountId(newActiveId)
      // 切换到第一个账号
      const profileData = loadProfileForAccount(newActiveId)
      set({
        accounts: newAccounts,
        activeAccountId: newActiveId,
        messages: loadMessagesForAccount(newActiveId),
        profile: profileData.profile,
        dimensionsFilled: profileData.dimensionsFilled,
        stats: loadStatsForAccount(newActiveId),
        pathProgress: loadPathForAccount(newActiveId),
        currentStreaming: '',
        isStreaming: false,
        currentAgent: '',
      })
    } else {
      set({ accounts: newAccounts })
    }
  },

  renameAccount: (id, name) => {
    const accounts = get().accounts.map(a =>
      a.id === id ? { ...a, name: name.trim() || a.name } : a
    )
    saveAccounts(accounts)
    set({ accounts })
  },

  // 对话
  messages: init.activeId ? loadMessagesForAccount(init.activeId) : [],
  isStreaming: false,
  currentStreaming: '',
  currentAgent: '',

  // 画像
  profile: init.activeId ? loadProfileForAccount(init.activeId).profile : null,
  dimensionsFilled: init.activeId ? loadProfileForAccount(init.activeId).dimensionsFilled : 0,

  // 仪表盘
  stats: init.activeId ? loadStatsForAccount(init.activeId) : null,

  // 学习路径
  pathProgress: init.activeId ? loadPathForAccount(init.activeId) : [],

  // 自动分析
  isAnalyzing: false,
  lastAnalyzedMessageCount: 0,

  // 侧边栏
  sidebarOpen: false,
  activeTab: 'chat',
  pendingEditorMessage: null,
  setPendingEditorMessage: (msg) => set({ pendingEditorMessage: msg }),
  pendingProblem: null,
  setPendingProblem: (p) => set({ pendingProblem: p }),

  // 设置
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

  // 操作
  addMessage: (msg) => {
    set((s) => {
      const newMessages = [...s.messages, { ...msg, id: msg.id || nextId() }]
      // 延迟保存到 localStorage（避免阻塞 UI）
      const accountId = s.activeAccountId
      if (accountId) {
        setTimeout(() => saveMessagesForAccount(accountId, newMessages), 100)
      }
      return { messages: newMessages }
    })
  },

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
    const id = get().activeAccountId
    if (id) saveProfileForAccount(id, profile, get().dimensionsFilled)
  },

  setDimensionsFilled: (n) => {
    set({ dimensionsFilled: n })
    const id = get().activeAccountId
    if (id) saveProfileForAccount(id, get().profile, n)
  },

  setStats: (stats) => {
    set({ stats })
    const id = get().activeAccountId
    if (id) saveStatsForAccount(id, stats)
  },

  setPathProgress: (progress) => {
    set({ pathProgress: progress })
    const id = get().activeAccountId
    if (id) savePathForAccount(id, progress)
  },

  setAnalyzing: (val) => set({ isAnalyzing: val }),
  setLastAnalyzedMessageCount: (n) => set({ lastAnalyzedMessageCount: n }),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setActiveTab: (tab) => set({ activeTab: tab, sidebarOpen: false }),

  clearMessages: () => {
    set({ messages: [], currentStreaming: '', lastAnalyzedMessageCount: 0 })
    const id = get().activeAccountId
    if (id) saveMessagesForAccount(id, [])
  },

  resetAll: () => {
    const id = get().activeAccountId
    if (id) {
      removeAccountData(id)
    }
    set({
      messages: [], currentStreaming: '', isStreaming: false,
      profile: null, dimensionsFilled: 0, stats: null, pathProgress: [],
      lastAnalyzedMessageCount: 0,
    })
  },

  addAttachment: (attachment) => {
    const msgs = get().messages
    if (msgs.length === 0) return
    const last = { ...msgs[msgs.length - 1] }
    if (last.role !== 'assistant') return
    last.attachments = [...(last.attachments || []), attachment]
    set({ messages: [...msgs.slice(0, -1), last] })
  }
}))
