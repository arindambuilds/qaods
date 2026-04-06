/**
 * strategistCriticalDoc.ts
 *
 * Strategist agent for the Critical Document pipeline.
 * Pure function — no React, no browser APIs, no LLM.
 *
 * Responsibility: resolve the docType to a concrete template and return
 * the fieldsManifest so the rest of the pipeline knows what to collect.
 */

import type { DocType, CriticalDocStrategyResult } from './types'
import { getTemplate } from './docTemplates'
import { logger } from './logger'

const agentLogger = logger.setDomain('agent')

/**
 * @throws ValidationError if docType has no registered template
 */
export function runDocStrategist(docType: DocType): CriticalDocStrategyResult {
  agentLogger.info('DOC_STRATEGIST_START', { docType })

  const template = getTemplate(docType)   // throws ValidationError if unknown

  const result: CriticalDocStrategyResult = {
    docType,
    templateId: template.id,
    fieldsManifest: template.fieldsManifest,
  }

  agentLogger.info('DOC_STRATEGIST_COMPLETE', {
    docType,
    templateId: template.id,
    fieldCount: template.fieldsManifest.length,
  })

  return result
}
