import { useState, useRef, useEffect } from 'react'
import { useStore } from '../stores/useStore'
import { sendMessage, clearHistory, DEEPSEEK_MODELS, fetchProfile } from '../services/api'
import ChatMessage from '../components/ChatMessage'
import QuickActions from '../components/QuickActions'
import AgentPipeline from '../components/AgentPipeline'
import SettingsModal from '../components/SettingsModal'

interface PipelineData {
  agents: { key: string; name: string; icon: string }[]
  tasks: { name: string; agent_key: string }[]
}

export default function ChatPage() {
  const {
    messages, isStreaming, currentStreaming, currentAgent,
    addMessage, setStreaming, appendToStream, clearStream, setCurrentAgent,
    clearMessages, setProfile, setDimensionsFilled,
    selectedModel, setSelectedModel,
    settingsOpen, setSettingsOpen,
  } = useStore()

  const [input, setInput] = useState('')
  const [pipeline, setPipeline] = useState<PipelineData | null>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isUserScrollingRef = useRef(false)

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

  const handleSend = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || isStreaming) return

    setInput('')
    setPipeline(null)
    isUserScrollingRef.current = false
    addMessage({
      id: '', role: 'user', agentType: '', content: msg,
      contentType: 'text', timestamp: new Date(),
    })

    setStreaming(true)
    setCurrentAgent('')
    const pipelineRef = (window as any).__agentPipeline

    const history = useStore.getState().messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    await sendMessage(msg, 1,
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
        }
      },
      () => { clearStream(); pipelineRef?.reset?.(); if (shouldRefreshProfile(msg)) refreshProfileData() },
      (error) => { appendToStream(`\n\n> ⚠️ 出错了: ${error}`); clearStream(); pipelineRef?.reset?.() },
      selectedModel, history,
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleClear = async () => { try { await clearHistory(1); clearMessages() } catch { /* ignore */ } }

  const shouldRefreshProfile = (msg: string): boolean => {
    const profileKeywords = ['我是','专业','年级','学过','基础','水平','竞赛','画像','了解我','介绍','分析','评估','想学','目标','计划','节奏','每周','每天','时间','薄弱','不会','难点','容易错','容易犯']
    return profileKeywords.some(kw => msg.toLowerCase().includes(kw))
  }
  const refreshProfileData = async () => {
    try { const data = await fetchProfile(1); if (data.profile) { setProfile(data.profile); setDimensionsFilled(data.dimensions_filled || 0) } } catch { /* */ }
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-6 py-3 bg-surface-100/80 backdrop-blur-xl border-b border-gray-700/30 shrink-0">
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
          <div className="relative">
            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} disabled={isStreaming}
              className="appearance-none bg-surface-300/50 border border-gray-600/50 rounded-lg px-3 py-1.5 pr-8 text-xs font-medium text-gray-200 cursor-pointer hover:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-colors disabled:opacity-50">
              {DEEPSEEK_MODELS.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
            </select>
            <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
          {isStreaming && (
            <span className="flex items-center gap-1 text-xs text-primary-400 animate-pulse-soft">
              <span className="w-2 h-2 bg-primary-400 rounded-full shadow-glow-sm" />生成中...
            </span>
          )}
          <button onClick={handleClear} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">清空对话</button>
        </div>
      </header>

      <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-6 relative">
        {messages.length === 0 && !isStreaming && (<WelcomeGuide onSend={handleSend} />)}
        <div className="max-w-4xl mx-auto space-y-4">
          <AgentPipeline pipeline={pipeline} />
          {messages.map((msg) => (<ChatMessage key={msg.id} message={msg} />))}
          {isStreaming && currentStreaming && (
            <div className="flex gap-3 message-enter">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-sm shrink-0 shadow-glow-sm">
                {currentAgent ? '🤖' : '💬'}
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
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="输入你的问题，或描述你想要的学习内容... (Enter发送，Shift+Enter换行)"
                rows={2} disabled={isStreaming}
                className="input-field resize-none pr-12 disabled:opacity-50" />
              <span className="absolute right-3 bottom-3 text-xs text-gray-500">{input.length}/2000</span>
            </div>
            <button onClick={() => handleSend()} disabled={!input.trim() || isStreaming}
              className="btn-primary flex items-center gap-2 h-11 px-5 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              发送
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500 text-center">AI生成内容仅供参考 | 支持Markdown渲染与代码高亮</p>
        </div>
      </div>
      <SettingsModal />
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
        <div className="text-6xl mb-4 animate-float">⚡</div>
        <h1 className="text-2xl font-bold text-white mb-2">C++算法学习助手</h1>
        <p className="text-gray-400 max-w-md mx-auto">由6个专业AI智能体协作，为你提供从入门到竞赛的全方位算法学习支持</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {examples.map((ex, i) => (
          <button key={i} onClick={() => onSend(ex.action)}
            className="text-left p-4 rounded-xl bg-surface-50/60 backdrop-blur border border-gray-700/30 hover:border-primary-500/30 hover:shadow-glow-sm transition-all duration-300 group">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{ex.icon}</span>
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
