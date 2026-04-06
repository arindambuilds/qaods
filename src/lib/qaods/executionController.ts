import { Task } from './types'

/** Max iterations per task (shared by UI, activation rules, and iterate control). */
export const MAX_TASK_ITERATIONS = 2

export function validateTaskActivation(task: Task): { valid: boolean; reason?: string } {
  if (task.status !== 'todo') {
    return { valid: false, reason: 'Task must be in todo status to activate.' }
  }

  if (task.iterationCount >= MAX_TASK_ITERATIONS) {
    return { valid: false, reason: 'Max iterations reached. Mark task done or create a new task.' }
  }

  if (!task.filePath || task.filePath.trim() === '') {
    return { valid: false, reason: 'File path is required.' }
  }

  if (task.filePath.endsWith('/') || task.filePath.endsWith('\\')) {
    return { valid: false, reason: 'File path must point to a file, not a directory.' }
  }

  if (task.filePath.includes('*') || task.filePath.includes('?')) {
    return { valid: false, reason: 'File path must not contain wildcards.' }
  }

  const forbidden = /refactor|rewrite|restructure|entire page/i
  if (forbidden.test(task.description)) {
    return { valid: false, reason: 'Description suggests a full rewrite. Break this into smaller delta tasks.' }
  }

  return { valid: true }
}

export function incrementIteration(task: Task): boolean {
  if (task.iterationCount >= MAX_TASK_ITERATIONS) return false
  return true
}