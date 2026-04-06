import { Task, TaskStatus } from './types'

const tasks: Task[] = []

export function getTasks(): Task[] {
  return tasks
}

export function getTaskById(id: string): Task | undefined {
  return tasks.find(task => task.id === id)
}

export function createTask(
  input: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'iterationCount'>
): Task {
  const newTask: Task = {
    ...input,
    id: Date.now().toString(),
    iterationCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  tasks.push(newTask)
  return newTask
}

export function updateTask(id: string, partial: Partial<Task>): Task | undefined {
  const task = tasks.find(t => t.id === id)
  if (!task) return undefined
  Object.assign(task, partial, { updatedAt: new Date().toISOString() })
  return task
}

export function deleteTask(id: string): void {
  const index = tasks.findIndex(t => t.id === id)
  if (index !== -1) tasks.splice(index, 1)
}