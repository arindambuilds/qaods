/**
 * researcherCriticalDoc.ts
 *
 * Researcher agent for the Critical Document pipeline.
 * Pure function — no React, no browser APIs, no LLM.
 *
 * Responsibility: look up the rule set for the given template and pass it
 * through to the Auditor. This is the hook for future rule updates (e.g.
 * fetching updated rules from a remote registry or an LLM).
 */

import type { DocType, CriticalDocResearchResult } from './types'
import { getTemplate } from './docTemplates'
import { logger } from './logger'

const agentLogger = logger.setDomain('agent')

/**
 * @throws ValidationError if docType has no registered template
 */
export function runDocResearcher(docType: DocType, templateId: string): CriticalDocResearchResult {
  agentLogger.info('DOC_RESEARCHER_START', { docType, templateId })

  const template = getTemplate(docType)

  const result: CriticalDocResearchResult = {
    rules: template.rules,
    lastVerifiedAt: template.lastVerifiedAt,
  }

  agentLogger.info('DOC_RESEARCHER_COMPLETE', {
    docType,
    ruleCount: template.rules.length,
    lastVerifiedAt: template.lastVerifiedAt,
  })

  return result
}
