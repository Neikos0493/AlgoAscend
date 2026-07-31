import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ProblemDetail } from '../services/codeExecutionService'
import { normalizeHttpUrl } from '../types/problem'

const PROBLEM_MEDIA_SRC = /^\/api\/code\/problem-media\/[0-9a-f]{64}$/

function preserveSingleNewlines(content: string): string {
  return content.replace(/([^\n])\n(?!\n|\s*(?:[-*+] |\d+[.)] |>|#|```|~~~))(?=\S)/g, '$1  \n')
}

function ProblemMedia({ src, alt }: { src?: string; alt?: string }) {
  const [loadFailed, setLoadFailed] = useState(false)
  const safeSrc = src && PROBLEM_MEDIA_SRC.test(src) ? src : undefined

  if (!safeSrc || loadFailed) return alt ? <span>{alt}</span> : null

  return (
    <img
      src={safeSrc}
      alt={alt || ''}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className="my-2 block h-auto max-h-[32rem] max-w-full rounded-lg object-contain"
      onError={() => setLoadFailed(true)}
    />
  )
}

function MarkdownBlock({ content }: { content: string }) {
  if (!content) return null
  return (
    <ReactMarkdown
      skipHtml
      remarkPlugins={[remarkGfm]}
      allowedElements={[
        'p', 'br', 'strong', 'em', 'del', 'blockquote', 'ul', 'ol', 'li',
        'pre', 'code', 'h1', 'h2', 'h3', 'h4', 'hr', 'table', 'thead',
        'tbody', 'tr', 'th', 'td', 'a', 'img',
      ]}
      unwrapDisallowed
      components={{
        a({ href, children }) {
          const safe = normalizeHttpUrl(href ?? '') || undefined
          return safe
            ? <a href={safe} target="_blank" rel="noopener noreferrer nofollow" className="text-primary-400 underline">{children}</a>
            : <span>{children}</span>
        },
        img({ src, alt }) {
          return <ProblemMedia key={src} src={src} alt={alt} />
        },
        pre({ children }) {
          return <pre className="my-2 max-w-full overflow-x-auto whitespace-pre-wrap rounded-lg bg-surface-400/60 p-2 font-mono">{children}</pre>
        },
        code({ children }) {
          return <code className="rounded bg-surface-400/60 px-1 py-0.5 font-mono">{children}</code>
        },
        table({ children }) {
          return <div className="my-2 overflow-x-auto"><table className="min-w-full border-collapse">{children}</table></div>
        },
        th({ children }) {
          return <th className="border border-line/40 px-2 py-1 text-left">{children}</th>
        },
        td({ children }) {
          return <td className="border border-line/40 px-2 py-1 align-top">{children}</td>
        },
      }}
    >
      {preserveSingleNewlines(content)}
    </ReactMarkdown>
  )
}

export default function ProblemStatementRenderer({ detail }: { detail: ProblemDetail }) {
  const hasLimits = detail.limits.time || detail.limits.memory
  return (
    <div className="problem-statement text-xs text-ink leading-relaxed break-words space-y-3">
      {hasLimits && (
        <div className="flex flex-wrap gap-2 text-[11px] text-ink-muted">
          {detail.limits.time && <span className="rounded-full border border-line/40 px-2 py-1">时间限制：{detail.limits.time}</span>}
          {detail.limits.memory && <span className="rounded-full border border-line/40 px-2 py-1">空间限制：{detail.limits.memory}</span>}
        </div>
      )}
      {detail.description && <section><MarkdownBlock content={detail.description} /></section>}
      {detail.input && <section><h4 className="mb-1 font-semibold text-ink-strong">输入描述</h4><MarkdownBlock content={detail.input} /></section>}
      {detail.output && <section><h4 className="mb-1 font-semibold text-ink-strong">输出描述</h4><MarkdownBlock content={detail.output} /></section>}
      {detail.sections.map((section, index) => (
        <section key={`${section.title}-${index}`}>
          <h4 className="mb-1 font-semibold text-ink-strong">{section.title}</h4>
          <MarkdownBlock content={section.content} />
        </section>
      ))}
      {detail.samples.length > 0 && (
        <section className="space-y-2">
          <h4 className="font-semibold text-ink-strong">样例</h4>
          {detail.samples.map((sample, index) => (
            <div key={index} className="rounded-lg border border-code-line bg-code-bg p-2">
              <div className="mb-0.5 text-ink-muted">输入 #{index + 1}</div>
              <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-ink">{sample.input}</pre>
              <div className="mb-0.5 mt-2 text-ink-muted">输出 #{index + 1}</div>
              <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-ink">{sample.output}</pre>
            </div>
          ))}
        </section>
      )}
      {detail.hints.length > 0 && (
        <section>
          <h4 className="mb-1 font-semibold text-ink-strong">提示</h4>
          <ol className="list-decimal space-y-1 pl-5">
            {detail.hints.map((hint, index) => <li key={index}><MarkdownBlock content={hint} /></li>)}
          </ol>
        </section>
      )}
    </div>
  )
}
