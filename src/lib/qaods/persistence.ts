import { Task, AuditEntry } from './types'

export function saveTasks(tasks: Task[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('qaods_tasks', JSON.stringify(tasks))
  } catch {
    // silently fail
  }
}

export function loadTasks(): Task[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('qaods_tasks')
    if (raw === null) return []
    return JSON.parse(raw) as Task[]
  } catch {
    return []
  }
}

export function saveAudit(log: AuditEntry[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('qaods_audit', JSON.stringify(log))
  } catch {
    // silently fail
  }
}

export function loadAudit(): AuditEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('qaods_audit')
    if (raw === null) return []
    return JSON.parse(raw) as AuditEntry[]
  } catch {
    return []
  }
}