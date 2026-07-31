const API_BASE = '/api'

export interface ErrorNotebookEntry {
  id?: number
  student_id: number
  problem_id: string
  problem_title: string
  problem_platform: string
  problem_url: string
  difficulty: string
  tags: string[]
  user_approach: string
  error_reasons: string
  better_solution: string
  notes: string
  submission_id?: number | null
  submission_code?: string
  created_at?: string
  updated_at?: string
}

async function parseResponse<T>(resp: Response, fallbackMessage: string): Promise<T> {
  if (!resp.ok) {
    let message = fallbackMessage
    try {
      const body = await resp.json()
      message = body.detail || body.error || message
    } catch {
      // 响应不是 JSON 时使用默认提示
    }
    throw new Error(`${message}（${resp.status}）`)
  }

  if (resp.status === 204) return undefined as T
  return resp.json() as Promise<T>
}

export async function listErrors(
  studentId: number,
  filters: { platform?: string; difficulty?: string; tag?: string } = {}
): Promise<ErrorNotebookEntry[]> {
  const q = new URLSearchParams()
  if (filters.platform) q.set('platform', filters.platform)
  if (filters.difficulty) q.set('difficulty', filters.difficulty)
  if (filters.tag) q.set('tag', filters.tag)
  const query = q.toString()
  const resp = await fetch(`${API_BASE}/error-notebook/${studentId}${query ? `?${query}` : ''}`)
  return parseResponse<ErrorNotebookEntry[]>(resp, '加载笔记失败')
}

export async function saveError(data: ErrorNotebookEntry): Promise<ErrorNotebookEntry> {
  const resp = await fetch(`${API_BASE}/error-notebook/${data.student_id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return parseResponse<ErrorNotebookEntry>(resp, '保存笔记失败')
}

export async function updateError(
  entryId: number, studentId: number, data: Partial<ErrorNotebookEntry>
): Promise<ErrorNotebookEntry> {
  const resp = await fetch(`${API_BASE}/error-notebook/${studentId}/${entryId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return parseResponse<ErrorNotebookEntry>(resp, '更新笔记失败')
}

export async function deleteError(entryId: number, studentId: number): Promise<void> {
  const resp = await fetch(`${API_BASE}/error-notebook/${studentId}/${entryId}`, { method: 'DELETE' })
  await parseResponse<{ ok: boolean }>(resp, '删除笔记失败')
}
