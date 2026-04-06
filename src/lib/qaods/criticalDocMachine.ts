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
  DocGenerationResult,
  DocValidationResult,
} from './types'
import type { QAODSError } from './errors'
import { ValidationError } from './errors'
import { withAgentRetry } from './retry'
import { auditLogger } from './auditLogger'
import { logger } from './logger'

// ── Constants ─────────────────────────────────────────────────────────────
export const DOC_AUDIT_THRESHOLD = 85   // same scale as HSCC_THRESHOLD
export const MAX_DOC_ITERATIONS = 2     // same as MAX_ITERATIONS

// ── Logger ────────────────────────────────────────────────────────────────
const docLogger = logger.setDomain('agent')

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

// ── Agent stubs ───────────────────────────────────────────────────────────
// These mirror the Q-AODS agent pattern: pure async functions with typed
// inputs/outputs. Replace stub logic with real implementations.

async function runDocValidator(ctx: CriticalDocContext): Promise<DocValidationResult> {
  docLogger.info('DOC_VALIDATOR_START', { docType: ctx.docType, sessionId: ctx.sessionId })

  if (!ctx.docType) {
    throw new ValidationError('docType is required')
  }
  if (ctx.fieldsManifest.length === 0) {
    throw new ValidationError('fieldsManifest cannot be empty')
  }

  // Check required fields are present in userInputs
  const issues = ctx.fieldsManifest
    .filter((f: DocField) => f.required && !ctx.userInputs[f.id]?.trim())
    .map((f: DocField) => ({
      fieldId: f.id,
      severity: 'error' as const,
      code: 'REQUIRED_MISSING',
      message: `${f.label} is required`,
    }))

  const validationStatus = issues.length === 0 ? 'valid' : 'invalid'

  docLogger.info('DOC_VALIDATOR_COMPLETE', {
    sessionId: ctx.sessionId,
    validationStatus,
    issueCount: issues.length,
  })

  if (validationStatus === 'invalid') {
    throw new ValidationError(`Validation failed: ${issues.map(i => i.message).join('; ')}`)
  }

  return { validationStatus, issues }
}

async function runDocGenerator(ctx: CriticalDocContext): Promise<DocGenerationResult> {
  docLogger.info('DOC_GENERATOR_START', { docType: ctx.docType, sessionId: ctx.sessionId })

  // Stub: render a simple JSON representation of the filled form.
  // Replace with real template rendering (HTML, PDF, etc.).
  const fieldsUsed = Object.keys(ctx.userInputs)
  const generatedDoc = JSON.stringify(
    {
      docType: ctx.docType,
      generatedAt: new Date().toISOString(),
      fields: ctx.fieldsManifest.map((f: DocField) => ({
        id: f.id,
        label: f.label,
        value: ctx.userInputs[f.id] ?? '',
      })),
    },
    null,
    2
  )

  docLogger.info('DOC_GENERATOR_COMPLETE', {
    sessionId: ctx.sessionId,
    fieldsUsed: fieldsUsed.length,
    docChars: generatedDoc.length,
  })

  return { generatedDoc, fieldsUsed }
}

async function runDocAuditor(ctx: CriticalDocContext): Promise<DocAuditResult> {
  docLogger.info('DOC_AUDITOR_START', { sessionId: ctx.sessionId, iterationCount: ctx.iterationCount })

  if (!ctx.generatedDoc) {
    throw new ValidationError('generatedDoc is required for audit')
  }

  // Stub scoring: check field completeness and basic pattern validation.
  // Replace with real LLM-based or rule-based audit logic.
  const totalFields = ctx.fieldsManifest.length
  const filledFields = ctx.fieldsManifest.filter(
    (f: DocField) => ctx.userInputs[f.id]?.trim()
  ).length

  const completenessScore = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 100

  // Pattern validation
  const patternIssues = ctx.fieldsManifest
    .filter((f: DocField) => f.pattern && ctx.userInputs[f.id])
    .filter((f: DocField) => !new RegExp(f.pattern!).test(ctx.userInputs[f.id]))
    .map((f: DocField) => ({
      fieldId: f.id,
      severity: 'error' as const,
      code: 'PATTERN_MISMATCH',
      message: `${f.label} does not match the required format`,
    }))

  const score = patternIssues.length > 0
    ? Math.round(completenessScore * 0.7)   // penalise pattern failures
    : completenessScore

  const passed = score >= DOC_AUDIT_THRESHOLD

  docLogger.info('DOC_AUDITOR_COMPLETE', {
    sessionId: ctx.sessionId,
    score,
    passed,
    issueCount: patternIssues.length,
  })

  return { score, passed, issues: patternIssues }
}

// ── Machine ───────────────────────────────────────────────────────────────
export const criticalDocMachine = createMachine(
  {
    id: 'criticalDoc',
    initial: 'IDLE',
    context: initialDocContext,

    states: {
      IDLE: {
        on: {
          // Start a new doc session — mirrors CREATE_TASK
          START_DOC: {
            target: 'PENDING',
            actions: assign(({ event }) => ({
              docType: event.docType as DocType,
              fieldsManifest: event.fieldsManifest as DocField[],
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
            actions: assign(() => ({ ...initialDocContext, sessionId: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) })),
          },
        },
      },

      // PENDING: validate inputs before generation
      PENDING: {
        invoke: {
          src: fromPromise(({ input }: { input: CriticalDocContext }) =>
            withAgentRetry(() => runDocValidator(input))
          ),
          input: ({ context }) => context,
          onDone: {
            target: 'VALIDATOR',
            // validation passed — no output to store, proceed
          },
          onError: {
            target: 'FAILED',
            actions: assign(({ context, event }) => ({
              failedAgent: 'validator',
              failureError: event.error as QAODSError,
              finalScore: context.auditResult?.score ?? undefined,
              iterationsUsed: context.iterationCount,
            })),
          },
        },
      },

      // VALIDATOR: generate the document
      VALIDATOR: {
        invoke: {
          src: fromPromise(({ input }: { input: CriticalDocContext }) =>
            withAgentRetry(() => runDocGenerator(input))
          ),
          input: ({ context }) => context,
          onDone: {
            target: 'GENERATOR',
            actions: assign(({ event }) => ({
              generatedDoc: (event.output as DocGenerationResult).generatedDoc,
            })),
          },
          onError: {
            target: 'FAILED',
            actions: assign(({ context, event }) => ({
              failedAgent: 'generator',
              failureError: event.error as QAODSError,
              finalScore: context.auditResult?.score ?? undefined,
              iterationsUsed: context.iterationCount,
            })),
          },
        },
      },

      // GENERATOR: audit the generated document
      GENERATOR: {
        entry: ({ context }) => {
          // Mirror: AUDIT_STARTED trigger point
          auditLogger.append({
            taskId: context.sessionId,
            eventType: 'AUDIT_STARTED',
            payload: { docType: context.docType, iterationCount: context.iterationCount },
          })
        },
        invoke: {
          src: fromPromise(({ input }: { input: CriticalDocContext }) =>
            withAgentRetry(() => runDocAuditor(input))
          ),
          input: ({ context }) => context,
          onDone: {
            target: 'AUDITOR',
            actions: [
              assign(({ event }) => ({ auditResult: event.output as DocAuditResult })),
              ({ context, event }) => {
                // Mirror: AUDIT_RESULT trigger point
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

      // AUDITOR: score-gated routing — mirrors Q-AODS AUDITOR exactly
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

      // ITERATE: increment counter and re-run generator — mirrors Q-AODS ITERATE
      ITERATE: {
        entry: assign(({ context }) => ({ iterationCount: context.iterationCount + 1 })),
        always: { target: 'VALIDATOR' },
      },

      // Terminal states — both accept RESET
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
