import { Task, StrategyResult } from './types'
import { ValidationError } from './errors'
import { logger } from './logger'

const agentLogger = logger.setDomain('agent')

/**
 * Strategist agent: validates the task and produces a scoped execution plan.
 */
export async function runStrategist(task: Task): Promise<StrategyResult> {
  agentLogger.info('STRATEGIST_START', { taskId: task.id, component: task.component })

  if (!task.filePath) {
    throw new ValidationError('task.filePath is required and cannot be empty')
  }
  if (!task.description.trim()) {
    throw new ValidationError('task.description is required and cannot be empty')
  }

  const scopedComponent = task.component?.trim() || 'UnknownComponent'

  const executionPlan = [
    `Component: ${scopedComponent}`,
    `File: ${task.filePath}`,
    `Priority: ${task.priority}`,
    `Description: ${task.description}`,
  ].join('\n')

  const result: StrategyResult = { validationStatus: 'valid', scopedComponent, executionPlan }

  agentLogger.info('STRATEGIST_COMPLETE', {
    scopedComponent,
    planChars: executionPlan.length,
  })

  return result
}
