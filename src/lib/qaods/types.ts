export type TaskStatus = 'todo' | 'active' | 'done' | 'blocked'

export interface Task {
  id: string
  title: string
  component: string
  filePath: string
  description: string
  status: TaskStatus
  iterationCount: number
  createdAt: string
  updatedAt: string
}

export interface AuditEntry {
  id: string
  taskId: string
  action: string
  timestamp: string
  note: string
}