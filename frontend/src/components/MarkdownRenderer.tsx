import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useEffect, useRef } from 'react'
import { AppIcon } from './Icon'
import { Copy } from 'lucide-react'

/** Mermaid 图表渲染组件 */
function MermaidBlock({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // 动态加载 mermaid.js
    const loadMermaid = async () => {
      try {
        const mermaid = (window as any).mermaid
        if (!mermaid) {
          // 加载 CDN
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js'
            script.onload = () => resolve()
            script.onerror = () => reject(new Error('Mermaid CDN 加载失败'))
            document.head.appendChild(script)
          })
        }
        const m = (window as any).mermaid
        if (m) {
          m.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' })
          const id = 'mermaid-' + Math.random().toString(36).slice(2, 11)
          const { svg } = await m.render(id, code)
          container.innerHTML = svg
        }
      } catch {
        container.innerHTML = `<pre class="text-red-400 text-xs">Mermaid 图表渲染失败，请检查语法</pre><pre class="text-gray-500 text-[10px] mt-2">${code}</pre>`
      }
    }
    loadMermaid()
  }, [code])

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-gray-700/50 bg-[#0f1117]">
      <div className="flex items-center px-4 py-2 bg-gray-800/90 border-b border-gray-700/30">
        <span className="inline-flex items-center gap-1 text-xs text-teal-400 font-mono"><AppIcon name="📊" size={12} /> Mermaid 图表</span>
      </div>
      <div ref={containerRef} className="p-4 flex justify-center overflow-x-auto">
        <div className="text-gray-400 text-sm">加载中...</div>
      </div>
    </div>
  )
}

/**
 * 知识库内容渲染器
 * 支持：代码语法高亮（Prism.js）+ LaTeX 公式（KaTeX）+ GFM 表格/列表
 */
export default function MarkdownRenderer({ content }: { content: string }) {
  if (!content) return null

  return (
    <div className="markdown-body text-gray-200 leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // ===== 代码块 =====
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const inline = !match
            if (match && match[1] === 'mermaid') {
              return <MermaidBlock code={String(children)} />
            }
            return !inline ? (
              <div className="my-4 rounded-xl overflow-hidden border border-gray-700/50 shadow-lg">
                {/* 语言标签栏 */}
                <div className="flex items-center justify-between bg-gray-800/90 px-4 py-2 border-b border-gray-700/30">
                  <span className="text-xs text-gray-400 font-mono tracking-wider">
                    {match[1] === 'cpp' ? 'C++' : match[1]}
                  </span>
                  <button
                    className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-0.5 rounded hover:bg-gray-700/50"
                    onClick={() => navigator.clipboard.writeText(String(children))}
                  >
                    <Copy size={12} /> 复制
                  </button>
                </div>
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1] || 'text'}
                  PreTag="div"
                  showLineNumbers
                  lineNumberStyle={{
                    color: '#4a5568',
                    fontSize: '0.75rem',
                    marginRight: '1rem',
                    minWidth: '1.5em',
                    userSelect: 'none',
                  }}
                  customStyle={{
                    margin: 0,
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                    borderRadius: '0 0 0.75rem 0.75rem',
                    fontSize: '0.8125rem',
                    lineHeight: '1.7',
                    padding: '1rem 0',
                    background: '#1a1b26',
                  }}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className="bg-gray-700/60 text-primary-300 px-1.5 py-0.5 rounded text-[0.85em] font-mono" {...props}>
                {children}
              </code>
            )
          },

          // ===== 标题 =====
          h1({ children }) {
            return <h1 className="text-2xl font-bold text-white mt-8 mb-4 pb-2 border-b border-gray-700/30">{children}</h1>
          },
          h2({ children }) {
            return <h2 className="text-xl font-semibold text-gray-100 mt-6 mb-3">{children}</h2>
          },
          h3({ children }) {
            return <h3 className="text-lg font-medium text-gray-200 mt-5 mb-2">{children}</h3>
          },

          // ===== 段落 =====
          p({ children }) {
            return <p className="text-gray-300 leading-relaxed mb-4">{children}</p>
          },

          // ===== 列表 =====
          ul({ children }) {
            return <ul className="list-disc list-inside text-gray-300 space-y-1.5 mb-4 pl-2">{children}</ul>
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside text-gray-300 space-y-1.5 mb-4 pl-2">{children}</ol>
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>
          },

          // ===== 表格 =====
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4 rounded-lg border border-gray-700/30">
                <table className="w-full text-sm border-collapse">{children}</table>
              </div>
            )
          },
          thead({ children }) {
            return <thead className="bg-gray-800/50">{children}</thead>
          },
          th({ children }) {
            return <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-200 border-b border-gray-700/30">{children}</th>
          },
          td({ children }) {
            return <td className="px-4 py-2 text-sm text-gray-300 border-t border-gray-700/20">{children}</td>
          },
          tr({ children }) {
            return <tr className="even:bg-gray-800/20">{children}</tr>
          },

          // ===== 引用块 =====
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-primary-500/50 bg-primary-500/5 pl-4 pr-2 py-3 my-4 rounded-r-lg text-gray-300">
                {children}
              </blockquote>
            )
          },

          // ===== 强调/加粗 =====
          strong({ children }) {
            return <strong className="font-semibold text-white">{children}</strong>
          },
          em({ children }) {
            return <em className="italic text-gray-200">{children}</em>
          },

          // ===== 链接 =====
          a({ children, href }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 underline underline-offset-2">
                {children}
              </a>
            )
          },

          // ===== 分割线 =====
          hr() {
            return <hr className="my-6 border-gray-700/30" />
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
