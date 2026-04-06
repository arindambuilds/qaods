import type { QAODSContext, StrategyResult, PromptBudget, PromptPayload } from './types'
import { logger } from './logger'

const agentLogger = logger.setDomain('agent')

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars - 3) + '...'
}

export async function generatePrompt(
  ctx: Pick<QAODSContext, 'task' | 'iterationCount' | 'auditResult'>,
  strategy: StrategyResult,
  budget: PromptBudget
): Promise<PromptPayload> {
  const { task, iterationCount, auditResult } = ctx

  agentLogger.debug('RESEARCHER_START', { taskId: task?.id, iterationCount })

  const tagLine = task?.tags?.trim() ? `Tags: ${task.tags.trim()}\n` : ''

  // Build system prompt
  let systemPromptParts = [
    `Component: ${task?.component ?? ''} at ${task?.filePath ?? ''}`,
    `Priority: ${task?.priority ?? ''}`,
    `${tagLine}Execution Plan: ${strategy.executionPlan}`,
  ]

  // On iterations, include only breakdown.reasons from previous audit
  if (auditResult) {
    const reasons = auditResult.breakdown.reasons
    if (reasons.length > 0) {
      systemPromptParts.push(`Previous audit feedback:\n${reasons.map(r => `- ${r}`).join('\n')}`)
    }
  }

  const rawSystemPrompt = systemPromptParts.join('\n')

  // Build user prompt
  const rawUserPrompt = task?.description ?? ''

  // Build constraints (limited to budget.maxConstraints)
  const allConstraints = [
    'Scope your changes to this file only.',
    'Do not modify any other files.',
    'Do not refactor existing logic.',
    'Make only the delta change described.',
  ]
  const constraints = allConstraints.slice(0, budget.maxConstraints)

  // Enforce token budgets via character truncation
  const systemPrompt = truncate(rawSystemPrompt, budget.maxSystemTokens)
  const userPrompt = truncate(rawUserPrompt, budget.maxUserTokens)

  agentLogger.info('RESEARCHER_COMPLETE', {
    taskId: task?.id,
    iterationCount,
    systemPromptChars: systemPrompt.length,
    userPromptChars: userPrompt.length,
    constraintCount: constraints.length,
    isIteration: !!auditResult,
  })

  return { systemPrompt, userPrompt, constraints }
}
