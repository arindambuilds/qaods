import { AuditEntry } from './types'

const auditLog: AuditEntry[] = []

export function logAction(taskId: string, action: string, note?: string): void {
  const entry: AuditEntry = {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
    taskId,
    action,
    timestamp: new Date().toISOString(),
    note: note ?? '',
  }
  auditLog.push(entry)
}

export function getAuditLog(): AuditEntry[] {
  return auditLog
}

export function getLogByTaskId(taskId: string): AuditEntry[] {
  return auditLog.filter(entry => entry.taskId === taskId)
}