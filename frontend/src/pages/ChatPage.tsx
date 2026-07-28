import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '../stores/useStore'
import { sendMessage, clearHistory, PROVIDERS, getProviderForModel, getAllModels, analyzeConversation, AnalysisResult, sendMessageWithTools, DEFAULT_SYSTEM_PROMPT, MODEL_REGISTRY, getModelsByCategory, getModelEntry } from '../services/api'
import { searchKnowledge, searchProblems, buildEnhancedSystemPrompt } from '../services/knowledgeService'
import ChatMessage from '../components/ChatMessage'
import QuickActions from '../components/QuickActions'
import AgentPipeline from '../components/AgentPipeline'
import { AppIcon } from '../components/Icon'
import { ImagePlus, X } from 'lucide-react'

interface PipelineData {
  agents: { key: string; name: string; icon: string }[]
  tasks: { name: string; agent_key: string }[]
}

export default function ChatPage() {
  const {
    messages, isStreaming, currentStreaming, currentAgent,
    addMessage, setStreaming, appendToStream, clearStream, setCurrentAgent,
    clearMessages, setProfile, setDimensionsFilled, setStats, setPathProgress, addAttachment,
    settings, setSettings,
    settingsOpen, setSettingsOpen,
    profile, stats, pathProgress,
    isAnalyzing, setAnalyzing, lastAnalyzedMessageCount, setLastAnalyzedMessageCount,
    pendingEditorMessage, setPendingEditorMessage,
  } = useStore()

  const [input, setInput] = useState('')

  // 接收来自代码编辑器的消息
  useEffect(() => {
    if (pendingEditorMessage) {
      setInput(pendingEditorMessage)
      setPendingEditorMessage(null)
      inputRef.current?.focus()
    }
  }, [pendingEditorMessage])
  const [attachedImages, setAttachedImages] = useState<{ base64: string; mimeType: string; name: string }[]>([])
  const [pipeline, setPipeline] = useState<PipelineData | null>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [analysisBanner, setAnalysisBanner] = useState<string | null>(null)
  const [toolStatus, setToolStatus] = useState<{ name: string; label: string } | null>(null)
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const modelDropdownRef = useRef<HTMLDivElement>(null)
  const modelBtnRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isUserScrollingRef = useRef(false)

  // 模型选择 - 从新版设置读取
  const selectedModel = settings.selectedModelIds?.llm || 'deepseek-v4-flash'
  const selectedModelEntry = getModelEntry(selectedModel)
  const llmModels = getModelsByCategory('llm')
  const multimodalEnabled = selectedModelEntry?.multimodal || false
  const currentProvider = getProviderForModel(selectedModel)
  const currentModel = getAllModels().find(m => m.model.id === selectedModel)

  // 点击外部关闭下拉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!isUserScrollingRef.current) {
      scrollToBottom()
    }
  }, [messages, currentStreaming, pipeline])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setShowScrollBtn(false)
  }

  const handleScroll = () => {
    const el = messagesContainerRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distFromBottom > 150) {
      isUserScrollingRef.current = true
      setShowScrollBtn(true)
    } else {
      isUserScrollingRef.current = false
      setShowScrollBtn(false)
    }
  }

  // ===== 自动分析引擎 =====
  const runAutoAnalysis = useCallback(async () => {
    const state = useStore.getState()
    if (state.isAnalyzing || state.isStreaming) return

    // 至少要有2条用户消息才分析
    const userMessages = state.messages.filter(m => m.role === 'user')
    if (userMessages.length < 2) return

    // 如果消息数没变，不重复分析
    const totalMsgs = state.messages.filter(m => m.role === 'user' || m.role === 'assistant').length
    if (totalMsgs <= state.lastAnalyzedMessageCount) return

    setAnalyzing(true)
    setAnalysisBanner(null)

    try {
      const history = state.messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      const result = await analyzeConversation(history)
      if (!result) { setAnalyzing(false); return }

      applyAnalysisResult(result)
      setLastAnalyzedMessageCount(totalMsgs)

      if (result.summary) {
        setAnalysisBanner(result.summary)
        setTimeout(() => setAnalysisBanner(null), 5000)
      }
    } catch (err: any) {
      console.log('[自动分析] 失败:', err.message)
      setAnalysisBanner('分析引擎调用失败，请检查 API Key 和网络连接')
      setTimeout(() => setAnalysisBanner(null), 6000)
    } finally {
      setAnalyzing(false)
    }
  }, [setAnalyzing, setLastAnalyzedMessageCount])

  // 应用分析结果
  const applyAnalysisResult = (result: AnalysisResult) => {
    const state = useStore.getState()

    // 1. 更新画像
    if (result.profile_updates) {
      const currentProfile = state.profile || {
        knowledge_base: {}, cognitive_style: {}, learning_goals: {},
        error_patterns: { common_errors: [], weak_areas: [] },
        learning_pace: {}, interests: {},
        confidence_score: 0, version: 1,
      }

      // 深度合并画像数据
      const merged = { ...currentProfile }
      const pu = result.profile_updates

      if (pu.knowledge_base) merged.knowledge_base = { ...merged.knowledge_base, ...pu.knowledge_base }
      if (pu.cognitive_style) merged.cognitive_style = { ...merged.cognitive_style, ...pu.cognitive_style }
      if (pu.learning_goals) merged.learning_goals = { ...merged.learning_goals, ...pu.learning_goals }
      if (pu.error_patterns) {
        merged.error_patterns = {
          common_errors: [...new Set([...(merged.error_patterns?.common_errors || []), ...(pu.error_patterns.common_errors || [])])],
          weak_areas: [...new Set([...(merged.error_patterns?.weak_areas || []), ...(pu.error_patterns.weak_areas || [])])],
        }
      }
      if (pu.learning_pace) merged.learning_pace = { ...merged.learning_pace, ...pu.learning_pace }
      if (pu.interests) {
        merged.interests = {
          ...merged.interests,
          ...pu.interests,
          favorite_topics: [...new Set([...(merged.interests?.favorite_topics || []), ...(pu.interests.favorite_topics || [])])],
        }
      }
      if (pu.confidence_score !== undefined) merged.confidence_score = pu.confidence_score
      merged.version = (currentProfile?.version || 0) + 1

      // 计算已填充维度数
      let filled = 0
      const checkFilled = (obj: any) => obj && typeof obj === 'object' && Object.values(obj).some(v => v)
      if (checkFilled(merged.knowledge_base)) filled++
      if (checkFilled(merged.cognitive_style)) filled++
      if (checkFilled(merged.learning_goals)) filled++
      if (checkFilled(merged.error_patterns)) filled++
      if (checkFilled(merged.learning_pace)) filled++
      if (checkFilled(merged.interests)) filled++

      setProfile(merged)
      setDimensionsFilled(Math.max(state.dimensionsFilled, filled))
    }

    // 2. 更新仪表盘
    if (result.dashboard_updates) {
      const du = result.dashboard_updates
      const currentStats = state.stats || {
        total_exercises: 0, correct_exercises: 0, accuracy: 0,
        total_resources: 0, total_paths: 0, total_assessments: 0,
        resources_by_type: {},
      }

      const newStats = { ...currentStats }
      if (du.exercises_mentioned) newStats.total_exercises += du.exercises_mentioned
      if (du.exercises_mentioned && du.exercises_mentioned > 0) {
        // 假设提到的练习中有80%正确率
        const newCorrect = Math.round(du.exercises_mentioned * 0.8)
        newStats.correct_exercises = (newStats.correct_exercises || 0) + newCorrect
        if (newStats.total_exercises > 0) {
          newStats.accuracy = (newStats.correct_exercises / newStats.total_exercises) * 100
        }
      }
      if (du.resources_generated) newStats.total_resources += du.resources_generated
      if (du.paths_created) newStats.total_paths += du.paths_created
      if (du.assessments_conducted) newStats.total_assessments += du.assessments_conducted
      if (du.resources_by_type) {
        for (const [type, count] of Object.entries(du.resources_by_type)) {
          newStats.resources_by_type[type] = (newStats.resources_by_type[type] || 0) + count
        }
      }

      setStats(newStats)
    }

    // 3. 更新学习路径
    if (result.path_updates?.stage_progress) {
      const currentPath = state.pathProgress || []
      const pathMap = new Map(currentPath.map(p => [p.stageId, p]))

      for (const update of result.path_updates.stage_progress) {
        const existing = pathMap.get(update.stageId)
        if (existing) {
          existing.progress = Math.max(existing.progress, update.progress || 0)
          if (update.completedMilestones) {
            existing.completedMilestones = [...new Set([
              ...existing.completedMilestones,
              ...update.completedMilestones,
            ])]
          }
        } else {
          pathMap.set(update.stageId, {
            stageId: update.stageId,
            progress: update.progress || 0,
            completedMilestones: update.completedMilestones || [],
          })
        }
      }

      setPathProgress(Array.from(pathMap.values()))
    }
  }

  // 对话完成后触发分析
  const onConversationDone = useCallback(() => {
    // 延迟启动分析，避免干扰 UI
    setTimeout(() => runAutoAnalysis(), 1500)
  }, [runAutoAnalysis])

  const handleSend = async (text?: string) => {
    const msg = text || input.trim()
    if ((!msg && attachedImages.length === 0) || isStreaming) return

    const images = [...attachedImages]
    setInput('')
    setAttachedImages([])
    setPipeline(null)
    isUserScrollingRef.current = false

    // 构建消息内容（带图片时附加图片描述）
    const displayContent = images.length > 0
      ? (msg || '请分析这张图片') + (images.length > 1 ? ` [附带${images.length}张图片]` : '')
      : msg

    addMessage({
      id: '', role: 'user', agentType: '', content: displayContent,
      contentType: 'text', timestamp: new Date(),
      attachments: images.length > 0 ? images.map(img => ({ type: 'image' as const, data: { base64: img.base64, name: img.name } })) : undefined,
    })

    setStreaming(true)
    setCurrentAgent('')
    const pipelineRef = (window as any).__agentPipeline

    // === 搜索知识库 + 牛客题库 ===
    setAnalyzing(true)
    let enhancedPrompt: string
    const basePrompt = useStore.getState().settings.systemPrompt || DEFAULT_SYSTEM_PROMPT
    try {
      const [kbResults, probResults] = await Promise.all([
        searchKnowledge(msg, 3),
        searchProblems(msg, 3),
      ])
      if (kbResults.length > 0 || probResults.length > 0) {
        enhancedPrompt = buildEnhancedSystemPrompt(basePrompt, kbResults, probResults)
        console.log('[知识库] 搜索完成:', kbResults.length + probResults.length, '条结果')
      } else {
        enhancedPrompt = basePrompt
      }
    } catch (err) {
      console.log('[知识库] 搜索失败，继续正常对话:', err)
      enhancedPrompt = basePrompt
    }
    setAnalyzing(false)

    const history = useStore.getState().messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    // 工具调用回调
    const toolHandlers = {
      onToolStart: (toolName: string, args: any) => {
        const labels: Record<string, string> = {
          generate_mindmap: `正在生成思维导图: ${args.topic || ''}`,
          generate_image: `正在生成图片: ${args.prompt?.slice(0, 30) || ''}`,
          generate_ppt: `正在生成 PPT: ${args.topic || ''}`,
          generate_video: `正在生成算法动画: ${args.topic || ''}`,
          search_knowledge: `正在搜索知识库: ${args.query || ''}`,
          get_knowledge_entry: `正在读取知识库全文: ${args.title || ''}`,
          search_problems: `正在搜索题库: ${args.query || ''}`,
        }
        setToolStatus({ name: toolName, label: labels[toolName] || `正在执行: ${toolName}` })
      },
      onToolDone: (toolName: string, result: any) => {
        setToolStatus(null)
        // 资源工具：附加到消息展示
        if (result.success && result.type) {
          const attType = result.type as 'mindmap' | 'image' | 'ppt' | 'video' | 'doc' | 'knowledge' | 'knowledge_entry' | 'problems'
          addAttachment({ type: attType, data: result })
        }
      },
    }

    await sendMessageWithTools(msg, 1,
      (chunk) => {
        switch (chunk.type) {
          case 'pipeline': setPipeline({ agents: chunk.agents, tasks: chunk.tasks }); break
          case 'agent_start': setCurrentAgent(chunk.agent_key); pipelineRef?.onAgentStart?.(chunk.agent_key); break
          case 'agent_thinking': pipelineRef?.onAgentThinking?.(chunk.agent_key, chunk.content); break
          case 'agent_done': pipelineRef?.onAgentDone?.(chunk.agent_key); break
          case 'agent_handoff': pipelineRef?.onHandoff?.(chunk.from_key, chunk.to_key); break
          case 'heartbeat': break
          case 'text': if (chunk.agent) setCurrentAgent(chunk.agent); appendToStream(chunk.content); break
          case 'status': setCurrentAgent(chunk.agent || ''); break
          case 'tool_results': break
        }
      },
      () => { clearStream(); pipelineRef?.reset?.(); onConversationDone() },
      (error) => { setToolStatus(null); appendToStream(`\n\n> ⚠️ 出错了: ${error}`); clearStream(); pipelineRef?.reset?.() },
      selectedModel, history, enhancedPrompt,
      toolHandlers,
      images.length > 0 ? images : undefined,
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // ===== 图片上传/粘贴 =====
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    if (file.size > 10 * 1024 * 1024) { alert('图片不能超过10MB'); return }
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      setAttachedImages(prev => [...prev, { base64, mimeType: file.type, name: file.name }])
    }
    reader.readAsDataURL(file)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) { for (let i = 0; i < Math.min(files.length, 5); i++) processImageFile(files[i]) }
    e.target.value = ''
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault()
        const file = items[i].getAsFile()
        if (file) processImageFile(file)
      }
    }
  }

  const handleClear = async () => { try { await clearHistory(1); clearMessages() } catch { /* ignore */ } }

  // 自动分析状态横幅

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-6 py-3 bg-surface-100/80 backdrop-blur-xl border-b border-gray-700/30 shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <button className="lg:hidden text-gray-400 hover:text-gray-200" onClick={() => useStore.getState().toggleSidebar()}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div>
            <h2 className="text-lg font-semibold text-white">智能对话</h2>
            <p className="text-xs text-gray-400">{currentAgent ? `当前智能体: ${currentAgent}` : '多智能体协同工作中'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSettingsOpen(true)} className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-white/[0.05] rounded-lg transition-colors" title="设置">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
          {/* 模型选择器 — 基于三大分类注册表 */}
          <div ref={modelDropdownRef}>
            <button
              ref={modelBtnRef}
              onClick={() => {
                if (!modelDropdownOpen && modelBtnRef.current) {
                  const r = modelBtnRef.current.getBoundingClientRect()
                  setDropdownPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
                }
                setModelDropdownOpen(!modelDropdownOpen)
              }}
              disabled={isStreaming}
              className="flex items-center gap-1.5 bg-surface-300/50 border border-gray-600/50 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-200 hover:border-primary-500/50 transition-colors disabled:opacity-50"
            >
              <AppIcon name={selectedModelEntry?.multimodal ? '🖼️' : '💬'} size={14} />
              <span>{selectedModelEntry?.name || selectedModel}</span>
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {modelDropdownOpen && (
              <div
                className="fixed bg-surface-200 border border-gray-600/50 rounded-xl shadow-2xl shadow-black/40 overflow-hidden max-h-[60vh] overflow-y-auto"
                style={{ top: dropdownPos.top, right: dropdownPos.right, width: 280, zIndex: 9999 }}
              >
                {/* 仅展示 LLM 文字模型 */}
                <div className="flex items-center gap-1.5 px-3 py-2 text-[10px] text-gray-500 border-b border-gray-700/30">
                  <AppIcon name="💬" size={11} /> LLM 文字模型（其它模型在设置中配置）
                </div>
                {llmModels.map(m => {
                  const creds = settings.modelCreds?.[m.id] || {}
                  const hasCreds = !!creds.api_key
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSettings({ selectedModelIds: { ...settings.selectedModelIds, llm: m.id } })
                        setModelDropdownOpen(false)
                      }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                        selectedModel === m.id
                          ? 'bg-primary-500/15 text-primary-300'
                          : hasCreds ? 'text-gray-300 hover:bg-white/[0.03]' : 'text-gray-600'
                      }`}
                    >
                      <AppIcon name={m.multimodal ? '🖼️' : '💬'} size={14} className="shrink-0" />
                      <div className="flex-1">
                        <div className={`${selectedModel === m.id ? 'font-medium' : ''}`}>{m.name}</div>
                        <div className="text-[10px] opacity-60">{m.description}</div>
                      </div>
                      {!hasCreds && (
                        <span
                          onClick={(e) => { e.stopPropagation(); setModelDropdownOpen(false); setSettingsOpen(true) }}
                          className="text-[10px] text-primary-400 hover:text-primary-300 cursor-pointer underline shrink-0"
                        >去配置</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          {isStreaming && (
            <span className="flex items-center gap-1 text-xs text-primary-400 animate-pulse-soft">
              <span className="w-2 h-2 bg-primary-400 rounded-full shadow-glow-sm" />生成中...
            </span>
          )}
          {isAnalyzing && (
            <span className="flex items-center gap-1 text-xs text-amber-400 animate-pulse-soft">
              <span className="w-2 h-2 bg-amber-400 rounded-full" />分析对话...
            </span>
          )}
          <button onClick={handleClear} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">清空对话</button>
        </div>
      </header>

      {/* 自动分析结果横幅 */}
      {analysisBanner && (
        <div className="mx-4 mt-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2 animate-slide-up">
          <AppIcon name="🧠" size={15} className="text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300 flex-1">{analysisBanner}</p>
          <button onClick={() => setAnalysisBanner(null)} className="text-amber-400 hover:text-amber-200"><X size={13} /></button>
        </div>
      )}

      <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-6 relative">
        {messages.length === 0 && !isStreaming && (<WelcomeGuide onSend={handleSend} />)}
        <div className="max-w-4xl mx-auto space-y-4">
          <AgentPipeline pipeline={pipeline} />
          {messages.map((msg) => (<ChatMessage key={msg.id} message={msg} />))}
          {isStreaming && currentStreaming && (
            <div className="flex gap-3 message-enter">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-sm shrink-0 shadow-glow-sm">
                <AppIcon name={currentAgent ? '🤖' : '💬'} size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-200">{currentAgent || 'AI助手'}</span>
                  <span className="text-xs text-primary-400 animate-pulse-soft">正在生成...</span>
                </div>
                <div className="bg-surface-50/60 backdrop-blur rounded-xl px-5 py-4 border border-gray-700/30">
                  <div className="markdown-body streaming-cursor"><MarkdownContent content={currentStreaming} /></div>
                </div>
              </div>
            </div>
          )}
          {/* 工具执行状态 */}
          {toolStatus && (
            <div className="flex gap-3 message-enter">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-500 to-amber-500 flex items-center justify-center text-white text-sm shrink-0 shadow-glow-sm">
                <AppIcon name="🔧" size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-200">工具执行中</span>
                  <span className="text-xs text-accent-400 animate-pulse-soft">{toolStatus.label}</span>
                </div>
                <div className="bg-surface-50/60 backdrop-blur rounded-xl px-5 py-4 border border-gray-700/30">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-accent-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-300">正在执行...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        {showScrollBtn && (
          <button onClick={scrollToBottom} className="sticky bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-4 py-2 bg-primary-500/20 border border-primary-500/30 text-primary-300 rounded-full shadow-glow-sm hover:bg-primary-500/30 transition-all animate-slide-up">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
            <span className="text-sm">回到底部</span>
          </button>
        )}
      </div>

      {messages.length < 3 && !isStreaming && (
        <div className="px-4 pb-2"><div className="max-w-4xl mx-auto"><QuickActions onAction={handleSend} /></div></div>
      )}

      <div className="p-4 bg-surface-100/80 backdrop-blur-xl border-t border-gray-700/30 shrink-0">
        <div className="max-w-4xl mx-auto">
          {/* 图片预览区 */}
          {attachedImages.length > 0 && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {attachedImages.map((img, i) => (
                <div key={i} className="relative group shrink-0">
                  <img
                    src={`data:${img.mimeType};base64,${img.base64}`}
                    alt={img.name}
                    className="h-16 w-16 object-cover rounded-lg border border-gray-600/50"
                  />
                  <button
                    onClick={() => setAttachedImages(prev => prev.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  ><X size={10} /></button>
                  <span className="text-[9px] text-gray-400 block text-center truncate w-16">{img.name}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={multimodalEnabled
                  ? '输入问题，支持粘贴图片或点击右侧按钮上传图片... (Enter发送，Shift+Enter换行)'
                  : '输入你的问题，或描述你想要的学习内容... (Enter发送，Shift+Enter换行)'}
                rows={2} disabled={isStreaming}
                onPaste={handlePaste}
                className="input-field resize-none pr-12 disabled:opacity-50" />
              <span className="absolute right-3 bottom-3 text-xs text-gray-500">{input.length}/2000</span>
            </div>
            {/* 图片上传按钮（仅多模态模型显示） */}
            {multimodalEnabled && (
              <label className="flex items-center justify-center w-11 h-11 rounded-lg bg-surface-300/50 border border-gray-600/50 hover:border-primary-500/50 cursor-pointer transition-colors shrink-0 text-gray-300 hover:text-primary-300" title="上传图片">
                <ImagePlus size={19} />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={isStreaming}
                />
              </label>
            )}
            <button onClick={() => handleSend()} disabled={(!input.trim() && attachedImages.length === 0) || isStreaming}
              className="btn-primary flex items-center gap-2 h-11 px-5 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              发送
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500 text-center">
            AI生成内容仅供参考 | 支持Markdown渲染与代码高亮
            {multimodalEnabled && ' | 当前模型支持图片输入'}
          </p>
        </div>
      </div>
    </div>
  )
}

function WelcomeGuide({ onSend }: { onSend: (text: string) => void }) {
  const examples = [
    { icon: '🧠', title: '构建学习画像', desc: '我是计算机专业大二学生，学过C++基础，想参加蓝桥杯算法竞赛', action: '帮我分析一下我的学习画像' },
    { icon: '📚', title: '生成学习资料', desc: '获取动态规划入门教程、思维导图、练习题等个性化资源', action: '请为我生成动态规划的入门学习资料' },
    { icon: '🗺️', title: '规划学习路径', desc: '基于你的水平定制从入门到竞赛的完整学习路线', action: '请帮我规划C++算法的学习路径' },
    { icon: '🎓', title: '提问与辅导', desc: '遇到算法难题？随时提问获得详细解答和代码示例', action: '二分查找中如何处理边界条件？请给出代码示例' },
  ]
  return (
    <div className="max-w-3xl mx-auto text-center mb-8">
      <div className="mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center shadow-glow-sm animate-float">
          <AppIcon name="⚡" size={34} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">AlgoAscend</h1>
        <p className="text-gray-400 max-w-md mx-auto">由六个专业AI智能体协作<br />为您提供C++从入门到竞赛的全方位算法学习支持</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {examples.map((ex, i) => (
          <button key={i} onClick={() => onSend(ex.action)}
            className="text-left p-4 rounded-xl bg-surface-50/60 backdrop-blur border border-gray-700/30 hover:border-primary-500/30 hover:shadow-glow-sm transition-all duration-300 group">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-300 shrink-0">
                <AppIcon name={ex.icon} size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-200 group-hover:text-primary-300 transition-colors">{ex.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{ex.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          return !match ? (
            <code className="bg-surface-400/60 text-primary-300 px-1.5 py-0.5 rounded text-sm font-mono border border-gray-700/30" {...props}>{children}</code>
          ) : (
            <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div"
              customStyle={{ borderRadius: '0.75rem', fontSize: '0.875rem', padding: '1rem 1.25rem', background: '#16162a', border: '1px solid rgba(255,255,255,0.05)' }}>
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          )
        },
      }}>{content}</ReactMarkdown>
  )
}
