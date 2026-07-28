import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../stores/useStore'
import { AppIcon } from '../components/Icon'
import { listErrors, updateError, deleteError, type ErrorNotebookEntry } from '../services/errorNotebookService'
import { PenLine, Trash2, ExternalLink, Search, X, Plus, Bookmark, Code, FileText, Lightbulb } from 'lucide-react'
import { saveError } from '../services/errorNotebookService'

const PLATFORM_OPTIONS = ['', 'luogu', 'leetcode', 'nowcoder']
const PLATFORM_LABELS: Record<string, string> = { luogu: '洛谷', leetcode: '力扣', nowcoder: '牛客' }

export default function ErrorNotebookPage() {
  const { toggleSidebar } = useStore()
  const [entries, setEntries] = useState<ErrorNotebookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ platform: '', difficulty: '', tag: '', search: '' })
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ user_approach: '', error_reasons: '', better_solution: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({ title: '', content: '', tags: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listErrors(1, { platform: filter.platform || undefined, difficulty: filter.difficulty || undefined, tag: filter.tag || undefined })
      let result = data
      if (filter.search) {
        const s = filter.search.toLowerCase()
        result = result.filter(e => e.problem_title.toLowerCase().includes(s) || e.notes?.toLowerCase().includes(s) || e.user_approach?.toLowerCase().includes(s))
      }
      setEntries(result)
    } catch { setEntries([]) }
    finally { setLoading(false) }
  }, [filter])

  useEffect(() => { load() }, [load])

  const handleEdit = (entry: ErrorNotebookEntry) => {
    setEditingId(entry.id!)
    setEditForm({ user_approach: entry.user_approach || '', error_reasons: entry.error_reasons || '', better_solution: entry.better_solution || '', notes: entry.notes || '' })
  }

  const handleSave = async (entryId: number) => {
    setSaving(true)
    try {
      await updateError(entryId, 1, editForm)
      setEditingId(null)
      load()
    } catch { alert('保存失败') }
    finally { setSaving(false) }
  }

  const handleDelete = async (entryId: number) => {
    try {
      await deleteError(entryId, 1)
      setDeleteConfirm(null)
      if (expandedId === entryId) setExpandedId(null)
      if (editingId === entryId) setEditingId(null)
      load()
    } catch { alert('删除失败') }
  }

  const handleOpenInEditor = (entry: ErrorNotebookEntry) => {
    sessionStorage.setItem('__EDITOR_PROBLEM', JSON.stringify({
      p: {
        id: entry.problem_id, title: entry.problem_title,
        platform: entry.problem_platform, platform_name: PLATFORM_LABELS[entry.problem_platform] || '',
        difficulty: entry.difficulty, tags: entry.tags, url: entry.problem_url,
      },
      ts: Date.now(),
    }))
    useStore.getState().setActiveTab('editor')
  }

  // 收集所有标签
  const allTags = [...new Set(entries.flatMap(e => e.tags || []))].sort()

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <header className="flex items-center gap-3 px-6 py-4 bg-surface-100/80 backdrop-blur-xl border-b border-gray-700/30 shrink-0">
        <button className="lg:hidden text-gray-400 hover:text-gray-200" onClick={toggleSidebar}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <AppIcon name="📓" size={19} className="text-primary-400" /> 我的笔记
          </h2>
          <p className="text-xs text-gray-400">{entries.length} 条笔记 · 记录做题思路、代码笔记与学习感悟</p>
        </div>
        <button onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5">
          <Plus size={14} /> 新建笔记
        </button>
      </header>

      {/* 筛选栏 */}
      <div className="px-6 pt-4 flex flex-wrap gap-2 shrink-0">
        <select value={filter.platform} onChange={e => setFilter(f => ({ ...f, platform: e.target.value }))}
          className="bg-surface-300/50 border border-gray-600/50 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500/50">
          <option value="">全部平台</option>
          {PLATFORM_OPTIONS.filter(Boolean).map(p => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
        </select>
        <select value={filter.difficulty} onChange={e => setFilter(f => ({ ...f, difficulty: e.target.value }))}
          className="bg-surface-300/50 border border-gray-600/50 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500/50">
          <option value="">全部难度</option>
          <option value="入门">入门</option><option value="简单">简单</option><option value="中等">中等</option><option value="困难">困难</option>
        </select>
        <select value={filter.tag} onChange={e => setFilter(f => ({ ...f, tag: e.target.value }))}
          className="bg-surface-300/50 border border-gray-600/50 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500/50">
          <option value="">全部标签</option>
          {allTags.slice(0, 30).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <input value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            placeholder="搜索题目或笔记..." className="w-full bg-surface-300/50 border border-gray-600/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50" />
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
        </div>
      </div>

      {/* 新建笔记表单 */}
      {showCreateForm && (
        <div className="px-6 pt-0">
          <div className="card space-y-3 bg-primary-500/5 border-primary-500/20">
            <h4 className="text-sm font-medium text-white flex items-center gap-2"><FileText size={15} className="text-primary-400" /> 新建文本笔记</h4>
            <input value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
              placeholder="笔记标题" className="w-full bg-surface-300/50 border border-gray-600/50 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50" />
            <textarea value={createForm.content} onChange={e => setCreateForm(f => ({ ...f, content: e.target.value }))}
              placeholder="笔记内容... (可以写下你的学习心得、代码理解、算法思路等)" rows={5}
              className="w-full bg-surface-300/50 border border-gray-600/50 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50 resize-none" />
            <input value={createForm.tags} onChange={e => setCreateForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="标签 (用逗号分隔, 如: 动态规划, 二叉树)" className="w-full bg-surface-300/50 border border-gray-600/50 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50" />
            <div className="flex gap-2">
              <button onClick={async () => {
                if (!createForm.title.trim()) return
                await saveError({
                  student_id: 1, problem_id: '', problem_title: createForm.title,
                  problem_platform: '笔记', problem_url: '', difficulty: '',
                  tags: createForm.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean),
                  user_approach: createForm.content, error_reasons: '', better_solution: '', notes: 'text_note',
                })
                setShowCreateForm(false); setCreateForm({ title: '', content: '', tags: '' }); load()
              }}
                disabled={!createForm.title.trim()}
                className="btn-primary text-xs px-4 py-1.5">保存笔记</button>
              <button onClick={() => setShowCreateForm(false)} className="text-xs text-gray-500 hover:text-gray-300">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 列表 */}
      <div className="p-6 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400">加载中...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <AppIcon name="📭" size={40} className="mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">暂无笔记</p>
            <p className="text-xs text-gray-500 mt-1">点击右上角"新建笔记"撰写学习心得，代码编辑器中的题目也可保存至此</p>
          </div>
        ) : (
          entries.map(entry => (
            <div key={entry.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleOpenInEditor(entry)}
                      className="text-sm font-semibold text-gray-200 hover:text-primary-300 transition-colors text-left"
                    >
                      {entry.problem_title || '未命名题目'}
                    </button>
                    {entry.problem_platform && entry.problem_platform !== '笔记' && (
                      <span className="text-[10px] bg-surface-300/50 text-gray-400 px-1.5 py-0.5 rounded-full border border-gray-700/30">
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
                      <span className="text-[10px] bg-surface-300/50 text-gray-400 px-1.5 py-0.5 rounded-full border border-gray-700/30">
                        {entry.difficulty}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                    {entry.tags?.map((t: string, i: number) => <span key={i}>#{t}</span>)}
                  </div>
                  {/* 笔记摘要 */}
                  {(entry.user_approach || entry.error_reasons || entry.notes) && (
                    <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">
                      {[entry.user_approach, entry.error_reasons, entry.notes].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-600 mt-1">
                    {entry.updated_at ? new Date(entry.updated_at).toLocaleDateString('zh-CN') : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2 shrink-0">
                  <button onClick={() => { setExpandedId(expandedId === entry.id ? null : entry.id!); setEditingId(null) }}
                    className="text-gray-500 hover:text-gray-300 p-1" title="展开详情">
                    <AppIcon name={expandedId === entry.id ? '🔼' : '🔽'} size={13} />
                  </button>
                  <button onClick={() => handleEdit(entry)}
                    className="text-gray-500 hover:text-primary-400 p-1" title="编辑"><PenLine size={13} /></button>
                  <button onClick={() => setDeleteConfirm(entry.id!)}
                    className="text-gray-500 hover:text-red-400 p-1" title="删除"><Trash2 size={13} /></button>
                </div>
              </div>

              {/* 展开详情 / 编辑 */}
              {(expandedId === entry.id || editingId === entry.id) && (
                <div className="mt-3 pt-3 border-t border-gray-700/30 space-y-2">
                  {editingId === entry.id ? (
                    <>
                      <div><label className="text-[10px] text-gray-500 mb-1 block">做题思路</label>
                        <textarea value={editForm.user_approach} onChange={e => setEditForm(f => ({ ...f, user_approach: e.target.value }))}
                          rows={2} className="w-full bg-surface-300/50 border border-gray-600/50 rounded-lg px-3 py-1.5 text-xs text-gray-200 resize-none focus:outline-none focus:ring-1 focus:ring-primary-500/50" /></div>
                      <div><label className="text-[10px] text-gray-500 mb-1 block">错误原因</label>
                        <textarea value={editForm.error_reasons} onChange={e => setEditForm(f => ({ ...f, error_reasons: e.target.value }))}
                          rows={2} className="w-full bg-surface-300/50 border border-gray-600/50 rounded-lg px-3 py-1.5 text-xs text-gray-200 resize-none focus:outline-none focus:ring-1 focus:ring-primary-500/50" /></div>
                      <div><label className="text-[10px] text-gray-500 mb-1 block">更优解法</label>
                        <textarea value={editForm.better_solution} onChange={e => setEditForm(f => ({ ...f, better_solution: e.target.value }))}
                          rows={2} className="w-full bg-surface-300/50 border border-gray-600/50 rounded-lg px-3 py-1.5 text-xs text-gray-200 resize-none focus:outline-none focus:ring-1 focus:ring-primary-500/50" /></div>
                      <div><label className="text-[10px] text-gray-500 mb-1 block">额外笔记</label>
                        <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                          rows={2} className="w-full bg-surface-300/50 border border-gray-600/50 rounded-lg px-3 py-1.5 text-xs text-gray-200 resize-none focus:outline-none focus:ring-1 focus:ring-primary-500/50" /></div>
                      <div className="flex gap-2">
                        <button onClick={() => handleSave(entry.id!)} disabled={saving}
                          className="btn-primary text-xs px-3 py-1.5">{saving ? '保存中...' : '保存'}</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-gray-300">取消</button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2 text-xs text-gray-400">
                      {entry.user_approach && <div><span className="text-gray-500 font-medium">做题思路：</span>{entry.user_approach}</div>}
                      {entry.error_reasons && <div><span className="text-gray-500 font-medium">错误原因：</span>{entry.error_reasons}</div>}
                      {entry.better_solution && <div><span className="text-gray-500 font-medium">更优解法：</span>{entry.better_solution}</div>}
                      {entry.notes && <div><span className="text-gray-500 font-medium">笔记：</span>{entry.notes}</div>}
                      <button onClick={() => handleOpenInEditor(entry)}
                        className="inline-flex items-center gap-1.5 text-primary-400 hover:text-primary-300 text-xs mt-1">
                        <AppIcon name="💻" size={13} /> 在编辑器中打开
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 删除确认 */}
              {deleteConfirm === entry.id && (
                <div className="mt-3 pt-3 border-t border-gray-700/30 flex items-center gap-3">
                  <span className="text-xs text-red-400">确定删除此条笔记？</span>
                  <button onClick={() => handleDelete(entry.id!)} className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500/30">确认</button>
                  <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-500 hover:text-gray-300">取消</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
