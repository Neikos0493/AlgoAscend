import { useState, useEffect, useRef, useCallback } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import { useStore } from '../stores/useStore'
import { AppIcon } from '../components/Icon'
import { runCode, runTests, checkCompiler, fetchProblemDetail, type TestCase, type TestResult, type ProblemDetail } from '../services/codeExecutionService'
import { saveError } from '../services/errorNotebookService'
import { Loader2, Play, BookmarkPlus, X, Send, Bot, User, RotateCcw, Plus, Minus, CheckCircle2, XCircle, FlaskConical, BookOpen, Zap, Trophy } from 'lucide-react'
import type { editor } from 'monaco-editor'
import type { ProblemSummary } from '../types/problem'
import { clearEditorHandoff, loadEditorHandoff } from '../services/editorHandoff'
import ProblemStatementRenderer from '../components/ProblemStatementRenderer'

const DEFAULT_CPP = `#include <iostream>
using namespace std;
int main() {
    // 编写你的 C++ 代码
    return 0;
}
`

interface AIMessage { role: 'user' | 'assistant'; content: string }

const CODE_STORAGE_KEY = 'editor:savedCode'

function detailSourceLabel(source?: string): string {
  if (source === 'live') return '牛客实时题面'
  if (source === 'database') return '本地缓存'
  if (source === 'catalog') return '本地题面'
  if (source === 'catalog_summary') return '本地摘要'
  return ''
}

export default function CodeEditorPage() {
  const toggleSidebar = useStore(state => state.toggleSidebar)
  const theme = useStore(state => state.theme)
  const pendingProblem = useStore(state => state.pendingProblem)
  const setPendingProblem = useStore(state => state.setPendingProblem)
  const initialProblemRef = useRef<ProblemSummary | null>(pendingProblem ?? loadEditorHandoff())
  useEffect(() => {
    if (pendingProblem === initialProblemRef.current) setPendingProblem(null)
  }, [])
  const [code, setCode] = useState<string>(() => {
    try { return sessionStorage.getItem(CODE_STORAGE_KEY) || DEFAULT_CPP }
    catch { return DEFAULT_CPP }
  })
  const [stdin, setStdin] = useState('')
  const [status, setStatus] = useState<string>('idle')
  const [stdout, setStdout] = useState('')
  const [stderr, setStderr] = useState('')
  const [compileOutput, setCompileOutput] = useState('')
  const [runtimeMs, setRuntimeMs] = useState(0)
  const [memoryKb, setMemoryKb] = useState(0)
  const [possibleCause, setPossibleCause] = useState('')
  const [running, setRunning] = useState(false)
  const [compilerOk, setCompilerOk] = useState<boolean | null>(null)
  const [currentProblem, setCurrentProblem] = useState<ProblemSummary | null>(initialProblemRef.current)
  const [showProblem, setShowProblem] = useState(true)
  const [problemDetail, setProblemDetail] = useState<ProblemDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailReloadKey, setDetailReloadKey] = useState(0)
  const [editorMode, setEditorMode] = useState<'free' | 'challenge'>(initialProblemRef.current ? 'challenge' : 'free')
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [successPopup, setSuccessPopup] = useState(false)
  const [saveForm, setSaveForm] = useState({ user_approach: '', error_reasons: '', better_solution: '', notes: '' })
  const [saveStatus, setSaveStatus] = useState('')

  // 测试用例模式
  const [testCases, setTestCases] = useState<TestCase[]>([
    { stdin: '', expected: '' },
  ])
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [testRunning, setTestRunning] = useState(false)
  const [testCompileError, setTestCompileError] = useState('')

  // 内嵌 AI 面板
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const aiPanelRef = useRef<HTMLDivElement>(null)

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const executionGenerationRef = useRef(0)
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; text: string }>({ visible: false, text: '' })
  useEffect(() => { checkCompiler().then(r => setCompilerOk(r.available)) }, [])

  const clearAssignmentState = useCallback(() => {
    executionGenerationRef.current += 1
    setStdin('')
    setStatus('idle')
    setStdout(''); setStderr(''); setCompileOutput(''); setPossibleCause('')
    setRuntimeMs(0); setMemoryKb(0); setRunning(false)
    setProblemDetail(null); setDetailLoading(false)
    setTestCases([{ stdin: '', expected: '' }])
    setTestResults([]); setTestCompileError(''); setTestRunning(false)
    setShowSaveForm(false); setSaveStatus('')
    setSaveForm({ user_approach: '', error_reasons: '', better_solution: '', notes: '' })
    setSuccessPopup(false)
  }, [])

  useEffect(() => {
    if (!pendingProblem || pendingProblem === currentProblem) return
    clearAssignmentState()
    setCurrentProblem(pendingProblem)
    setEditorMode('challenge')
    setShowProblem(true)
    setPendingProblem(null)
  }, [clearAssignmentState, currentProblem, pendingProblem, setPendingProblem])

  // 加载题目详情 + 自动填入测试用例。切题或卸载时中止旧请求，避免响应串题。
  useEffect(() => {
    if (!currentProblem) {
      setProblemDetail(null)
      setDetailLoading(false)
      return
    }

    const controller = new AbortController()
    executionGenerationRef.current += 1
    setRunning(false)
    setTestRunning(false)
    setSuccessPopup(false)
    setDetailLoading(true)
    setProblemDetail(null)
    fetchProblemDetail(currentProblem.platform, currentProblem.pid, currentProblem.url, controller.signal)
      .then(detail => {
        executionGenerationRef.current += 1
        setRunning(false)
        setTestRunning(false)
        setSuccessPopup(false)
        setProblemDetail(detail)
        setCurrentProblem(problem => problem ? {
          ...problem,
          title: detail.title || problem.title,
          difficulty: detail.difficulty || problem.difficulty,
          url: detail.url || problem.url,
        } : problem)
        const runnableSamples = detail.samples.filter(sample => sample.output.length > 0)
        setTestCases(runnableSamples.length > 0
          ? runnableSamples.map(sample => ({ stdin: sample.input, expected: sample.output }))
          : [{ stdin: '', expected: '' }])
        setTestResults([])
        setTestCompileError('')
        setEditorMode('challenge')
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setProblemDetail({
          title: currentProblem.title,
          description: error instanceof Error ? error.message : '题目详情加载失败',
          input: '',
          output: '',
          sections: [],
          limits: {},
          samples: [],
          hints: [],
          error: 'detail_fetch_failed',
        })
        setTestCases([{ stdin: '', expected: '' }])
        setEditorMode('challenge')
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false)
      })

    return () => controller.abort()
  }, [currentProblem?.pid, currentProblem?.platform, currentProblem?.url, detailReloadKey])

  // 持久化代码到 sessionStorage（离开页面不丢失）
  useEffect(() => {
    const save = () => { try { sessionStorage.setItem(CODE_STORAGE_KEY, code) } catch {} }
    const timer = setTimeout(save, 500) // 500ms 防抖
    return () => clearTimeout(timer)
  }, [code])

  // 卸载前强制保存
  useEffect(() => {
    const saveNow = () => { try { sessionStorage.setItem(CODE_STORAGE_KEY, code) } catch {} }
    window.addEventListener('beforeunload', saveNow)
    return () => window.removeEventListener('beforeunload', saveNow)
  }, [code])

  // 选中代码后弹出浮动菜单（无需长按，选中即弹）
  const handleEditorMount: OnMount = useCallback((ed) => {
    editorRef.current = ed
    ed.onMouseUp(() => {
      // 小延迟确保 selection 已更新
      setTimeout(() => {
        const sel = ed.getSelection()
        if (sel && !sel.isEmpty()) {
          const text = ed.getModel()?.getValueInRange(sel) || ''
          if (text.trim()) {
            setContextMenu({ visible: true, text })
          }
        }
      }, 50)
    })
  }, [])

  // 浮动菜单点击后打开 AI 面板
  const handleContextMenuAction = (selectedText: string, action: string) => {
    const prompts: Record<string, string> = {
      ask: `请帮我分析这段 C++ 代码：\n\n\`\`\`cpp\n${selectedText}\n\`\`\``,
      explain: `请详细解释这段 C++ 代码每一部分的作用：\n\n\`\`\`cpp\n${selectedText}\n\`\`\``,
      optimize: `请帮我优化这段 C++ 代码，给出更高效的实现方案：\n\n\`\`\`cpp\n${selectedText}\n\`\`\``,
    }
    const prompt = prompts[action] || prompts.ask
    setAiPanelOpen(true)
    sendAIMessage(prompt)
    setContextMenu({ visible: false, text: '' })
  }

  const sendAIMessage = async (msg: string) => {
    if (!msg.trim() || aiLoading) return
    setAiLoading(true)
    const userMsg: AIMessage = { role: 'user', content: msg }
    setAiMessages(prev => [...prev, userMsg])

    try {
      // 使用现有的 SSE 流式 API
      const resp = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, student_id: 1 }),
      })
      if (!resp.ok) throw new Error('请求失败')

      const reader = resp.body?.getReader()
      const decoder = new TextDecoder()
      let full = ''
      setAiMessages(prev => [...prev, { role: 'assistant', content: '' }])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = decoder.decode(value, { stream: true })
          const lines = text.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.type === 'text' && data.content) {
                  full += data.content
                  setAiMessages(prev => {
                    const next = [...prev]
                    next[next.length - 1] = { role: 'assistant', content: full }
                    return next
                  })
                }
              } catch {}
            }
          }
        }
      }
    } catch (e: any) {
      setAiMessages(prev => {
        const next = [...prev]
        if (next.length > 0) next[next.length - 1] = { role: 'assistant', content: '请求失败: ' + (e.message || '未知错误') }
        return next
      })
    } finally {
      setAiLoading(false)
    }
  }

  // 点击"运行"
  const handleRun = async () => {
    if (!code.trim()) return
    const generation = executionGenerationRef.current
    setRunning(true)
    setStatus('running')
    setStdout(''); setStderr(''); setCompileOutput(''); setPossibleCause('')
    setRuntimeMs(0); setMemoryKb(0)

    try {
      const result = await runCode({
        code, stdin, student_id: 1,
        problem_id: currentProblem?.id || '',
        problem_title: currentProblem?.title || '',
        problem_platform: currentProblem?.platform || '',
        problem_difficulty: currentProblem?.difficulty || '',
        problem_tags: currentProblem?.tags || [],
        timeout_ms: 5000,
      })
      if (generation !== executionGenerationRef.current) return
      setStatus(result.status)
      setStdout(result.stdout || '')
      setStderr(result.stderr || '')
      setCompileOutput(result.compile_output || '')
      setRuntimeMs(result.runtime_ms || 0)
      setMemoryKb(result.memory_kb || 0)
      setPossibleCause(result.possible_cause || '')
    } catch (e: any) {
      if (generation !== executionGenerationRef.current) return
      setStatus('error')
      setStderr(e.message || '运行失败')
      setPossibleCause('无法连接到后端服务。请确保后端已启动: cd backend && python main.py')
    } finally {
      if (generation === executionGenerationRef.current) setRunning(false)
    }
  }

  const handleRunTests = async () => {
    if (!code.trim()) return
    const validCases = testCases.filter(tc => tc.stdin.trim() || tc.expected.trim())
    if (validCases.length === 0) return
    const generation = executionGenerationRef.current
    setTestRunning(true)
    setTestResults([])
    setTestCompileError('')
    try {
      const result = await runTests({
        code, test_cases: validCases,
        student_id: 1,
        problem_id: currentProblem?.id || '',
        problem_title: currentProblem?.title || '',
        timeout_ms: 5000,
      })
      if (generation !== executionGenerationRef.current) return
      if (result.compile_output) setTestCompileError(result.compile_output)
      setTestResults(result.results)
      if (result.all_pass && (result.total ?? 0) > 0) {
        setSuccessPopup(true)
      }
    } catch (e: any) {
      if (generation !== executionGenerationRef.current) return
      setTestCompileError(e.message || '测试运行失败')
    } finally {
      if (generation === executionGenerationRef.current) setTestRunning(false)
    }
  }

  const handleSaveToNotebook = async () => {
    setSaveStatus('saving')
    try {
      await saveError({
        student_id: 1, problem_id: currentProblem?.id || '',
        problem_title: currentProblem?.title || '自定义练习',
        problem_platform: currentProblem?.platform || '',
        problem_url: currentProblem?.url || '', difficulty: currentProblem?.difficulty || '',
        tags: currentProblem?.tags || [],
        user_approach: saveForm.user_approach, error_reasons: saveForm.error_reasons,
        better_solution: saveForm.better_solution, notes: saveForm.notes, submission_code: code,
      })
      setSaveStatus('saved')
      setTimeout(() => { setShowSaveForm(false); setSaveStatus(''); setSaveForm({ user_approach: '', error_reasons: '', better_solution: '', notes: '' }) }, 1500)
    } catch { setSaveStatus('error'); setTimeout(() => setSaveStatus(''), 2000) }
  }

  const handleReset = () => {
    if (code !== DEFAULT_CPP && code.trim()) {
      if (!confirm('确定要初始化编辑器吗？当前代码将被清空。')) return
    }
    clearAssignmentState()
    setCode(DEFAULT_CPP)
    setCurrentProblem(null); setPendingProblem(null); setShowProblem(true)
    setEditorMode('free')
    setAiPanelOpen(false); setAiMessages([]); setAiInput(''); setAiLoading(false)
    setContextMenu({ visible: false, text: '' })
    clearEditorHandoff()
    try { sessionStorage.removeItem(CODE_STORAGE_KEY) } catch {}
  }

  const statusLabel: Record<string, string> = {
    idle: '', running: '运行中...', accepted: '✓ 运行成功',
    compile_error: '✕ 编译错误', runtime_error: '✕ 运行错误',
    time_limit: '⏱ 运行超时', error: '✕ 执行失败',
  }
  const statusColor: Record<string, string> = {
    accepted: 'text-green-400', compile_error: 'text-red-400',
    runtime_error: 'text-red-400', time_limit: 'text-amber-400',
    idle: '', running: 'text-primary-400', error: 'text-red-400',
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 头部 */}
      <header className="flex items-center gap-3 px-4 py-2.5 page-header shrink-0">
        <button className="lg:hidden text-ink-muted hover:text-ink" onClick={toggleSidebar}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div className="flex-1 flex items-center gap-2">
          <h2 className="text-base font-semibold text-ink-strong flex items-center gap-2">
            <AppIcon name="💻" size={17} className="text-primary-400" /> 代码编辑器
            {currentProblem && <span className="text-sm font-normal text-ink-muted">— {currentProblem.title}</span>}
          </h2>
        </div>
        {compilerOk === false && (
          <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/20">g++ 未安装</span>
        )}
        <button onClick={handleReset} className="text-xs text-ink-subtle hover:text-ink flex items-center gap-1 px-2 py-1" title="初始化编辑器">
          <RotateCcw size={13} /> 重置
        </button>
        {/* 模式切换 */}
        <div className="flex bg-surface-300/30 rounded-lg p-0.5">
          <button onClick={() => setEditorMode('free')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors ${editorMode === 'free' ? 'bg-primary-500/20 text-primary-300' : 'text-ink-subtle hover:text-ink'}`}>
            <Zap size={12} /> 自由模式
          </button>
          <button onClick={() => setEditorMode('challenge')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors ${editorMode === 'challenge' ? 'bg-primary-500/20 text-primary-300' : 'text-ink-subtle hover:text-ink'}`}>
            <Trophy size={12} /> 答题模式
          </button>
        </div>
        {editorMode === 'free' ? (
          <button onClick={handleRun} disabled={running || !code.trim()}
            className="btn-primary flex items-center gap-1.5 text-sm px-4 py-1.5">
            {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />} 运行
          </button>
        ) : (
          <button onClick={handleRunTests} disabled={testRunning || !code.trim()}
            className="btn-primary flex items-center gap-1.5 text-sm px-4 py-1.5">
            {testRunning ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />} 提交运行
          </button>
        )}
      </header>

      {/* 主体区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：题目面板 */}
        <div className={`border-r border-line/30 overflow-y-auto shrink-0 transition-all ${showProblem ? 'w-[35%]' : 'w-0'}`}>
          {showProblem && (
            <div className="p-4">
              {currentProblem ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setShowProblem(false)} className="text-xs text-ink-subtle hover:text-ink">收起 →</button>
                    <button onClick={() => setEditorMode('challenge')} className="text-xs text-primary-400 hover:text-primary-300">
                      {editorMode === 'challenge' ? '' : '切换到答题模式'}
                    </button>
                  </div>
                  <h3 className="text-base font-semibold text-ink-strong">{currentProblem.title}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {currentProblem.platform && <span className="text-xs bg-surface-300/50 text-ink-muted px-2 py-1 rounded-full border border-line/30">{currentProblem.platformName || currentProblem.platform}</span>}
                    {currentProblem.difficulty && <span className={`text-xs px-2 py-1 rounded-full border ${currentProblem.difficulty.includes('困难') || currentProblem.difficulty.includes('HARD') ? 'bg-red-500/10 text-red-400 border-red-500/20' : currentProblem.difficulty.includes('中等') || currentProblem.difficulty.includes('MEDIUM') ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>{currentProblem.difficulty}</span>}
                  </div>
                  {detailLoading ? (
                    <div className="text-xs text-ink-subtle flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> 加载题目描述...</div>
                  ) : problemDetail?.error ? (
                    <div className="text-xs text-amber-300 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                      {problemDetail.description || '无法获取题目描述'}
                      <div className="mt-2 flex flex-wrap gap-3">
                        {currentProblem.platform === 'nowcoder' && (
                          <button onClick={() => setDetailReloadKey(key => key + 1)} className="text-primary-400 hover:text-primary-300 underline">
                            重新加载题面
                          </button>
                        )}
                        <a href={currentProblem.url} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 underline">
                          点击查看原题 →
                        </a>
                      </div>
                    </div>
                  ) : problemDetail ? (
                    <>
                      {(detailSourceLabel(problemDetail.source) || problemDetail.warning) && (
                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          {detailSourceLabel(problemDetail.source) && (
                            <span className="rounded-full border border-line/40 bg-surface-300/40 px-2 py-1 text-ink-muted">
                              {detailSourceLabel(problemDetail.source)}
                            </span>
                          )}
                          {problemDetail.warning && <span className="text-amber-300">{problemDetail.warning}</span>}
                          {currentProblem.platform === 'nowcoder' && (
                            <button onClick={() => setDetailReloadKey(key => key + 1)} className="text-primary-400 hover:text-primary-300 underline">
                              重新加载
                            </button>
                          )}
                        </div>
                      )}
                      <div className="bg-code-bg rounded-lg p-3 border border-code-line">
                        <ProblemStatementRenderer detail={problemDetail} />
                      </div>
                    </>
                  ) : null}
                  {currentProblem.tags && <div className="flex flex-wrap gap-1">{currentProblem.tags.map((t, i) => <span key={i} className="text-xs text-ink-muted">#{t}</span>)}</div>}
                  {currentProblem.url && <a href={currentProblem.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 underline">查看原题 <AppIcon name="🔗" size={11} /></a>}
                </div>
              ) : (
                <div className="text-center py-16">
                  <AppIcon name="📄" size={36} className="mx-auto mb-3 text-ink-subtle" />
                  <p className="text-ink-muted text-sm">从"随机一题"或"资源库"打开题目</p>
                  <p className="text-xs text-ink-subtle mt-1">或直接在右侧编辑器自由练习</p>
                </div>
              )}
            </div>
          )}
        </div>
        {!showProblem && (
          <button onClick={() => setShowProblem(true)} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-surface-200/90 border border-line/30 rounded-r-lg p-1 text-ink-muted hover:text-ink">
            <span className="text-xs">展开</span>
          </button>
        )}

        {/* 中间：编辑器 + 结果 */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 min-h-0">
            <Editor height="100%" defaultLanguage="cpp" theme={theme === 'dark' ? 'vs-dark' : 'vs'} value={code}
              onChange={(v) => setCode(v || '')} onMount={handleEditorMount}
              options={{
                fontSize: 13.5, fontFamily: "'Cascadia Code','Fira Code','Consolas','JetBrains Mono',monospace",
                minimap: { enabled: false }, lineNumbers: 'on', renderWhitespace: 'selection',
                tabSize: 4, insertSpaces: true, scrollBeyondLastLine: false,
                bracketPairColorization: { enabled: true }, padding: { top: 12 },
                smoothScrolling: true, cursorBlinking: 'smooth',
              }} />
          </div>

          {/* 结果面板 */}
          <div className="border-t border-line/30 bg-surface-200/90 shrink-0 overflow-y-auto" style={{ maxHeight: '45%' }}>
            <div className="p-3 space-y-2">
              {editorMode === 'free' ? (
                <div>
                  <label className="text-[10px] text-ink-subtle mb-1 block">输入 (stdin)</label>
                  <textarea value={stdin} onChange={e => setStdin(e.target.value)} placeholder="程序输入..." rows={2}
                    className="w-full bg-surface-300/50 border border-line/50 rounded-lg px-3 py-1.5 text-xs text-ink font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary-500/50" />
                </div>
              ) : (
                <div className="space-y-2">
                  {currentProblem && !detailLoading && (!problemDetail || problemDetail.samples.every(sample => !sample.output)) && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
                      当前题目没有可判定的公开样例，请手动填写测试输入和期望输出。
                    </div>
                  )}
                  {testCases.map((tc, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-[10px] text-ink-subtle mt-1.5 shrink-0 w-5">#{i + 1}</span>
                      <textarea value={tc.stdin} onChange={e => {
                        const next = [...testCases]; next[i] = { ...next[i], stdin: e.target.value }; setTestCases(next)
                      }} placeholder="输入 (stdin)" rows={3} className="flex-1 min-w-0 resize-y bg-surface-300/50 border border-line/50 rounded-lg px-3 py-1.5 text-xs text-ink font-mono whitespace-pre focus:outline-none focus:ring-1 focus:ring-primary-500/50" />
                      <textarea value={tc.expected} onChange={e => {
                        const next = [...testCases]; next[i] = { ...next[i], expected: e.target.value }; setTestCases(next)
                      }} placeholder="期望输出" rows={3} className="flex-1 min-w-0 resize-y bg-surface-300/50 border border-line/50 rounded-lg px-3 py-1.5 text-xs text-ink font-mono whitespace-pre focus:outline-none focus:ring-1 focus:ring-primary-500/50" />
                      {testCases.length > 1 && (
                        <button onClick={() => setTestCases(prev => prev.filter((_, j) => j !== i))}
                          className="text-ink-subtle hover:text-red-400 mt-1"><Minus size={14} /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setTestCases(prev => [...prev, { stdin: '', expected: '' }])}
                    className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300">
                    <Plus size={12} /> 添加测试用例
                  </button>
                  {testResults.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-green-400">{testResults.filter(r => r.passed === true).length} 通过</span>
                        {testResults.some(r => r.passed === false) && <span className="text-red-400">{testResults.filter(r => r.passed === false).length} 未通过</span>}
                        {testResults.some(r => r.passed === null) && <span className="text-ink-muted">{testResults.filter(r => r.passed === null).length} 未判定</span>}
                      </div>
                      {testResults.map((r, i) => {
                        const isNeutral = r.passed === null
                        return (
                          <div key={i} className={`rounded-lg p-2 text-xs border ${isNeutral ? 'bg-surface-300/30 border-line/40' : r.passed ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                            <div className="flex items-center gap-1.5 mb-1">
                              {isNeutral
                                ? <FlaskConical size={12} className="text-ink-muted" />
                                : r.passed
                                  ? <CheckCircle2 size={12} className="text-green-400" />
                                  : <XCircle size={12} className="text-red-400" />}
                              <span className="text-ink-muted">用例 #{r.index}</span>
                              {isNeutral && <span className="text-ink-subtle">未提供期望输出，仅运行</span>}
                              {r.runtime_ms > 0 && <span className="text-ink-subtle">{r.runtime_ms}ms</span>}
                            </div>
                            {r.stdin && <div className="text-ink-subtle">输入:<pre className="mt-0.5 whitespace-pre-wrap font-mono text-ink">{r.stdin}</pre></div>}
                            {r.expected !== '(无期望输出)' && <div className="text-ink-subtle">期望:<pre className="mt-0.5 whitespace-pre-wrap font-mono text-ink">{r.expected}</pre></div>}
                            {r.passed === false && <div className="text-red-300">实际:<pre className="mt-0.5 whitespace-pre-wrap font-mono">{r.actual}</pre></div>}
                            {isNeutral && r.actual && <div className="text-ink-muted">实际:<pre className="mt-0.5 whitespace-pre-wrap font-mono">{r.actual}</pre></div>}
                            {r.stderr && <div className="text-red-400 mt-0.5">{r.stderr}</div>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {testCompileError && (
                    <div className="p-2 bg-red-500/5 border border-red-500/20 rounded-lg">
                      <span className="text-[10px] text-red-400">编译错误</span>
                      <pre className="text-xs text-red-300 mt-1 font-mono whitespace-pre-wrap">{testCompileError}</pre>
                    </div>
                  )}
                  <button onClick={handleRunTests} disabled={testRunning || !code.trim()}
                    className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5 w-full justify-center">
                    {testRunning ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                    运行测试 ({testCases.filter(tc => tc.stdin.trim() || tc.expected.trim()).length} 个用例)
                  </button>
                </div>
              )}

              {status && status !== 'idle' && status !== 'running' && (
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <span className={statusColor[status] || 'text-ink-muted'}>{statusLabel[status] || status}</span>
                  {runtimeMs > 0 && <span className="text-ink-subtle">运行 {runtimeMs}ms</span>}
                  {memoryKb > 0 && <span className="text-ink-subtle">内存 {memoryKb < 1024 ? `${memoryKb}KB` : `${(memoryKb / 1024).toFixed(1)}MB`}</span>}
                </div>
              )}

              {(stdout || stderr || compileOutput) && (
                <div className="space-y-2">
                  {stdout && (
                    <div>
                      <label className="text-[10px] text-green-500 mb-0.5 block">输出 (stdout)</label>
                      <pre className="text-xs text-ink bg-surface-400/60 rounded-lg p-2.5 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto border border-line/30">{stdout}</pre>
                    </div>
                  )}
                  {stderr && (
                    <div>
                      <label className="text-[10px] text-red-400 mb-0.5 block">错误信息 (stderr)</label>
                      <pre className="text-xs text-red-300 bg-red-500/5 rounded-lg p-2.5 font-mono whitespace-pre-wrap max-h-24 overflow-y-auto border border-red-500/20">{stderr}</pre>
                    </div>
                  )}
                  {compileOutput && (
                    <div>
                      <label className="text-[10px] text-amber-400 mb-0.5 block">编译错误 (原始输出)</label>
                      <pre className="text-xs text-amber-300 bg-amber-500/5 rounded-lg p-2.5 font-mono whitespace-pre-wrap max-h-24 overflow-y-auto border border-amber-500/20">{compileOutput}</pre>
                    </div>
                  )}
                  {possibleCause && (
                    <div className="p-2.5 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                      <label className="text-[10px] text-blue-400 mb-0.5 block">可能的原因</label>
                      <p className="text-xs text-blue-300">{possibleCause}</p>
                    </div>
                  )}
                </div>
              )}

              {editorMode === 'challenge' && status && status !== 'idle' && status !== 'running' && status !== 'accepted' && (
                <button onClick={() => setShowSaveForm(!showSaveForm)} className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300">
                  <BookmarkPlus size={13} /> {showSaveForm ? '收起' : '添加到错题本'}
                </button>
              )}
            </div>

            {showSaveForm && (
              <div className="px-3 pb-3 space-y-2 border-t border-line/30 pt-3">
                <div><label className="text-[10px] text-ink-subtle mb-1 block">做题思路</label><textarea value={saveForm.user_approach} onChange={e => setSaveForm(s => ({ ...s, user_approach: e.target.value }))} rows={2} placeholder="你的解题思路..." className="w-full bg-surface-300/50 border border-line/50 rounded-lg px-3 py-1.5 text-xs text-ink resize-none focus:outline-none focus:ring-1 focus:ring-primary-500/50" /></div>
                <div><label className="text-[10px] text-ink-subtle mb-1 block">错误原因</label><textarea value={saveForm.error_reasons} onChange={e => setSaveForm(s => ({ ...s, error_reasons: e.target.value }))} rows={2} placeholder="出错的原因分析..." className="w-full bg-surface-300/50 border border-line/50 rounded-lg px-3 py-1.5 text-xs text-ink resize-none focus:outline-none focus:ring-1 focus:ring-primary-500/50" /></div>
                <div><label className="text-[10px] text-ink-subtle mb-1 block">更优解法</label><textarea value={saveForm.better_solution} onChange={e => setSaveForm(s => ({ ...s, better_solution: e.target.value }))} rows={2} placeholder="更优的解题方案..." className="w-full bg-surface-300/50 border border-line/50 rounded-lg px-3 py-1.5 text-xs text-ink resize-none focus:outline-none focus:ring-1 focus:ring-primary-500/50" /></div>
                <div className="flex items-center gap-2">
                  <button onClick={handleSaveToNotebook} disabled={saveStatus === 'saving' || saveStatus === 'saved'} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">
                    {saveStatus === 'saving' ? '保存中...' : saveStatus === 'saved' ? '已保存 ✓' : '保存到错题本'}
                  </button>
                  <button onClick={() => setShowSaveForm(false)} className="text-xs text-ink-subtle hover:text-ink">取消</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：AI 内嵌面板 */}
        {aiPanelOpen && (
          <div className="border-l border-line/30 bg-surface-200/95 flex flex-col" style={{ width: '340px', minWidth: '280px' }}>
            <div className="flex items-center justify-between px-3 py-2 border-b border-line/30 shrink-0">
              <span className="text-xs font-medium text-ink flex items-center gap-1.5"><Bot size={14} className="text-primary-400" /> AI 代码助手</span>
              <button onClick={() => setAiPanelOpen(false)} className="text-ink-subtle hover:text-ink"><X size={14} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3" ref={aiPanelRef}>
              {aiMessages.map((m, i) => (
                <div key={i} className={`flex gap-2 text-xs ${m.role === 'user' ? 'justify-end' : ''}`}>
                  {m.role === 'assistant' && <Bot size={14} className="text-primary-400 mt-0.5 shrink-0" />}
                  <div className={`rounded-xl px-3 py-2 max-w-[90%] whitespace-pre-wrap ${m.role === 'user' ? 'bg-primary-600 text-white' : 'bg-surface-300/50 text-ink border border-line/30'}`}>
                    {m.content || (aiLoading && m.role === 'assistant' ? <Loader2 size={12} className="animate-spin inline" /> : '')}
                  </div>
                  {m.role === 'user' && <User size={14} className="text-ink-muted mt-0.5 shrink-0" />}
                </div>
              ))}
              {aiMessages.length === 0 && !aiLoading && (
                <div className="text-center py-8 text-xs text-ink-subtle">长按选中代码自动提问，或输入问题</div>
              )}
            </div>
            <div className="border-t border-line/30 p-2 shrink-0">
              <div className="flex gap-1.5">
                <input value={aiInput} onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAIMessage(aiInput); setAiInput('') } }}
                  placeholder="追问..." disabled={aiLoading}
                  className="flex-1 bg-surface-300/50 border border-line/50 rounded-lg px-3 py-1.5 text-xs text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-1 focus:ring-primary-500/50" />
                <button onClick={() => { sendAIMessage(aiInput); setAiInput('') }} disabled={aiLoading || !aiInput.trim()}
                  className="text-primary-400 hover:text-primary-300 disabled:opacity-30 p-1.5"><Send size={15} /></button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 全部通过弹窗 */}
      {successPopup && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSuccessPopup(false)}>
          <div className="bg-surface-200/95 backdrop-blur-xl rounded-2xl border border-green-500/30 shadow-2xl shadow-green-500/10 p-8 max-w-sm w-full mx-4 text-center" onClick={e => e.stopPropagation()}>
            <Trophy size={48} className="text-yellow-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-ink-strong mb-2">恭喜！全部通过 🎉</h2>
            <p className="text-sm text-ink-muted mb-6">所有 {testResults.length} 个测试用例均已通过</p>
            <div className="flex gap-3">
              <button onClick={() => setSuccessPopup(false)}
                className="flex-1 px-4 py-2.5 bg-surface-300/50 border border-line/50 text-ink rounded-xl text-sm hover:bg-surface-300/70 transition-colors">
                关闭
              </button>
              <button onClick={() => {
                setSuccessPopup(false)
                setShowSaveForm(true)
                setSaveForm({ user_approach: '', error_reasons: '', better_solution: '', notes: '' })
              }}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary-500/20 border border-primary-500/30 text-primary-300 rounded-xl text-sm hover:bg-primary-500/30 transition-colors">
                <BookOpen size={15} /> 加入笔记
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 长按选中 → 浮动菜单 */}
      {contextMenu.visible && (
        <div className="fixed inset-0 z-[200]" onClick={() => setContextMenu({ visible: false, text: '' })}>
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 bg-surface-200/95 backdrop-blur-xl rounded-xl border border-line/50 shadow-2xl shadow-black/40 p-1.5 flex gap-1"
            onClick={e => e.stopPropagation()}>
            {[
              { key: 'ask', label: '向AI提问', icon: '💬' },
              { key: 'explain', label: '解释代码', icon: '📖' },
              { key: 'optimize', label: '优化代码', icon: '⚡' },
            ].map(item => (
              <button key={item.key} onClick={() => handleContextMenuAction(contextMenu.text, item.key)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-ink hover:bg-primary-500/10 hover:text-primary-300 transition-colors whitespace-nowrap">
                <AppIcon name={item.icon} size={13} /> {item.label}
              </button>
            ))}
            <button onClick={() => setContextMenu({ visible: false, text: '' })} className="px-1.5 text-ink-subtle hover:text-ink"><X size={14} /></button>
          </div>
        </div>
      )}
    </div>
  )
}
