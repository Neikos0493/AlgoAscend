import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  agentType: string
  content: string
  contentType: string
  metadata?: any
  timestamp: Date
}

const agentConfig: Record<string, { icon: string; color: string; name: string }> = {
  profile: { icon: '🧠', color: 'from-purple-400 to-purple-600', name: '学习画像分析师' },
  content: { icon: '📚', color: 'from-blue-400 to-blue-600', name: '内容生成专家' },
  exercise: { icon: '🏋️', color: 'from-orange-400 to-orange-600', name: '练习设计教练' },
  path: { icon: '🗺️', color: 'from-green-400 to-green-600', name: '学习路径规划师' },
  tutor: { icon: '🎓', color: 'from-primary-400 to-primary-600', name: '智能辅导老师' },
  assessment: { icon: '📊', color: 'from-pink-400 to-pink-600', name: '学习评估分析师' },
}

export default function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const agent = agentConfig[message.agentType] || { icon: '🤖', color: 'from-gray-400 to-gray-600', name: message.agentType || 'AI助手' }

  if (isUser) {
    return (
      <div className="flex justify-end message-enter">
        <div className="max-w-[80%] bg-primary-600 text-white rounded-2xl rounded-br-md px-5 py-3 shadow-sm">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm shrink-0 ml-3">
          👤
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 message-enter">
      <div
        className={`w-8 h-8 rounded-full bg-gradient-to-br ${agent.color} flex items-center justify-center text-white text-sm shrink-0`}
      >
        {agent.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-200">{agent.name}</span>
          {message.metadata?.topic && (
            <span className="text-xs bg-surface-400/60 text-gray-400 px-2 py-0.5 rounded-full">
              {message.metadata.topic}
            </span>
          )}
          {message.metadata?.difficulty && (
            <span className="text-xs bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full">
              {message.metadata.difficulty}
            </span>
          )}
        </div>
        <div className="bg-surface-300/50 rounded-xl px-5 py-4 shadow-sm border border-gray-700/30">
          <div className="markdown-body">
            <MarkdownContent content={message.content} />
          </div>
        </div>
      </div>
    </div>
  )
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          const inline = !match
          return !inline ? (
            <div className="my-3">
              <div className="flex items-center justify-between bg-gray-800 rounded-t-lg px-4 py-2">
                <span className="text-xs text-gray-400 font-mono">{match?.[1] || 'code'}</span>
                <button
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  onClick={() => navigator.clipboard.writeText(String(children))}
                >
                  📋 复制
                </button>
              </div>
              <SyntaxHighlighter
                style={oneDark}
                language={match?.[1] || 'text'}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0,
                  borderRadius: '0 0 0.75rem 0.75rem',
                  fontSize: '0.875rem',
                  padding: '1rem 1.25rem',
                }}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            </div>
          ) : (
            <code className="bg-surface-400/60 text-primary-300 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
              {children}
            </code>
          )
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border-collapse border border-gray-600/50 rounded-lg overflow-hidden">
                {children}
              </table>
            </div>
          )
        },
        th({ children }) {
          return <th className="bg-surface-300/30 px-4 py-2 text-left text-sm font-semibold text-gray-200 border border-gray-600/50">{children}</th>
        },
        td({ children }) {
          return <td className="px-4 py-2 text-sm border border-gray-600/50 text-gray-200">{children}</td>
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
