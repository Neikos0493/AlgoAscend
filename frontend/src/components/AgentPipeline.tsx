import { useState, useEffect } from 'react'

interface AgentInfo {
  key: string
  name: string
  icon: string
}

interface TaskInfo {
  name: string
  agent_key: string
}

interface PipelineData {
  agents: AgentInfo[]
  tasks: TaskInfo[]
}

interface AgentState {
  key: string
  name: string
  icon: string
  status: 'waiting' | 'active' | 'thinking' | 'done'
  taskName: string
  thinking: string[]
}

interface AgentPipelineProps {
  pipeline: PipelineData | null
}

export default function AgentPipeline({ pipeline }: AgentPipelineProps) {
  const [agents, setAgents] = useState<AgentState[]>([])
  const [expanded, setExpanded] = useState(true)
  const [activeAgentIdx, setActiveAgentIdx] = useState(-1)

  // 监听pipeline变化, 初始化Agent状态
  useEffect(() => {
    if (pipeline && pipeline.agents.length > 0) {
      setAgents(
        pipeline.agents.map((a, i) => ({
          key: a.key,
          name: a.name,
          icon: a.icon,
          status: 'waiting' as const,
          taskName: pipeline.tasks[i]?.name || '',
          thinking: [],
        }))
      )
      setActiveAgentIdx(-1)
    }
  }, [pipeline])

  // 暴露方法给父组件调用
  useEffect(() => {
    ;(window as any).__agentPipeline = {
      onAgentStart: (agentKey: string) => {
        setAgents((prev) =>
          prev.map((a) =>
            a.key === agentKey
              ? { ...a, status: 'active' as const, thinking: [] }
              : a
          )
        )
        setActiveAgentIdx((prev) => {
          const idx = agents.findIndex((a) => a.key === agentKey)
          return idx >= 0 ? idx : prev
        })
      },
      onAgentThinking: (agentKey: string, content: string) => {
        setAgents((prev) =>
          prev.map((a) =>
            a.key === agentKey
              ? { ...a, status: 'thinking' as const, thinking: [...a.thinking, content] }
              : a
          )
        )
        setTimeout(() => {
          thinkingEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 50)
      },
      onAgentDone: (agentKey: string) => {
        setAgents((prev) =>
          prev.map((a) =>
            a.key === agentKey
              ? { ...a, status: 'done' as const }
              : a
          )
        )
      },
      onHandoff: (fromKey: string, toKey: string) => {
        // 标记前一个Agent完成，下一个即将开始
        setAgents((prev) =>
          prev.map((a) =>
            a.key === fromKey ? { ...a, status: 'done' as const }
            : a.key === toKey ? { ...a, status: 'active' as const }
            : a
          )
        )
      },
      reset: () => {
        setAgents([])
        setActiveAgentIdx(-1)
      },
    }
  }, [pipeline, agents])

  if (!pipeline || agents.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
      {/* 标题栏 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🔍</span>
          <span className="text-sm font-semibold text-gray-700">多智能体协作过程</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {agents.length} Agent{agents.length > 1 ? 's' : ''}
          </span>
          {agents.some((a) => a.status === 'thinking') && (
            <span className="flex items-center gap-1 text-xs text-primary-600 animate-pulse-soft ml-2">
              <span className="w-2 h-2 bg-primary-500 rounded-full" />
              协作中...
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {/* Agent流程管道 */}
          <div className="flex items-center gap-0 py-3 overflow-x-auto">
            {agents.map((agent, idx) => (
              <div key={agent.key} className="flex items-center gap-0 shrink-0">
                {/* Agent卡片 */}
                <div
                  className={`
                    relative flex flex-col items-center px-4 py-3 rounded-xl min-w-[90px]
                    transition-all duration-500
                    ${agent.status === 'active' || agent.status === 'thinking'
                      ? 'bg-primary-50 border-2 border-primary-400 shadow-md scale-105'
                      : agent.status === 'done'
                      ? 'bg-green-50 border-2 border-green-300'
                      : 'bg-gray-50 border-2 border-gray-200 opacity-60'
                    }
                  `}
                >
                  {/* 状态指示器 */}
                  <div className="absolute -top-2 -right-2">
                    {agent.status === 'thinking' && (
                      <span className="flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-primary-500 items-center justify-center">
                          <span className="text-white text-[10px]">💭</span>
                        </span>
                      </span>
                    )}
                    {agent.status === 'done' && (
                      <span className="flex h-5 w-5 bg-green-500 rounded-full items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                    {agent.status === 'active' && (
                      <span className="flex h-5 w-5 bg-primary-500 rounded-full items-center justify-center animate-pulse-soft">
                        <span className="text-white text-[10px]">▶</span>
                      </span>
                    )}
                  </div>

                  <span className="text-2xl mb-1">{agent.icon}</span>
                  <span className="text-xs font-medium text-gray-700 text-center leading-tight">
                    {agent.name}
                  </span>
                  <span className="text-[10px] text-gray-400 mt-1">
                    {agent.status === 'waiting' && '等待中'}
                    {agent.status === 'active' && '准备中'}
                    {agent.status === 'thinking' && '思考中...'}
                    {agent.status === 'done' && '✓ 完成'}
                  </span>
                </div>

                {/* 连接箭头 */}
                {idx < agents.length - 1 && (
                  <div className="flex items-center px-1">
                    <div className="relative">
                      <svg className="w-8 h-5" viewBox="0 0 40 24">
                        <defs>
                          <linearGradient id={`grad-${idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={agents[idx].status === 'done' ? '#16a34a' : '#9ca3af'} />
                            <stop offset="100%" stopColor={agents[idx + 1].status !== 'waiting' ? '#2563eb' : '#9ca3af'} />
                          </linearGradient>
                        </defs>
                        <line x1="0" y1="12" x2="30" y2="12" stroke={`url(#grad-${idx})`} strokeWidth="2.5" strokeLinecap="round" />
                        <polygon points="30,7 40,12 30,17" fill={agents[idx + 1].status !== 'waiting' ? '#2563eb' : '#d1d5db'} />
                      </svg>
                      {agents[idx].status === 'done' && (
                        <span className="absolute -top-1 left-2 text-[10px] animate-fade-in">📤</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 任务分配表 */}
          <div className="mt-1 mb-3">
            <div className="text-xs text-gray-400 mb-2">📋 任务分配</div>
            <div className="space-y-1">
              {agents.map((agent, idx) => (
                <div
                  key={agent.key}
                  className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    agent.status === 'thinking'
                      ? 'bg-primary-50 text-primary-700'
                      : agent.status === 'done'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-50 text-gray-500'
                  }`}
                >
                  <span className="font-mono text-gray-400 w-4">{idx + 1}.</span>
                  <span>{agent.icon}</span>
                  <span className="font-medium">{agent.name}</span>
                  <span className="text-gray-300">→</span>
                  <span>{agent.taskName}</span>
                  <span className="ml-auto">
                    {agent.status === 'waiting' && '⏳'}
                    {agent.status === 'active' && '🟡'}
                    {agent.status === 'thinking' && '💭'}
                    {agent.status === 'done' && '✅'}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

// 从window获取AgentPipeline引用
export function useAgentPipeline() {
  return (window as any).__agentPipeline as {
    onAgentStart: (key: string) => void
    onAgentThinking: (key: string, content: string) => void
    onAgentDone: (key: string) => void
    reset: () => void
  } | null
}
