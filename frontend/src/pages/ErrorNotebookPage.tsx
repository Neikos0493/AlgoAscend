import { useState, useEffect, useCallback, useRef } from 'react'
import { useStore } from '../stores/useStore'
import { AppIcon } from '../components/Icon'
import { listErrors, saveError, updateError, deleteError, type ErrorNotebookEntry } from '../services/errorNotebookService'
import { PenLine, Trash2, Search, Plus, Code, FileText } from 'lucide-react'
import { openProblemInEditor } from '../services/editorHandoff'

const PLATFORM_OPTIONS = ['', 'luogu', 'leetcode', 'nowcoder']
const PLATFORM_LABELS: Record<string, string> = { luogu: '洛谷', leetcode: '力扣', nowcoder: '牛客' }
const SUPPORTED_EDITOR_PLATFORMS = new Set(['luogu', 'leetcode', 'nowcoder'])

function canOpenInEditor(entry: ErrorNotebookEntry): boolean {
  return Boolean(entry.problem_id?.trim() && SUPPORTED_EDITOR_PLATFORMS.has(entry.problem_platform))
}

export default function ErrorNotebookPage() {
  const { toggleSidebar } = useStore()
  const [entries, setEntries] = useState<ErrorNotebookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ platform: '', difficulty: '', tag: '', search: '' })
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ problem_title: '', user_approach: '', error_reasons: '', better_solution: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [createSaving, setCreateSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({ title: '', content: '', tags: '' })
  const requestVersion = useRef(0)

  const load = useCallback(async () => {
    const version = ++requestVersion.current
    setLoading(true)
    try {
      const data = await listErrors(1, { platform: filter.platform || undefined, difficulty: filter.difficulty || undefined, tag: filter.tag || undefined })
      let result = data
      if (filter.search) {
        const s = filter.search.toLowerCase()
        result = result.filter(e => e.problem_title.toLowerCase().includes(s) || e.notes?.toLowerCase().includes(s) || e.user_approach?.toLowerCase().includes(s))
      }
      if (version !== requestVersion.current) return
      setEntries(result)
      setErrorMessage('')
    } catch (error) {
      if (version !== requestVersion.current) return
      setErrorMessage(error instanceof Error ? error.message : '加载笔记失败，请稍后重试')
    } finally {
      if (version === requestVersion.current) setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  const handleEdit = (entry: ErrorNotebookEntry) => {
    setEditingId(entry.id!)
    setErrorMessage('')
    setEditForm({
      problem_title: entry.problem_title || '',
      user_approach: entry.user_approach || '',
      error_reasons: entry.error_reasons || '',
      better_solution: entry.better_solution || '',
      notes: entry.notes || '',
    })
  }

  const handleCreate = async () => {
    const title = createForm.title.trim()
    if (!title || createSaving) return

    setCreateSaving(true)
    setErrorMessage('')
    try {
      const created = await saveError({
        student_id: 1, problem_id: '', problem_title: title,
        problem_platform: '笔记', problem_url: '', difficulty: '',
        tags: createForm.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean),
        user_approach: createForm.content.trim(), error_reasons: '', better_solution: '', notes: '',
      })
      requestVersion.current += 1
      setEntries(current => [created, ...current])
      setShowCreateForm(false)
      setCreateForm({ title: '', content: '', tags: '' })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '保存笔记失败，请稍后重试')
    } finally { setCreateSaving(false) }
  }

  const handleSave = async (entryId: number) => {
    if (!editForm.problem_title.trim()) {
      setErrorMessage('笔记标题不能为空')
      return
    }

    setSaving(true)
    setErrorMessage('')
    try {
      const updated = await updateError(entryId, 1, {
        ...editForm,
        problem_title: editForm.problem_title.trim(),
      })
      requestVersion.current += 1
      setEntries(current => current.map(entry => entry.id === entryId ? updated : entry))
      setEditingId(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '保存笔记失败，请稍后重试')
    } finally { setSaving(false) }
  }

  const handleDelete = async (entryId: number) => {
    setErrorMessage('')
    try {
      await deleteError(entryId, 1)
      requestVersion.current += 1
      setEntries(current => current.filter(entry => entry.id !== entryId))
      setDeleteConfirm(null)
      if (expandedId === entryId) setExpandedId(null)
      if (editingId === entryId) setEditingId(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '删除笔记失败，请稍后重试')
    }
  }

  const handleOpenInEditor = (entry: ErrorNotebookEntry) => {
    openProblemInEditor({
      id: entry.problem_id,
      title: entry.problem_title,
      platform: entry.problem_platform,
      platformName: PLATFORM_LABELS[entry.problem_platform] || entry.problem_platform,
      difficulty: entry.difficulty,
      tags: entry.tags,
      url: entry.problem_url,
    })
  }

  // 收集所有标签
  const allTags = [...new Set(entries.flatMap(e => e.tags || []))].sort()

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <header className="flex items-center gap-3 px-6 py-4 page-header shrink-0">
        <button className="lg:hidden text-ink-muted hover:text-ink" onClick={toggleSidebar}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-ink-strong flex items-center gap-2">
            <AppIcon name="📝" size={19} className="text-primary-400" /> 我的笔记
          </h2>
          <p className="text-xs text-ink-muted">{entries.length} 条笔记 · 记录做题思路、代码笔记与学习感悟</p>
        </div>
        <button onClick={() => { setShowCreateForm(!showCreateForm); setErrorMessage('') }}
          className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5">
          <Plus size={14} /> 新建笔记
        </button>
      </header>

      {errorMessage && (
        <div role="alert" className="mx-6 mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {errorMessage}
        </div>
      )}

      {/* 筛选栏 */}
      <div className="px-6 pt-4 flex flex-wrap gap-2 shrink-0">
        <select value={filter.platform} onChange={e => setFilter(f => ({ ...f, platform: e.target.value }))}
          className="bg-surface-300/50 border border-line/50 rounded-lg px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-primary-500/50">
          <option value="">全部平台</option>
          {PLATFORM_OPTIONS.filter(Boolean).map(p => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
        </select>
        <select value={filter.difficulty} onChange={e => setFilter(f => ({ ...f, difficulty: e.target.value }))}
          className="bg-surface-300/50 border border-line/50 rounded-lg px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-primary-500/50">
          <option value="">全部难度</option>
          <option value="入门">入门</option><option value="简单">简单</option><option value="中等">中等</option><option value="困难">困难</option>
        </select>
        <select value={filter.tag} onChange={e => setFilter(f => ({ ...f, tag: e.target.value }))}
          className="bg-surface-300/50 border border-line/50 rounded-lg px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-primary-500/50">
          <option value="">全部标签</option>
          {allTags.slice(0, 30).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <input value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            placeholder="搜索题目或笔记..." className="w-full bg-surface-300/50 border border-line/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-1 focus:ring-primary-500/50" />
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-subtle" />
        </div>
      </div>

      {/* 新建笔记表单 */}
      {showCreateForm && (
        <div className="px-6 pt-0">
          <div className="card space-y-3 bg-primary-500/5 border-primary-500/20">
            <h4 className="text-sm font-medium text-ink-strong flex items-center gap-2"><FileText size={15} className="text-primary-400" /> 新建文本笔记</h4>
            <input value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
              placeholder="笔记标题" className="w-full bg-surface-300/50 border border-line/50 rounded-lg px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-1 focus:ring-primary-500/50" />
            <textarea value={createForm.content} onChange={e => setCreateForm(f => ({ ...f, content: e.target.value }))}
              placeholder="笔记内容... (可以写下你的学习心得、代码理解、算法思路等)" rows={5}
              className="w-full bg-surface-300/50 border border-line/50 rounded-lg px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-1 focus:ring-primary-500/50 resize-none" />
            <input value={createForm.tags} onChange={e => setCreateForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="标签 (用逗号分隔, 如: 动态规划, 二叉树)" className="w-full bg-surface-300/50 border border-line/50 rounded-lg px-3 py-2 text-xs text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-1 focus:ring-primary-500/50" />
            <div className="flex gap-2">
              <button onClick={handleCreate}
                disabled={!createForm.title.trim() || createSaving}
                className="btn-primary text-xs px-4 py-1.5">{createSaving ? '保存中...' : '保存笔记'}</button>
              <button onClick={() => { setShowCreateForm(false); setErrorMessage('') }} disabled={createSaving}
                className="text-xs text-ink-subtle hover:text-ink disabled:opacity-50">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 列表 */}
      <div className="p-6 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-ink-muted">加载中...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <AppIcon name="📭" size={40} className="mx-auto mb-3 text-ink-subtle" />
            <p className="text-ink-muted">暂无笔记</p>
            <p className="text-xs text-ink-subtle mt-1">点击右上角"新建笔记"撰写学习心得，代码编辑器中的题目也可保存至此</p>
          </div>
        ) : (
          entries.map(entry => (
            <div key={entry.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {canOpenInEditor(entry) ? (
                      <button
                        onClick={() => handleOpenInEditor(entry)}
                        className="text-sm font-semibold text-ink hover:text-primary-300 transition-colors text-left"
                      >
                        {entry.problem_title || '未命名题目'}
                      </button>
                    ) : (
                      <span className="text-sm font-semibold text-ink">{entry.problem_title || '未命名题目'}</span>
                    )}
                    {entry.problem_platform && entry.problem_platform !== '笔记' && (
                      <span className="text-[10px] bg-surface-300/50 text-ink-muted px-1.5 py-0.5 rounded-full border border-line/30">
                        {PLATFORM_LABELS[entry.problem_platform] || entry.problem_platform}
                      </span>
                    )}
                    {entry.problem_platform === '笔记' && (
                      <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded-full border border-blue-500/20 flex items-center gap-0.5">
                        <FileText size={10} /> 文本笔记
                      </span>
                    )}
                    {entry.submission_code && !entry.problem_platform.includes('笔记') && (
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-0.5">
                        <Code size={10} /> 代码笔记
                      </span>
                    )}
                    {entry.difficulty && (
                      <span className="text-[10px] bg-surface-300/50 text-ink-muted px-1.5 py-0.5 rounded-full border border-line/30">
                        {entry.difficulty}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-ink-subtle">
                    {entry.tags?.map((t: string, i: number) => <span key={i}>#{t}</span>)}
                  </div>
                  {/* 笔记摘要 */}
                  {(entry.user_approach || entry.error_reasons || entry.notes) && (
                    <p className="text-xs text-ink-subtle mt-1.5 line-clamp-2">
                      {entry.problem_platform === '笔记'
                        ? entry.user_approach
                        : [entry.user_approach, entry.error_reasons, entry.notes].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <p className="text-[10px] text-ink-subtle mt-1">
                    {entry.updated_at ? new Date(entry.updated_at).toLocaleDateString('zh-CN') : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2 shrink-0">
                  <button onClick={() => { setExpandedId(expandedId === entry.id ? null : entry.id!); setEditingId(null) }}
                    className="text-ink-subtle hover:text-ink p-1" title="展开详情">
                    <AppIcon name={expandedId === entry.id ? '🔼' : '🔽'} size={13} />
                  </button>
                  <button onClick={() => handleEdit(entry)}
                    className="text-ink-subtle hover:text-primary-400 p-1" title="编辑"><PenLine size={13} /></button>
                  <button onClick={() => setDeleteConfirm(entry.id!)}
                    className="text-ink-subtle hover:text-red-400 p-1" title="删除"><Trash2 size={13} /></button>
                </div>
              </div>

              {/* 展开详情 / 编辑 */}
              {(expandedId === entry.id || editingId === entry.id) && (
                <div className="mt-3 pt-3 border-t border-line/30 space-y-2">
                  {editingId === entry.id ? (
                    <>
                      <div><label className="text-[10px] text-ink-subtle mb-1 block">标题</label>
                        <input value={editForm.problem_title} onChange={e => setEditForm(f => ({ ...f, problem_title: e.target.value }))}
                          className="w-full bg-surface-300/50 border border-line/50 rounded-lg px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-primary-500/50" /></div>
                      <div><label className="text-[10px] text-ink-subtle mb-1 block">{entry.problem_platform === '笔记' ? '笔记内容' : '做题思路'}</label>
                        <textarea value={editForm.user_approach} onChange={e => setEditForm(f => ({ ...f, user_approach: e.target.value }))}
                          rows={entry.problem_platform === '笔记' ? 6 : 2} className="w-full bg-surface-300/50 border border-line/50 rounded-lg px-3 py-1.5 text-xs text-ink resize-none focus:outline-none focus:ring-1 focus:ring-primary-500/50" /></div>
                      {entry.problem_platform !== '笔记' && (
                        <>
                          <div><label className="text-[10px] text-ink-subtle mb-1 block">错误原因</label>
                            <textarea value={editForm.error_reasons} onChange={e => setEditForm(f => ({ ...f, error_reasons: e.target.value }))}
                              rows={2} className="w-full bg-surface-300/50 border border-line/50 rounded-lg px-3 py-1.5 text-xs text-ink resize-none focus:outline-none focus:ring-1 focus:ring-primary-500/50" /></div>
                          <div><label className="text-[10px] text-ink-subtle mb-1 block">更优解法</label>
                            <textarea value={editForm.better_solution} onChange={e => setEditForm(f => ({ ...f, better_solution: e.target.value }))}
                              rows={2} className="w-full bg-surface-300/50 border border-line/50 rounded-lg px-3 py-1.5 text-xs text-ink resize-none focus:outline-none focus:ring-1 focus:ring-primary-500/50" /></div>
                          <div><label className="text-[10px] text-ink-subtle mb-1 block">额外笔记</label>
                            <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                              rows={2} className="w-full bg-surface-300/50 border border-line/50 rounded-lg px-3 py-1.5 text-xs text-ink resize-none focus:outline-none focus:ring-1 focus:ring-primary-500/50" /></div>
                        </>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => handleSave(entry.id!)} disabled={saving || !editForm.problem_title.trim()}
                          className="btn-primary text-xs px-3 py-1.5">{saving ? '保存中...' : '保存'}</button>
                        <button onClick={() => { setEditingId(null); setErrorMessage('') }} disabled={saving}
                          className="text-xs text-ink-subtle hover:text-ink disabled:opacity-50">取消</button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2 text-xs text-ink-muted">
                      {entry.problem_platform === '笔记' ? (
                        entry.user_approach && <div className="whitespace-pre-wrap">{entry.user_approach}</div>
                      ) : (
                        <>
                          {entry.user_approach && <div><span className="text-ink-subtle font-medium">做题思路：</span>{entry.user_approach}</div>}
                          {entry.error_reasons && <div><span className="text-ink-subtle font-medium">错误原因：</span>{entry.error_reasons}</div>}
                          {entry.better_solution && <div><span className="text-ink-subtle font-medium">更优解法：</span>{entry.better_solution}</div>}
                          {entry.notes && <div><span className="text-ink-subtle font-medium">笔记：</span>{entry.notes}</div>}
                        </>
                      )}
                      {canOpenInEditor(entry) && (
                        <button onClick={() => handleOpenInEditor(entry)}
                          className="inline-flex items-center gap-1.5 text-primary-400 hover:text-primary-300 text-xs mt-1">
                          <AppIcon name="💻" size={13} /> 在编辑器中打开
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 删除确认 */}
              {deleteConfirm === entry.id && (
                <div className="mt-3 pt-3 border-t border-line/30 flex items-center gap-3">
                  <span className="text-xs text-red-400">确定删除此条笔记？</span>
                  <button onClick={() => handleDelete(entry.id!)} className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500/30">确认</button>
                  <button onClick={() => setDeleteConfirm(null)} className="text-xs text-ink-subtle hover:text-ink">取消</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
