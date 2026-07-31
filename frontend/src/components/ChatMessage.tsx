import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import MindmapRenderer from './MindmapRenderer'
import { AppIcon } from './Icon'
import { Copy } from 'lucide-react'
import { useStore } from '../stores/useStore'

interface MessageAttachment {
  type: 'mindmap' | 'image' | 'ppt' | 'video' | 'doc' | 'knowledge' | 'knowledge_entry' | 'problems'
  data: any
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  agentType: string
  content: string
  contentType: string
  metadata?: any
  attachments?: MessageAttachment[]
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
          <AppIcon name="👤" size={15} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 message-enter">
      <div
        className={`w-8 h-8 rounded-full bg-gradient-to-br ${agent.color} flex items-center justify-center text-white text-sm shrink-0`}
      >
        <AppIcon name={agent.icon} size={15} />
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
          {/* 附件渲染 */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-4 space-y-3 border-t border-gray-700/30 pt-4">
              {message.attachments.map((att, i) => (
                <AttachmentRenderer key={i} attachment={att} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MarkdownContent({ content }: { content: string }) {
  const theme = useStore(state => state.theme)
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
                  className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  onClick={() => navigator.clipboard.writeText(String(children))}
                >
                  <Copy size={12} /> 复制
                </button>
              </div>
              <SyntaxHighlighter
                style={theme === 'dark' ? oneDark : oneLight}
                language={match?.[1] || 'text'}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0,
                  borderRadius: '0 0 0.75rem 0.75rem',
                  fontSize: '0.875rem',
                  padding: '1rem 1.25rem',
                  background: 'rgb(var(--color-code-bg))',
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

// ===== 附件渲染器 =====

function AttachmentRenderer({ attachment }: { attachment: MessageAttachment }) {
  const { type, data } = attachment

  switch (type) {
    case 'mindmap':
      return (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-accent-400"><AppIcon name="🧠" size={13} /> 思维导图</span>
          </div>
          <div className="bg-code-bg rounded-lg p-2 border border-line/30">
            <MindmapRenderer tree={data.tree} />
          </div>
        </div>
      )

    case 'image':
      return (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-400"><AppIcon name="🎨" size={13} /> AI 生成图片</span>
          </div>
          {data.base64 ? (
            <div className="rounded-lg overflow-hidden border border-gray-600/30 max-w-md">
              <img
                src={`data:image/png;base64,${data.base64}`}
                alt="AI 生成图片"
                className="w-full"
              />
            </div>
          ) : (
            <div className="text-xs text-gray-500">图片数据为空</div>
          )}
        </div>
      )

    case 'ppt':
      return (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-400"><AppIcon name="📊" size={13} /> PPT 课件</span>
          </div>
          <div className="bg-surface-400/20 rounded-lg p-3 border border-gray-600/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">{data.filename || '课件.pptx'}</span>
              <span className="text-xs text-gray-500">{data.slides || '?'} 页</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              PPT 已保存到服务器，可在「学习资源」页面下载
            </div>
          </div>
        </div>
      )

    case 'problems': {
      const problems: any[] = data.results || []
      return (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400"><AppIcon name="🏋️" size={13} /> 题库推荐</span>
            {data.query && <span className="text-xs text-gray-500">关键词: {data.query}</span>}
            <span className="text-xs text-gray-500">{problems.length} 题</span>
          </div>
          {problems.length === 0 ? (
            <div className="text-xs text-gray-500 bg-surface-400/20 rounded-lg p-3">
              {data.message || '未找到相关题目，建议换关键词重试'}
            </div>
          ) : (
            <div className="space-y-2">
              {problems.map((p, i) => {
                const diff = p.difficulty || ''
                const isHard = diff.includes('困难') || diff.includes('HARD')
                const isMid = diff.includes('中等') || diff.includes('MEDIUM')
                return (
                  <a
                    key={i}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-surface-400/30 hover:bg-surface-400/50 rounded-lg p-3 border border-gray-600/30 hover:border-emerald-500/40 transition-all group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-200 group-hover:text-emerald-300 transition-colors truncate flex-1">
                        {p.title}
                      </span>
                      {diff && (
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                          isHard ? 'bg-red-500/15 text-red-300' : isMid ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'
                        }`}>{diff}</span>
                      )}
                    </div>
                    {p.tags && p.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {p.tags.slice(0, 5).map((t: string, j: number) => (
                          <span key={j} className="text-[10px] text-gray-400 bg-surface-300/40 px-1.5 py-0.5 rounded">#{t}</span>
                        ))}
                      </div>
                    )}
                  </a>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    case 'knowledge': {
      const items: any[] = data.results || []
      return (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-400"><AppIcon name="📖" size={13} /> 知识库检索</span>
            {data.query && <span className="text-xs text-gray-500">关键词: {data.query}</span>}
            <span className="text-xs text-gray-500">{items.length} 条</span>
          </div>
          {items.length === 0 ? (
            <div className="text-xs text-gray-500 bg-surface-400/20 rounded-lg p-3">
              {data.message || '未找到相关内容'}
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="bg-surface-400/30 rounded-lg p-3 border border-gray-600/30">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <a
                      href={it.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-sky-300 hover:text-sky-200 hover:underline truncate"
                    >
                      {it.title}
                    </a>
                    {it.source && (
                      <span className="text-[10px] text-gray-400 bg-surface-300/40 px-1.5 py-0.5 rounded shrink-0">{it.source}</span>
                    )}
                  </div>
                  {it.category && (
                    <div className="text-[10px] text-gray-500 mb-1">分类: {it.category}</div>
                  )}
                  {it.content && (
                    <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed">{it.content}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    case 'knowledge_entry': {
      const content: string = data.content || ''
      const preview = content.length > 1200 ? content.slice(0, 1200) + '\n\n... (内容已截断，点击下方链接查看完整原文)' : content
      return (
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-400"><AppIcon name="📄" size={13} /> 知识库全文</span>
            <span className="text-sm font-medium text-gray-200 truncate">{data.title}</span>
            {data.source && (
              <span className="text-[10px] text-gray-400 bg-surface-300/40 px-1.5 py-0.5 rounded">{data.source}</span>
            )}
          </div>
          <div className="bg-surface-400/30 rounded-lg p-3 border border-gray-600/30 max-h-96 overflow-y-auto">
            <div className="markdown-body text-sm">
              <MarkdownContent content={preview} />
            </div>
          </div>
          {data.url && (
            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs text-sky-400 hover:text-sky-300 underline"
            >
              查看完整原文 <AppIcon name="🔗" size={11} />
            </a>
          )}
        </div>
      )
    }

    case 'video':
      return (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-400"><AppIcon name="🎬" size={13} /> 算法动画视频</span>
          </div>
          {data.video_url ? (
            <div className="rounded-lg overflow-hidden border border-gray-600/30 max-w-lg">
              <video src={data.video_url} controls className="w-full" />
            </div>
          ) : (
            <div className="bg-surface-400/30 rounded-lg p-3 border border-gray-600/30">
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1 text-sm text-gray-200"><AppIcon name="📝" size={14} /> Manim 脚本已生成</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${data.render_status === 'rendered' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                  {data.render_status === 'rendered' ? '已渲染' : '脚本模式'}
                </span>
              </div>
              <details className="mt-2">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">查看脚本代码</summary>
                <pre className="mt-2 text-[11px] text-ink bg-code-bg p-3 rounded-lg overflow-x-auto max-h-64 overflow-y-auto font-mono border border-line/30">
                  {data.script?.slice(0, 2000)}
                  {data.script?.length > 2000 && '\n\n... (代码已截断)'}
                </pre>
              </details>
              <div className="mt-2 text-xs text-gray-500">
                将此脚本保存为 .py 文件，安装 Manim 后运行即可渲染视频
              </div>
            </div>
          )}
        </div>
      )

    default:
      return null
  }
}
