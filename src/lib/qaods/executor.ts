import type { ExecutionContext, ExecutionResult } from './types'
import { logger } from './logger'

/**
 * Executor agent: runs the task execution step.
 */
export async function runExecutor(ctx: ExecutionContext): Promise<ExecutionResult> {
  const { taskId, userId, iterationCount, promptPayload, strategyResult } = ctx
  const agentLogger = logger.setDomain('agent')

  agentLogger.debug('EXECUTOR_START', { taskId, userId, iterationCount })

  const result: ExecutionResult = {
    delta: `// Simulated delta for task ${taskId} (iteration ${iterationCount})`,
    filesChanged: [strategyResult.scopedComponent],
    status: 'success',
  }

  agentLogger.info('EXECUTOR_COMPLETE', {
    taskId,
    userId,
    status: result.status,
    filesChanged: result.filesChanged,
  })

  return result
}
