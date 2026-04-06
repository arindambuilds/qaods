/**
 * criticalDocMachine.ts
 *
 * XState v5 machine for the Critical Document pipeline.
 *
 * Mirrors the Q-AODS FSM patterns exactly:
 *   - Same state topology: IDLE → PENDING → VALIDATOR → GENERATOR → AUDITOR → MERGED/FAILED
 *   - Same score-gated retry loop (DOC_AUDIT_THRESHOLD, MAX_DOC_ITERATIONS)
 *   - Same withAgentRetry wrapping on every invoke
 *   - Same auditLogger trigger points
 *   - Same RESET / SELECT_DOC event handling
 *
 * Completely independent from qaodsMachine — does not share context or state.
 * Both machines can run on the same page simultaneously.
 */

import { createMachine, assign, fromPromise } from 'xstate'
import type {
  CriticalDocContext,
  DocType,
  DocField,
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

// ── Constants ─────────────────────────────────────────────────────────────
export const DOC_AUDIT_THRESHOLD = 85   // same scale as HSCC_THRESHOLD
export const MAX_DOC_ITERATIONS = 2     // same as MAX_ITERATIONS

// ── Logger ────────────────────────────────────────────────────────────────

function logDocTransition(from: string, to: string, fields?: Record<string, unknown>) {
  logger.setDomain('fsm').info('DOC_FSM_TRANSITION', { from, to, ...fields })
}

// ── Initial context ───────────────────────────────────────────────────────
const initialDocContext: CriticalDocContext = {
  sessionId: typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2),
  userId: 'default',
  docType: null,
  fieldsManifest: [],
  userInputs: {},
  generatedDoc: null,
  auditResult: null,
  iterationCount: 0,
}

// ── Agent stubs replaced by real implementations ──────────────────────────
// runDocStrategist, runDocResearcher, runDocExecutor, runDocAuditor
// are imported above and used directly in the machine invocations.

// ── Machine ───────────────────────────────────────────────────────────────
export const criticalDocMachine = createMachine(
  {
    id: 'criticalDoc',
    initial: 'IDLE',
    context: initialDocContext,

    states: {
      IDLE: {
        on: {
          // START_DOC only needs docType + userInputs; the Strategist resolves the manifest
          START_DOC: {
            target: 'PENDING',
            actions: assign(({ event }) => ({
              docType: event.docType as DocType,
              fieldsManifest: [],           // populated by PENDING (Strategist)
              userInputs: event.userInputs as Record<string, string>,
              generatedDoc: null,
              auditResult: null,
              iterationCount: 0,
              failedAgent: undefined,
              failureError: undefined,
              finalScore: undefined,
              iterationsUsed: undefined,
            })),
          },
          RESET: {
            actions: assign(() => ({
              ...initialDocContext,
              sessionId: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
            })),
          },
        },
      },

      // PENDING: Strategist — resolve template and fieldsManifest
      PENDING: {
        invoke: {
          src: fromPromise(({ input }: { input: CriticalDocContext }) =>
            withAgentRetry(() => Promise.resolve(runDocStrategist(input.docType!)))
          ),
          input: ({ context }) => context,
          onDone: {
            target: 'STRATEGIST',
            actions: assign(({ event }) => ({
              fieldsManifest: (event.output as CriticalDocStrategyResult).fieldsManifest,
            })),
          },
          onError: {
            target: 'FAILED',
            actions: assign(({ context, event }) => ({
              failedAgent: 'strategist',
              failureError: event.error as QAODSError,
              finalScore: context.auditResult?.score ?? undefined,
              iterationsUsed: context.iterationCount,
            })),
          },
        },
      },

      // STRATEGIST: Researcher — load rules for this template
      STRATEGIST: {
        invoke: {
          src: fromPromise(({ input }: { input: CriticalDocContext }) =>
            withAgentRetry(() => Promise.resolve(runDocResearcher(input.docType!, input.docType!)))
          ),
          input: ({ context }) => context,
          onDone: {
            target: 'RESEARCHER',
            // rules are stored in the template; no context mutation needed here
            // (auditor reads them directly from getTemplate)
          },
          onError: {
            target: 'FAILED',
            actions: assign(({ context, event }) => ({
              failedAgent: 'researcher',
              failureError: event.error as QAODSError,
              finalScore: context.auditResult?.score ?? undefined,
              iterationsUsed: context.iterationCount,
            })),
          },
        },
      },

      // RESEARCHER: Executor — normalise inputs and render HTML
      RESEARCHER: {
        invoke: {
          src: fromPromise(({ input }: { input: CriticalDocContext }) =>
            withAgentRetry(() =>
              Promise.resolve(runDocExecutor({
                fieldsManifest: input.fieldsManifest,
                userInputs: input.userInputs,
              }))
            )
          ),
          input: ({ context }) => context,
          onDone: {
            target: 'EXECUTOR',
            actions: assign(({ event }) => ({
              generatedDoc: (event.output as CriticalDocExecutionResult).generatedDoc,
              // Store normalised inputs back so the Auditor uses clean values
              userInputs: (event.output as CriticalDocExecutionResult).normalizedInputs,
            })),
          },
          onError: {
            target: 'FAILED',
            actions: assign(({ context, event }) => ({
              failedAgent: 'executor',
              failureError: event.error as QAODSError,
              finalScore: context.auditResult?.score ?? undefined,
              iterationsUsed: context.iterationCount,
            })),
          },
        },
      },

      // EXECUTOR: Auditor — evaluate rules and score
      EXECUTOR: {
        entry: ({ context }) => {
          auditLogger.append({
            taskId: context.sessionId,
            eventType: 'AUDIT_STARTED',
            payload: { docType: context.docType, iterationCount: context.iterationCount },
          })
        },
        invoke: {
          src: fromPromise(({ input }: { input: CriticalDocContext }) => {
            const { getTemplate } = require('./docTemplates') as typeof import('./docTemplates')
            const template = getTemplate(input.docType!)
            return withAgentRetry(() =>
              Promise.resolve(runDocAuditor({
                normalizedInputs: input.userInputs,
                rules: template.rules,
              }))
            )
          }),
          input: ({ context }) => context,
          onDone: {
            target: 'AUDITOR',
            actions: [
              assign(({ event }) => ({ auditResult: event.output as DocAuditResult })),
              ({ context, event }) => {
                const result = event.output as DocAuditResult
                auditLogger.append({
                  taskId: context.sessionId,
                  eventType: 'AUDIT_RESULT',
                  payload: { score: result.score, passed: result.passed, issueCount: result.issues.length },
                })
              },
            ],
          },
          onError: {
            target: 'FAILED',
            actions: assign(({ context, event }) => ({
              failedAgent: 'auditor',
              failureError: event.error as QAODSError,
              finalScore: context.auditResult?.score ?? undefined,
              iterationsUsed: context.iterationCount,
            })),
          },
        },
      },

      // AUDITOR: score-gated routing
      AUDITOR: {
        always: [
          {
            guard: 'docAuditPassed',
            target: 'MERGED',
            actions: ({ context }) => {
              logDocTransition('AUDITOR', 'MERGED', { score: context.auditResult?.score, sessionId: context.sessionId })
              auditLogger.append({
                taskId: context.sessionId,
                eventType: 'TASK_MERGED',
                payload: { score: context.auditResult?.score, iterationsUsed: context.iterationCount },
              })
            },
          },
          {
            guard: 'canDocIterate',
            target: 'ITERATE',
            actions: ({ context }) => {
              logDocTransition('AUDITOR', 'ITERATE', { score: context.auditResult?.score, iterationCount: context.iterationCount })
              auditLogger.append({
                taskId: context.sessionId,
                eventType: 'ITERATION_TRIGGERED',
                payload: { iterationCount: context.iterationCount, score: context.auditResult?.score },
              })
            },
          },
          {
            target: 'FAILED',
            actions: assign(({ context }) => {
              logDocTransition('AUDITOR', 'FAILED', { score: context.auditResult?.score, iterationsUsed: context.iterationCount })
              auditLogger.append({
                taskId: context.sessionId,
                eventType: 'TASK_FAILED',
                payload: { finalScore: context.auditResult?.score, iterationsUsed: context.iterationCount },
              })
              return {
                failedAgent: 'auditor',
                finalScore: context.auditResult?.score ?? undefined,
                iterationsUsed: context.iterationCount,
              }
            }),
          },
        ],
        on: {
          APPROVE: { target: 'MERGED' },
          REJECT:  { target: 'FAILED' },
        },
      },

      // ITERATE: increment and re-run from Researcher (executor re-normalises)
      ITERATE: {
        entry: assign(({ context }) => ({ iterationCount: context.iterationCount + 1 })),
        always: { target: 'RESEARCHER' },
      },

      MERGED: {
        on: {
          RESET: {
            target: 'IDLE',
            actions: assign(() => ({
              ...initialDocContext,
              sessionId: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
            })),
          },
        },
      },

      FAILED: {
        on: {
          RESET: {
            target: 'IDLE',
            actions: assign(() => ({
              ...initialDocContext,
              sessionId: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
            })),
          },
        },
      },
    },
  },
  {
    guards: {
      docAuditPassed: ({ context }) =>
        (context.auditResult?.score ?? 0) >= DOC_AUDIT_THRESHOLD,
      canDocIterate: ({ context }) =>
        context.iterationCount < MAX_DOC_ITERATIONS,
    },
  }
)
