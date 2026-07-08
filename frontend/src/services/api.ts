const API_BASE = '/api'

export async function sendMessage(
  message: string,
  studentId: number = 1,
  onChunk: (data: any) => void,
  onDone: () => void,
  onError: (error: string) => void,
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, student_id: studentId, stream: true }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('不支持流式读取')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6)
          try {
            const data = JSON.parse(dataStr)
            if (data.type === 'done') {
              onDone()
              return
            }
            if (data.type === 'error') {
              onError(data.content)
              return
            }
            onChunk(data)
          } catch {
            // 跳过解析失败的行
          }
        }
      }
    }

    onDone()
  } catch (err: any) {
    onError(err.message || '网络请求失败')
  }
}

export async function fetchDashboard(studentId: number = 1) {
  const resp = await fetch(`${API_BASE}/dashboard/${studentId}`)
  return resp.json()
}

export async function fetchProfile(studentId: number = 1) {
  const resp = await fetch(`${API_BASE}/profile/${studentId}`)
  return resp.json()
}

export async function fetchResources(studentId: number = 1) {
  const resp = await fetch(`${API_BASE}/resources/${studentId}`)
  return resp.json()
}

export async function fetchHistory(studentId: number = 1, limit: number = 50) {
  const resp = await fetch(`${API_BASE}/chat/history/${studentId}?limit=${limit}`)
  return resp.json()
}

export async function clearHistory(studentId: number = 1) {
  const resp = await fetch(`${API_BASE}/chat/history/${studentId}`, { method: 'DELETE' })
  return resp.json()
}

export async function updateStudent(studentId: number, data: { name?: string; major?: string; grade?: string }) {
  const params = new URLSearchParams()
  if (data.name) params.set('name', data.name)
  if (data.major) params.set('major', data.major)
  if (data.grade) params.set('grade', data.grade)

  const resp = await fetch(`${API_BASE}/profile/${studentId}?${params.toString()}`, { method: 'PUT' })
  return resp.json()
}
