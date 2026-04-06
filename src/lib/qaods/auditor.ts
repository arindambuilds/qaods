import type { ExecutionResult, Task, AuditResult } from './types'
import { logger } from './logger'

export const HSCC_THRESHOLD = 85

const agentLogger = logger.setDomain('agent')

export async function runAuditor(result: ExecutionResult, task: Task): Promise<AuditResult> {
  agentLogger.debug('AUDITOR_START', { taskId: task.id, status: result.status })

  // Simulated scoring — replace with real AI audit logic
  const correctness = result.status === 'success' ? 90 : result.status === 'partial' ? 60 : 30
  const completeness = result.filesChanged.length > 0 ? 85 : 50
  const scopeAdherence = result.delta.length > 0 ? 88 : 40

  const score = Math.round((correctness + completeness + scopeAdherence) / 3)
  const passed = score >= HSCC_THRESHOLD

  const reasons: string[] = []
  if (correctness < HSCC_THRESHOLD) reasons.push(`Correctness below threshold: ${correctness}`)
  if (completeness < HSCC_THRESHOLD) reasons.push(`Completeness below threshold: ${completeness}`)
  if (scopeAdherence < HSCC_THRESHOLD) reasons.push(`Scope adherence below threshold: ${scopeAdherence}`)

  const auditResult: AuditResult = {
    score,
    passed,
    breakdown: { correctness, completeness, scopeAdherence, reasons },
  }

  agentLogger.info('AUDITOR_COMPLETE', { taskId: task.id, score, passed })

  return auditResult
}
