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
  possible_cause?: string
}

export async function runCode(req: CodeRunRequest): Promise<CodeRunResult> {
  const resp = await fetch(`${API_BASE}/code/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!resp.ok) {
    const err: unknown = await resp.json().catch(() => null)
    throw new Error(errorMessage(err) || '执行失败')
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

export type RunTestsResult = {
  status: 'compile_error'
  compile_output: string
  results: TestResult[]
  passed?: number
  total?: number
  all_pass?: false
} | {
  status: 'completed'
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
    const err: unknown = await resp.json().catch(() => null)
    throw new Error(errorMessage(err) || '执行失败')
  }
  return resp.json()
}

export interface ProblemSample {
  input: string
  output: string
}

export interface ProblemStatementSection {
  title: string
  content: string
}

export interface ProblemDetail {
  title?: string
  description: string
  input: string
  output: string
  sections: ProblemStatementSection[]
  limits: {
    time?: string
    memory?: string
  }
  difficulty?: string
  samples: ProblemSample[]
  hints: string[]
  url?: string
  source?: string
  detailStatus?: string
  warning?: string
  error?: string
}

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : null
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
}

function firstText(record: UnknownRecord | null, ...keys: string[]): string {
  if (!record) return ''
  for (const key of keys) {
    const value = text(record[key])
    if (value) return value
  }
  return ''
}

function errorMessage(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  const record = asRecord(value)
  if (!record) return ''
  for (const key of ['error', 'message', 'detail']) {
    const candidate = record[key]
    const direct = text(candidate)
    if (direct) return direct
    const nested = asRecord(candidate)
    if (nested) {
      const message = firstText(nested, 'message', 'error', 'detail')
      if (message) return message
    }
  }
  return ''
}

function sampleText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).replace(/\r\n?/g, '\n')
    : ''
}

function firstSampleText(record: UnknownRecord | null, ...keys: string[]): string {
  if (!record) return ''
  for (const key of keys) {
    const value = sampleText(record[key])
    if (value) return value
  }
  return ''
}

export function normalizeProblemSamples(value: unknown): ProblemSample[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value.flatMap(sample => {
    const record = asRecord(sample)
    const input = Array.isArray(sample)
      ? sampleText(sample[0])
      : firstSampleText(record, 'input', 'stdin', 'sample_input', 'sampleInput', 'input_data', 'inputData')
    const output = Array.isArray(sample)
      ? sampleText(sample[1])
      : firstSampleText(record, 'output', 'expected', 'sample_output', 'sampleOutput', 'expected_output', 'expectedOutput', 'output_data', 'outputData')
    if (!input && !output) return []
    const key = JSON.stringify([input, output])
    if (seen.has(key)) return []
    seen.add(key)
    return [{ input, output }]
  })
}

function normalizeHints(value: unknown): string[] {
  const values = Array.isArray(value) ? value : text(value) ? [value] : []
  return values.map(text).filter(Boolean)
}

function normalizeSections(value: unknown): ProblemStatementSection[] {
  if (Array.isArray(value)) {
    return value.flatMap((section, index) => {
      const record = asRecord(section)
      if (!record) return []
      const content = firstText(record, 'content', 'description', 'text', 'body')
      if (!content) return []
      return [{ title: firstText(record, 'title', 'name', 'label') || `补充说明 ${index + 1}`, content }]
    })
  }

  const record = asRecord(value)
  if (!record) return []
  return Object.entries(record).flatMap(([title, content]) => {
    const normalized = text(content)
    return normalized ? [{ title, content: normalized }] : []
  })
}

function normalizeProblemDetail(value: unknown): ProblemDetail {
  const root = asRecord(value)
  if (!root) throw new Error('题目详情响应格式无效')

  const nestedDetail = asRecord(root.detail)
  const payload = asRecord(root.data) ?? nestedDetail ?? root
  const statementValue = payload.statement ?? payload.problem_statement ?? payload.problemStatement
  const statement = asRecord(statementValue)
  const limits = asRecord(payload.limits)

  const description = firstText(statement, 'description', 'content', 'body')
    || firstText(payload, 'description', 'content', 'problem_description', 'problemDescription')
    || (typeof statementValue === 'string' ? statementValue.trim() : '')
  const input = firstText(statement, 'input', 'input_description', 'input_format', 'inputDescription', 'inputFormat')
    || firstText(payload, 'input_description', 'input_format', 'inputDescription', 'inputFormat')
  const output = firstText(statement, 'output', 'output_description', 'output_format', 'outputDescription', 'outputFormat')
    || firstText(payload, 'output_description', 'output_format', 'outputDescription', 'outputFormat')
  const samples = normalizeProblemSamples(payload.samples ?? payload.examples ?? statement?.samples)
  const hints = normalizeHints(payload.hints ?? payload.hint ?? statement?.hints)
  const sections = normalizeSections(payload.sections ?? statement?.sections)
  const existingSectionTitles = new Set(sections.map(section => section.title.trim().toLowerCase()))
  const appendSection = (title: string, content: string) => {
    if (content && !existingSectionTitles.has(title.toLowerCase())) {
      sections.push({ title, content })
      existingSectionTitles.add(title.toLowerCase())
    }
  }
  appendSection('数据范围与约束', firstText(statement, 'constraints', 'constraint') || firstText(payload, 'constraints', 'constraint'))
  appendSection('备注', firstText(statement, 'notes', 'note') || firstText(payload, 'notes', 'note'))
  const error = firstText(payload, 'error')
    || (payload === root ? '' : firstText(root, 'error'))
    || (!description && !input && !output && samples.length === 0 ? errorMessage(root.detail) : '')

  return {
    title: firstText(payload, 'title', 'name') || undefined,
    description,
    input,
    output,
    sections,
    limits: {
      time: firstText(limits, 'time', 'time_limit', 'timeLimit') || firstText(payload, 'time_limit', 'timeLimit') || undefined,
      memory: firstText(limits, 'memory', 'space', 'memory_limit', 'space_limit', 'memoryLimit', 'spaceLimit')
        || firstText(payload, 'memory_limit', 'space_limit', 'memoryLimit', 'spaceLimit') || undefined,
    },
    difficulty: firstText(payload, 'difficulty') || undefined,
    samples,
    hints,
    url: firstText(payload, 'url', 'problem_url', 'problemUrl') || undefined,
    source: firstText(payload, 'source') || undefined,
    detailStatus: firstText(payload, 'detail_status', 'detailStatus') || undefined,
    warning: firstText(payload, 'warning') || undefined,
    error: error || undefined,
  }
}

export async function fetchProblemDetail(
  platform: string,
  pid: string,
  url?: string,
  signal?: AbortSignal,
): Promise<ProblemDetail> {
  const params = new URLSearchParams({ platform, pid, url: url || '' })
  const resp = await fetch(`${API_BASE}/code/problem-detail?${params}`, { signal })
  const body: unknown = await resp.json().catch(() => null)
  if (!resp.ok) {
    throw new Error(errorMessage(body) || `题目详情加载失败 (HTTP ${resp.status})`)
  }
  return normalizeProblemDetail(body)
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
