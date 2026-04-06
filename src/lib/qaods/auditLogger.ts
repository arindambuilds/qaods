import type { AuditEntry, AuditEventType } from './types'

export interface AuditLogger {
  append(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void
  getAll(): readonly AuditEntry[]
  getByTaskId(taskId: string): readonly AuditEntry[]
}

class LocalStorageAuditLogger implements AuditLogger {
  private entries: AuditEntry[] = []

  append(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void {
    const full: AuditEntry = {
      ...entry,
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      timestamp: new Date().toISOString(),
    }
    this.entries.push(full)

    if (typeof window !== 'undefined') {
      const key = `qaods:audit:${entry.taskId}`
      const existing = JSON.parse(localStorage.getItem(key) ?? '[]') as AuditEntry[]
      existing.push(full)
      localStorage.setItem(key, JSON.stringify(existing))
    }
  }

  getAll(): readonly AuditEntry[] {
    return this.entries
  }

  getByTaskId(taskId: string): readonly AuditEntry[] {
    return this.entries.filter(e => e.taskId === taskId)
  }
}

export const auditLogger: AuditLogger = new LocalStorageAuditLogger()
