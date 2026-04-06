/**
 * auditorCriticalDoc.ts
 *
 * Auditor agent for the Critical Document pipeline.
 * Pure function — no React, no browser APIs, no LLM.
 *
 * Scoring model (four weighted dimensions):
 *
 *   Completeness   — required fields filled (driven by required_fields rule)
 *   Format         — field values match expected patterns/formats
 *   Consistency    — cross-field logical rules (category/cert, class/stream)
 *   Doc-type       — declarations specific to this doc type (photo, signature)
 *
 * Each Rule carries a weight (0–1). The score is:
 *
 *   score = 100 × Σ( weight_i × (1 if rule_i produces zero errors else 0) )
 *
 * Warnings do not reduce the score but are surfaced in issues[].
 * passed = score >= DOC_AUDIT_THRESHOLD (imported from criticalDocMachine).
 */

import type { DocAuditResult, DocIssue, Rule } from './types'
import { DOC_AUDIT_THRESHOLD } from './criticalDocMachine'
import { logger } from './logger'

const agentLogger = logger.setDomain('agent')

export interface DocAuditorInput {
  normalizedInputs: Record<string, string>
  rules: Rule[]
}

export function runDocAuditor(input: DocAuditorInput): DocAuditResult {
  agentLogger.info('DOC_AUDITOR_START', { ruleCount: input.rules.length })

  const allIssues: DocIssue[] = []
  let weightedScore = 0

  for (const rule of input.rules) {
    const ruleIssues = rule.evaluate(input.normalizedInputs)
    allIssues.push(...ruleIssues)

    // A rule "passes" if it produces no error-severity issues
    // (warnings are informational and do not block the score)
    const hasErrors = ruleIssues.some(i => i.severity === 'error')
    if (!hasErrors) {
      weightedScore += rule.weight
    }
  }

  // Clamp to [0, 100]
  const score = Math.min(100, Math.max(0, Math.round(weightedScore * 100)))
  const passed = score >= DOC_AUDIT_THRESHOLD

  agentLogger.info('DOC_AUDITOR_COMPLETE', {
    score,
    passed,
    errorCount: allIssues.filter(i => i.severity === 'error').length,
    warnCount:  allIssues.filter(i => i.severity === 'warn').length,
  })

  return { score, passed, issues: allIssues }
}
