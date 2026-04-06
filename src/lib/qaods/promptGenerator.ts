import { Task } from './types'

export function generatePrompt(task: Task): string {
  return `In ${task.component} located at ${task.filePath}:
${task.description}
Scope your changes to this file only.
Do not modify any other files.
Do not refactor existing logic.
Make only the delta change described.`
}