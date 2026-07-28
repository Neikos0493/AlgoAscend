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

export async function listErrors(
  studentId: number,
  filters: { platform?: string; difficulty?: string; tag?: string } = {}
): Promise<ErrorNotebookEntry[]> {
  const q = new URLSearchParams()
  if (filters.platform) q.set('platform', filters.platform)
  if (filters.difficulty) q.set('difficulty', filters.difficulty)
  if (filters.tag) q.set('tag', filters.tag)
  const resp = await fetch(`${API_BASE}/error-notebook/${studentId}?${q}`)
  return resp.json()
}

export async function saveError(data: ErrorNotebookEntry): Promise<ErrorNotebookEntry> {
  const resp = await fetch(`${API_BASE}/error-notebook/${data.student_id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!resp.ok) throw new Error('保存失败')
  return resp.json()
}

export async function updateError(
  entryId: number, studentId: number, data: Partial<ErrorNotebookEntry>
): Promise<ErrorNotebookEntry> {
  const resp = await fetch(`${API_BASE}/error-notebook/${studentId}/${entryId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!resp.ok) throw new Error('更新失败')
  return resp.json()
}

export async function deleteError(entryId: number, studentId: number): Promise<void> {
  await fetch(`${API_BASE}/error-notebook/${studentId}/${entryId}`, { method: 'DELETE' })
}
