import type { Task, PersistedTask } from './types'
import type { LogEvent } from './logger'
import { migrateTask, CURRENT_SCHEMA_VERSION } from './migrations'

export interface PersistenceAdapter {
  saveTask(task: Task): Promise<void>
  loadTask(userId: string, taskId: string): Promise<PersistedTask | null>
  loadTasksByUser(userId: string): Promise<PersistedTask[]>
  deleteTask(userId: string, taskId: string): Promise<void>
  saveLog(sessionId: string, date: string, events: LogEvent[]): Promise<void>
  loadLogs(sessionId: string, date: string): Promise<LogEvent[]>
}

export class LocalStoragePersistenceAdapter implements PersistenceAdapter {
  async saveTask(task: Task): Promise<void> {
    const key = `qaods:task:${task.userId}:${task.id}`
    const persisted: PersistedTask = { schemaVersion: CURRENT_SCHEMA_VERSION, data: task }
    localStorage.setItem(key, JSON.stringify(persisted))
  }

  async loadTask(userId: string, taskId: string): Promise<PersistedTask | null> {
    const key = `qaods:task:${userId}:${taskId}`
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { schemaVersion?: number; data?: unknown }
    const task = migrateTask(parsed as Record<string, unknown>)
    return { schemaVersion: CURRENT_SCHEMA_VERSION, data: task }
  }

  async loadTasksByUser(userId: string): Promise<PersistedTask[]> {
    const prefix = `qaods:task:${userId}:`
    const results: PersistedTask[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(prefix)) {
        const raw = localStorage.getItem(key)
        if (raw) {
          const task = migrateTask(JSON.parse(raw) as Record<string, unknown>)
          results.push({ schemaVersion: CURRENT_SCHEMA_VERSION, data: task })
        }
      }
    }
    return results
  }

  async deleteTask(userId: string, taskId: string): Promise<void> {
    localStorage.removeItem(`qaods:task:${userId}:${taskId}`)
  }

  async saveLog(sessionId: string, date: string, events: LogEvent[]): Promise<void> {
    localStorage.setItem(`qaods:log:${sessionId}:${date}`, JSON.stringify(events))
  }

  async loadLogs(sessionId: string, date: string): Promise<LogEvent[]> {
    const raw = localStorage.getItem(`qaods:log:${sessionId}:${date}`)
    return raw ? (JSON.parse(raw) as LogEvent[]) : []
  }
}

export const persistenceAdapter: PersistenceAdapter = new LocalStoragePersistenceAdapter()
