import { useStore } from '../stores/useStore'
import { normalizeProblem, type ProblemSummary } from '../types/problem'

const EDITOR_ASSIGNMENT_KEY = 'algoascend:editor-assignment'
const LEGACY_EDITOR_HANDOFF_KEYS = ['algoascend:editor-handoff', '__EDITOR_PROBLEM']
const EDITOR_ASSIGNMENT_VERSION = 2

interface StoredEditorAssignment {
  version: typeof EDITOR_ASSIGNMENT_VERSION
  problem: ProblemSummary
}

function parseAssignment(value: unknown): StoredEditorAssignment | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const problem = normalizeProblem(record.problem ?? record.p ?? value)
  if (!problem) return null
  return { version: EDITOR_ASSIGNMENT_VERSION, problem }
}

function persistAssignment(problem: ProblemSummary): void {
  try {
    const stored: StoredEditorAssignment = { version: EDITOR_ASSIGNMENT_VERSION, problem }
    localStorage.setItem(EDITOR_ASSIGNMENT_KEY, JSON.stringify(stored))
    sessionStorage.removeItem(EDITOR_ASSIGNMENT_KEY)
    for (const key of LEGACY_EDITOR_HANDOFF_KEYS) sessionStorage.removeItem(key)
  } catch { /* browser storage is optional */ }
}

/** Load the durable current assignment, migrating old tab-scoped handoff values. */
export function loadEditorHandoff(): ProblemSummary | null {
  try {
    const currentRaw = localStorage.getItem(EDITOR_ASSIGNMENT_KEY)
    if (currentRaw) {
      const current = parseAssignment(JSON.parse(currentRaw))
      if (current) return current.problem
      localStorage.removeItem(EDITOR_ASSIGNMENT_KEY)
    }

    for (const key of [EDITOR_ASSIGNMENT_KEY, ...LEGACY_EDITOR_HANDOFF_KEYS]) {
      const legacyRaw = sessionStorage.getItem(key)
      if (!legacyRaw) continue
      const migrated = parseAssignment(JSON.parse(legacyRaw))
      sessionStorage.removeItem(key)
      if (!migrated) continue
      persistAssignment(migrated.problem)
      return migrated.problem
    }
    return null
  } catch {
    return null
  }
}

/** Replace the durable current assignment and navigate to the editor. */
export function openProblemInEditor(value: unknown): boolean {
  const problem = normalizeProblem(value)
  if (!problem) return false

  persistAssignment(problem)
  useStore.getState().setPendingProblem(problem)
  useStore.getState().setActiveTab('editor')
  return true
}

export function clearEditorHandoff(): void {
  useStore.getState().setPendingProblem(null)
  try {
    localStorage.removeItem(EDITOR_ASSIGNMENT_KEY)
    sessionStorage.removeItem(EDITOR_ASSIGNMENT_KEY)
    for (const key of LEGACY_EDITOR_HANDOFF_KEYS) sessionStorage.removeItem(key)
  } catch { /* browser storage is optional */ }
}
