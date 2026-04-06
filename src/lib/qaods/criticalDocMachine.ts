/**
 * criticalDocMachine.ts
 *
 * XState v5 FSM for the Critical Document pipeline.
 *
 * State topology (mirrors Q-AODS exactly):
 *   IDLE → STRATEGIST → RESEARCHER → EXECUTOR → AUDITOR → MERGED
 *                                         ↑          ↓ (canIterate)
 *                                       ITERATE ←────┘
 *                                                ↓ (budget exhausted)
 *                                              FAILED
 *
 * External events:
 *   CREATE_SESSION  { docType }          — start a new session, go to STRATEGIST
 *   UPDATE_FIELD    { fieldId, value }   — mutate userInputs while in IDLE
 *   RUN_CHECKS      {}                   — trigger pipeline from IDLE (after fields filled)
 *   RESET           {}                   — clear context, return to IDLE
 *
 * Internal events (XState invoke onDone):
 *   STRATEGY_COMPLETE  — Strategist done, fieldsManifest resolved
 *   RESEARCH_COMPLETE  — Researcher done, rules loaded
 *   EXECUTION_COMPLETE — Executor done, normalizedInputs + generatedDoc ready
 *   AUDIT_COMPLETE     — Auditor done, DocAuditResult ready
 *
 * Guards:
 *   auditPassed  — context.auditResult.passed === true
 *   canIterate   — context.iterationCount < MAX_DOC_ITERATIONS (3)
 *
 * Logging: sessionId, docType, score, issueCount only — no PII field values.
 */

import { createMachine, assign, fromPromise } from 'xstate'
import type {
  CriticalDocContext,
  DocType,
  DocAuditResult,
  CriticalDocStrategyResult,
  CriticalDocResearchResult,
  CriticalDocExecutionResult,
} from './types'
import type { QAODSError } from './errors'
import { withAgentRetry } from './retry'
import { auditLogger } from './auditLogger'
import { logger } from './logger'
import { runDocStrategist } from './strategistCriticalDoc'
import { runDocResearcher } from './researcherCriticalDoc'
import { runDocExecutor } from './executorCriticalDoc'
import { runDocAuditor } from './auditorCriticalDoc'
import { getTemplate } from './docTemplates'

// ── Constants ─────────────────────────────────────────────────────────────
export const DOC_AUDIT_THRESHOLD = 85
export const MAX_DOC_ITERATIONS  = 3   // one more than Q-AODS (docs need more passes)

// ── Helpers ───────────────────────────────────────────────────────────────
const fsmLogger = logger.setDomain('fsm')

function newSessionId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
}

function logTransition(from: string, to: string, ctx: CriticalDocContext) {
  fsmLogger.info('DOC_FSM_TRANSITION', {
    from,
    to,
    sessionId: ctx.sessionId,
    docType: ctx.docType,
    iterationCount: ctx.iterationCount,
    score: ctx.auditResult?.score ?? null,
  })
}

/** Build a human-readable failure summary from the top error issues. */
function buildFailureReason(auditResult: DocAuditResult | null, iterationsUsed: number): string {
  if (!auditResult) return 'Pipeline failed before audit could complete.'
  const errors = auditResult.issues.filter(i => i.severity === 'error')
  if (errors.length === 0) {
    return `Audit score ${auditResult.score}/100 did not reach the threshold of ${DOC_AUDIT_THRESHOLD} after ${iterationsUsed} iteration(s).`
  }
  const topErrors = errors.slice(0, 3).map(i => i.message).join('; ')
  const more = errors.length > 3 ? ` (+${errors.length - 3} more)` : ''
  return `Score ${auditResult.score}/100 after ${iterationsUsed} iteration(s). Top issues: ${topErrors}${more}`
}

// ── Initial context ───────────────────────────────────────────────────────
const initialDocContext: CriticalDocContext = {
  sessionId: newSessionId(),
  userId: 'default',
  docType: null,
  fieldsManifest: [],
  userInputs: {},
  strategyResult: null,
  researchResult: null,
  executionResult: null,
  generatedDoc: null,
  auditResult: null,
  iterationCount: 0,
}

// ── Machine ───────────────────────────────────────────────────────────────
export const criticalDocMachine = createMachine(
  {
    id: 'criticalDoc',
    initial: 'IDLE',
    context: initialDocContext,

    states: {
      // ── IDLE ─────────────────────────────────────────────────────────────
      // Accepts field edits and waits for CREATE_SESSION or RUN_CHECKS.
      IDLE: {
        on: {
          CREATE_SESSION: {
            target: 'STRATEGIST',
            actions: assign(({ event }) => ({
              sessionId: newSessionId(),
              docType: event.docType as DocType,
              fieldsManifest: [],
              userInputs: {},
              strategyResult: null,
              researchResult: null,
              executionResult: null,
              generatedDoc: null,
              auditResult: null,
              iterationCount: 0,
              failedAgent: undefined,
              failureError: undefined,
              failureReason: undefined,
              finalScore: undefined,
              iterationsUsed: undefined,
            })),
          },

          // Allow field edits before running — useful for pre-fill UIs
          UPDATE_FIELD: {
            actions: assign(({ context, event }) => ({
              userInputs: {
                ...context.userInputs,
                [event.fieldId as string]: event.value as string,
              },
            })),
          },

          // Re-run pipeline with current userInputs (docType must already be set)
          RUN_CHECKS: {
            guard: ({ context }) => context.docType !== null,
            target: 'STRATEGIST',
            actions: assign(({ context }) => ({
              sessionId: newSessionId(),
              strategyResult: null,
              researchResult: null,
              executionResult: null,
              generatedDoc: null,
              auditResult: null,
              iterationCount: 0,
              failedAgent: undefined,
              failureError: undefined,
              failureReason: undefined,
              finalScore: undefined,
              iterationsUsed: undefined,
              // preserve docType, fieldsManifest, userInputs
              docType: context.docType,
              fieldsManifest: context.fieldsManifest,
              userInputs: context.userInputs,
            })),
          },

          RESET: {
            actions: assign(() => ({ ...initialDocContext, sessionId: newSessionId() })),
          },
        },
      },

      // ── STRATEGIST ───────────────────────────────────────────────────────
      // Resolves the template and fieldsManifest for the given docType.
      STRATEGIST: {
        entry: ({ context }) => {
          fsmLogger.info('DOC_STRATEGIST_ENTRY', {
            sessionId: context.sessionId,
            docType: context.docType,
          })
        },
        invoke: {
          src: fromPromise(({ input }: { input: CriticalDocContext }) =>
            withAgentRetry(() => Promise.resolve(runDocStrategist(input.docType!)))
          ),
          input: ({ context }) => context,
          onDone: {
            target: 'RESEARCHER',
            actions: assign(({ event }) => ({
              strategyResult: event.output as CriticalDocStrategyResult,
              fieldsManifest: (event.output as CriticalDocStrategyResult).fieldsManifest,
            })),
          },
          onError: {
            target: 'FAILED',
            actions: assign(({ context, event }) => {
              logTransition('STRATEGIST', 'FAILED', context)
              return {
                failedAgent: 'strategist',
                failureError: event.error as QAODSError,
                failureReason: `Strategist failed: ${(event.error as Error).message}`,
                finalScore: context.auditResult?.score ?? undefined,
                iterationsUsed: context.iterationCount,
              }
            }),
          },
        },
      },

      // ── RESEARCHER ───────────────────────────────────────────────────────
      // Loads the rule set for this template version.
      RESEARCHER: {
        entry: ({ context }) => {
          fsmLogger.info('DOC_RESEARCHER_ENTRY', {
            sessionId: context.sessionId,
            templateId: context.strategyResult?.templateId,
          })
        },
        invoke: {
          src: fromPromise(({ input }: { input: CriticalDocContext }) =>
            withAgentRetry(() =>
              Promise.resolve(
                runDocResearcher(input.docType!, input.strategyResult?.templateId ?? input.docType!)
              )
            )
          ),
          input: ({ context }) => context,
          onDone: {
            target: 'EXECUTOR',
            actions: assign(({ event }) => ({
              researchResult: event.output as CriticalDocResearchResult,
            })),
          },
          onError: {
            target: 'FAILED',
            actions: assign(({ context, event }) => {
              logTransition('RESEARCHER', 'FAILED', context)
              return {
                failedAgent: 'researcher',
                failureError: event.error as QAODSError,
                failureReason: `Researcher failed: ${(event.error as Error).message}`,
                finalScore: context.auditResult?.score ?? undefined,
                iterationsUsed: context.iterationCount,
              }
            }),
          },
        },
      },

      // ── EXECUTOR ─────────────────────────────────────────────────────────
      // Normalises inputs and renders the HTML document preview.
      EXECUTOR: {
        entry: ({ context }) => {
          fsmLogger.info('DOC_EXECUTOR_ENTRY', {
            sessionId: context.sessionId,
            iterationCount: context.iterationCount,
          })
        },
        invoke: {
          src: fromPromise(({ input }: { input: CriticalDocContext }) =>
            withAgentRetry(() =>
              Promise.resolve(
                runDocExecutor({
                  fieldsManifest: input.fieldsManifest,
                  userInputs: input.userInputs,
                })
              )
            )
          ),
          input: ({ context }) => context,
          onDone: {
            target: 'AUDITOR',
            actions: [
              assign(({ event }) => ({
                executionResult: event.output as CriticalDocExecutionResult,
                generatedDoc: (event.output as CriticalDocExecutionResult).generatedDoc,
                // Write normalised values back so the Auditor uses clean data
                userInputs: (event.output as CriticalDocExecutionResult).normalizedInputs,
              })),
              ({ context }) => {
                // AUDIT_STARTED trigger point
                auditLogger.append({
                  taskId: context.sessionId,
                  eventType: 'AUDIT_STARTED',
                  payload: {
                    sessionId: context.sessionId,
                    docType: context.docType,
                    iterationCount: context.iterationCount,
                  },
                })
              },
            ],
          },
          onError: {
            target: 'FAILED',
            actions: assign(({ context, event }) => {
              logTransition('EXECUTOR', 'FAILED', context)
              return {
                failedAgent: 'executor',
                failureError: event.error as QAODSError,
                failureReason: `Executor failed: ${(event.error as Error).message}`,
                finalScore: context.auditResult?.score ?? undefined,
                iterationsUsed: context.iterationCount,
              }
            }),
          },
        },
      },

      // ── AUDITOR ──────────────────────────────────────────────────────────
      // Evaluates all rules and scores the document.
      // Uses `always` transitions for immediate routing after audit completes.
      AUDITOR: {
        entry: ({ context }) => {
          fsmLogger.info('DOC_AUDITOR_ENTRY', {
            sessionId: context.sessionId,
            iterationCount: context.iterationCount,
          })
        },
        invoke: {
          src: fromPromise(({ input }: { input: CriticalDocContext }) => {
            const template = getTemplate(input.docType!)
            return withAgentRetry(() =>
              Promise.resolve(
                runDocAuditor({
                  normalizedInputs: input.userInputs,
                  rules: template.rules,
                })
              )
            )
          }),
          input: ({ context }) => context,
          onDone: {
            // Store result then let `always` transitions route
            actions: [
              assign(({ event }) => ({ auditResult: event.output as DocAuditResult })),
              ({ context, event }) => {
                const result = event.output as DocAuditResult
                // AUDIT_RESULT trigger point
                auditLogger.append({
                  taskId: context.sessionId,
                  eventType: 'AUDIT_RESULT',
                  payload: {
                    sessionId: context.sessionId,
                    docType: context.docType,
                    score: result.score,
                    passed: result.passed,
                    issueCount: result.issues.length,
                    errorCount: result.issues.filter(i => i.severity === 'error').length,
                  },
                })
              },
            ],
          },
          onError: {
            target: 'FAILED',
            actions: assign(({ context, event }) => {
              logTransition('AUDITOR', 'FAILED', context)
              return {
                failedAgent: 'auditor',
                failureError: event.error as QAODSError,
                failureReason: `Auditor failed: ${(event.error as Error).message}`,
                finalScore: context.auditResult?.score ?? undefined,
                iterationsUsed: context.iterationCount,
              }
            }),
          },
        },
        // Route immediately once auditResult is set
        always: [
          {
            guard: 'auditPassed',
            target: 'MERGED',
            actions: ({ context }) => {
              logTransition('AUDITOR', 'MERGED', context)
              auditLogger.append({
                taskId: context.sessionId,
                eventType: 'TASK_MERGED',
                payload: {
                  sessionId: context.sessionId,
                  docType: context.docType,
                  score: context.auditResult?.score,
                  iterationsUsed: context.iterationCount,
                },
              })
            },
          },
          {
            guard: 'canIterate',
            target: 'ITERATE',
            actions: ({ context }) => {
              logTransition('AUDITOR', 'ITERATE', context)
              auditLogger.append({
                taskId: context.sessionId,
                eventType: 'ITERATION_TRIGGERED',
                payload: {
                  sessionId: context.sessionId,
                  docType: context.docType,
                  score: context.auditResult?.score,
                  iterationCount: context.iterationCount,
                },
              })
            },
          },
          {
            target: 'FAILED',
            actions: assign(({ context }) => {
              const iterationsUsed = context.iterationCount
              const failureReason = buildFailureReason(context.auditResult, iterationsUsed)
              logTransition('AUDITOR', 'FAILED', context)
              auditLogger.append({
                taskId: context.sessionId,
                eventType: 'TASK_FAILED',
                payload: {
                  sessionId: context.sessionId,
                  docType: context.docType,
                  finalScore: context.auditResult?.score,
                  iterationsUsed,
                  issueCount: context.auditResult?.issues.length ?? 0,
                },
              })
              return {
                failedAgent: 'auditor',
                failureReason,
                finalScore: context.auditResult?.score ?? undefined,
                iterationsUsed,
              }
            }),
          },
        ],
        // Manual overrides while audit result is being evaluated
        on: {
          APPROVE: { target: 'MERGED' },
          REJECT:  { target: 'FAILED', actions: assign({ failureReason: 'Manually rejected.' }) },
        },
      },

      // ── ITERATE ──────────────────────────────────────────────────────────
      // Increment counter and loop back to EXECUTOR (re-normalise + re-audit).
      ITERATE: {
        entry: assign(({ context }) => ({ iterationCount: context.iterationCount + 1 })),
        always: { target: 'EXECUTOR' },
      },

      // ── MERGED ───────────────────────────────────────────────────────────
      MERGED: {
        on: {
          RESET: {
            target: 'IDLE',
            actions: assign(() => ({ ...initialDocContext, sessionId: newSessionId() })),
          },
          // Allow starting a new session without explicit RESET
          CREATE_SESSION: {
            target: 'STRATEGIST',
            actions: assign(({ event }) => ({
              sessionId: newSessionId(),
              docType: event.docType as DocType,
              fieldsManifest: [],
              userInputs: {},
              strategyResult: null,
              researchResult: null,
              executionResult: null,
              generatedDoc: null,
              auditResult: null,
              iterationCount: 0,
              failedAgent: undefined,
              failureError: undefined,
              failureReason: undefined,
              finalScore: undefined,
              iterationsUsed: undefined,
            })),
          },
        },
      },

      // ── FAILED ───────────────────────────────────────────────────────────
      FAILED: {
        on: {
          RESET: {
            target: 'IDLE',
            actions: assign(() => ({ ...initialDocContext, sessionId: newSessionId() })),
          },
          // Allow re-running with updated fields after a failure
          UPDATE_FIELD: {
            actions: assign(({ context, event }) => ({
              userInputs: {
                ...context.userInputs,
                [event.fieldId as string]: event.value as string,
              },
            })),
          },
          RUN_CHECKS: {
            guard: ({ context }) => context.docType !== null,
            target: 'EXECUTOR',   // skip Strategist/Researcher — reuse existing manifest+rules
            actions: assign(({ context }) => ({
              sessionId: newSessionId(),
              executionResult: null,
              generatedDoc: null,
              auditResult: null,
              iterationCount: 0,
              failedAgent: undefined,
              failureError: undefined,
              failureReason: undefined,
              finalScore: undefined,
              iterationsUsed: undefined,
              docType: context.docType,
              fieldsManifest: context.fieldsManifest,
              userInputs: context.userInputs,
              strategyResult: context.strategyResult,
              researchResult: context.researchResult,
            })),
          },
        },
      },
    },
  },
  {
    guards: {
      // auditPassed: context.auditResult.passed === true
      auditPassed: ({ context }) => context.auditResult?.passed === true,
      // canIterate: iterationCount < MAX_DOC_ITERATIONS (3)
      canIterate:  ({ context }) => context.iterationCount < MAX_DOC_ITERATIONS,
    },
  }
)
