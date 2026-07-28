const API_BASE = '/api'

export interface CodeRunRequest {
  code: string
  stdin?: string
  student_id?: number
  problem_id?: string
  problem_title?: string
  problem_platform?: string
  problem_difficulty?: string
  problem_tags?: string[]
  timeout_ms?: number
  memory_limit_kb?: number
}

export interface CodeRunResult {
  status: string
  stdout: string
  stderr: string
  compile_output: string
  runtime_ms: number
  memory_kb: number
  submission_id: number
}

export async function runCode(req: CodeRunRequest): Promise<CodeRunResult> {
  const resp = await fetch(`${API_BASE}/code/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: '执行失败' }))
    throw new Error(err.detail || '执行失败')
  }
  return resp.json()
}

export interface TestCase {
  stdin: string
  expected: string
}

export interface TestResult {
  index: number
  stdin: string
  expected: string
  actual: string
  stderr: string
  passed: boolean | null
  runtime_ms: number
}

export interface RunTestsResult {
  status: string
  passed: number
  total: number
  all_pass: boolean
  compile_output?: string
  results: TestResult[]
}

export async function runTests(req: {
  code: string; test_cases: TestCase[]; student_id?: number
  problem_id?: string; problem_title?: string; timeout_ms?: number
}): Promise<RunTestsResult> {
  const resp = await fetch(`${API_BASE}/code/run-tests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: '执行失败' }))
    throw new Error(err.detail || '执行失败')
  }
  return resp.json()
}

export interface ProblemDetail {
  title: string
  description: string
  difficulty?: string
  samples?: { input: string; output: string }[]
  hints?: string[]
  url?: string
  error?: string
}

export async function fetchProblemDetail(platform: string, pid: string, url?: string): Promise<ProblemDetail> {
  const params = new URLSearchParams({ platform, pid, url: url || '' })
  const resp = await fetch(`${API_BASE}/code/problem-detail?${params}`)
  return resp.json()
}

export async function checkCompiler(): Promise<{ available: boolean; version?: string; message?: string }> {
  const resp = await fetch(`${API_BASE}/code/g++-check`)
  return resp.json()
}

export async function generateAISummary(data: Record<string, any>): Promise<{ summary: string }> {
  const resp = await fetch(`${API_BASE}/code/ai-summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return resp.json()
}
