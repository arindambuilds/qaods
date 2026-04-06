import { createMachine, assign, fromPromise } from 'xstate'
import type { QAODSContext, Task, ExecutionContext, PromptBudget } from './types'
import type { QAODSError } from './errors'
import { runStrategist } from './strategist'
import { generatePrompt } from './promptGenerator'
import { runExecutor } from './executor'
import { runAuditor, HSCC_THRESHOLD } from './auditor'
import { auditLogger } from './auditLogger'
import { withAgentRetry } from './retry'
import { logger } from './logger'

export const MAX_ITERATIONS = 2

const DEFAULT_BUDGET: PromptBudget = {
  maxSystemTokens: 2000,
  maxUserTokens: 1000,
  maxConstraints: 4,
}

const fsmLogger = logger.setDomain('fsm')

// Log FSM transitions for debuggability
function logTransition(from: string, to: string, fields?: Record<string, unknown>) {
  fsmLogger.info('FSM_TRANSITION', { from, to, ...fields })
}

const initialContext: QAODSContext = {
  task: null,
  taskId: null,
  userId: 'default',
  teamId: 'default',
  iterationCount: 0,
}

export const qaodsMachine = createMachine(
  {
    id: 'qaods',
    initial: 'IDLE',
    context: initialContext,
    states: {
      IDLE: {
        on: {
          CREATE_TASK: {
            target: 'PENDING',
            actions: assign(({ event }) => ({
              task: event.task as Task,
              taskId: (event.task as Task).id,
              userId: (event.task as Task).userId,
              teamId: (event.task as Task).teamId,
              iterationCount: 0,
              strategyResult: undefined,
              promptPayload: undefined,
              executionResult: undefined,
              auditResult: undefined,
              failedAgent: undefined,
              failureError: undefined,
              finalScore: undefined,
              iterationsUsed: undefined,
            })),
          },
          SELECT_TASK: {
            actions: assign(({ event }) => ({
              task: event.task as Task,
              taskId: (event.task as Task).id,
            })),
          },
          RESET: {
            actions: assign(() => ({ ...initialContext })),
          },
        },
      },
      PENDING: {
        invoke: {
          src: fromPromise(({ input }: { input: QAODSContext }) =>
            withAgentRetry(() => runStrategist(input.task!))
          ),
          input: ({ context }) => context,
          onDone: {
            target: 'STRATEGIST',
            actions: assign(({ event }) => ({ strategyResult: event.output })),
          },
          onError: {
            target: 'FAILED',
            actions: assign(({ context, event }) => ({
              failedAgent: 'strategist' as const,
              failureError: event.error as QAODSError,
              finalScore: context.auditResult?.score,
              iterationsUsed: context.iterationCount,
            })),
          },
        },
      },
      STRATEGIST: {
        invoke: {
          src: fromPromise(({ input }: { input: QAODSContext }) =>
            withAgentRetry(() =>
              generatePrompt(
                { task: input.task, iterationCount: input.iterationCount, auditResult: input.auditResult },
                input.strategyResult!,
                DEFAULT_BUDGET
              )
            )
          ),
          input: ({ context }) => context,
          onDone: {
            target: 'RESEARCHER',
            actions: assign(({ event }) => ({ promptPayload: event.output })),
          },
          onError: {
            target: 'FAILED',
            actions: assign(({ context, event }) => ({
              failedAgent: 'researcher' as const,
              failureError: event.error as QAODSError,
              finalScore: context.auditResult?.score,
              iterationsUsed: context.iterationCount,
            })),
          },
        },
      },
      RESEARCHER: {
        invoke: {
          src: fromPromise(({ input }: { input: QAODSContext }) => {
            const ctx: ExecutionContext = {
              taskId: input.taskId!,
              userId: input.userId,
              iterationCount: input.iterationCount,
              promptPayload: input.promptPayload!,
              strategyResult: input.strategyResult!,
            }
            return withAgentRetry(() => runExecutor(ctx))
          }),
          input: ({ context }) => context,
          onDone: {
            target: 'EXECUTOR',
            actions: assign(({ event }) => ({ executionResult: event.output })),
          },
          onError: {
            target: 'FAILED',
            actions: assign(({ context, event }) => ({
              failedAgent: 'executor' as const,
              failureError: event.error as QAODSError,
              finalScore: context.auditResult?.score,
              iterationsUsed: context.iterationCount,
            })),
          },
        },
      },
      EXECUTOR: {
        entry: ({ context }) => {
          if (context.taskId) {
            auditLogger.append({
              taskId: context.taskId,
              eventType: 'AUDIT_STARTED',
              payload: { iterationCount: context.iterationCount },
            })
          }
        },
        invoke: {
          src: fromPromise(({ input }: { input: QAODSContext }) =>
            withAgentRetry(() => runAuditor(input.executionResult!, input.task!))
          ),
          input: ({ context }) => context,
          onDone: {
            target: 'AUDITOR',
            actions: [
              assign(({ event }) => ({ auditResult: event.output })),
              ({ context, event }) => {
                if (context.taskId) {
                  auditLogger.append({
                    taskId: context.taskId,
                    eventType: 'AUDIT_RESULT',
                    payload: { score: event.output.score, passed: event.output.passed },
                  })
                }
              },
            ],
          },
          onError: {
            target: 'FAILED',
            actions: assign(({ context, event }) => ({
              failedAgent: 'auditor' as const,
              failureError: event.error as QAODSError,
              finalScore: context.auditResult?.score,
              iterationsUsed: context.iterationCount,
            })),
          },
        },
      },
      AUDITOR: {
        always: [
          {
            guard: 'auditPassed',
            target: 'MERGED',
            actions: ({ context }) => {
              logTransition('AUDITOR', 'MERGED', { score: context.auditResult?.score, taskId: context.taskId })
              if (context.taskId) {
                auditLogger.append({
                  taskId: context.taskId,
                  eventType: 'TASK_MERGED',
                  payload: { score: context.auditResult?.score, iterationsUsed: context.iterationCount },
                })
              }
            },
          },
          {
            guard: 'canIterate',
            target: 'ITERATE',
            actions: ({ context }) => {
              logTransition('AUDITOR', 'ITERATE', { score: context.auditResult?.score, iterationCount: context.iterationCount, taskId: context.taskId })
              if (context.taskId) {
                auditLogger.append({
                  taskId: context.taskId,
                  eventType: 'ITERATION_TRIGGERED',
                  payload: { iterationCount: context.iterationCount, score: context.auditResult?.score },
                })
              }
            },
          },
          {
            target: 'FAILED',
            actions: assign(({ context }) => {
              logTransition('AUDITOR', 'FAILED', { score: context.auditResult?.score, iterationsUsed: context.iterationCount, taskId: context.taskId })
              if (context.taskId) {
                auditLogger.append({
                  taskId: context.taskId,
                  eventType: 'TASK_FAILED',
                  payload: {
                    finalScore: context.auditResult?.score,
                    iterationsUsed: context.iterationCount,
                  },
                })
              }
              return {
                failedAgent: 'auditor' as const,
                finalScore: context.auditResult?.score,
                iterationsUsed: context.iterationCount,
              }
            }),
          },
        ],
        on: {
          APPROVE: { target: 'MERGED' },
          REJECT: { target: 'FAILED' },
        },
      },
      ITERATE: {
        entry: assign(({ context }) => ({ iterationCount: context.iterationCount + 1 })),
        always: { target: 'RESEARCHER' },
      },
      MERGED: {
        on: {
          RESET: {
            target: 'IDLE',
            actions: assign(() => ({ ...initialContext })),
          },
          SELECT_TASK: {
            target: 'IDLE',
            actions: assign(({ event }) => ({
              ...initialContext,
              task: event.task as Task,
              taskId: (event.task as Task).id,
              userId: (event.task as Task).userId,
              teamId: (event.task as Task).teamId,
            })),
          },
        },
      },
      FAILED: {
        on: {
          RESET: {
            target: 'IDLE',
            actions: assign(() => ({ ...initialContext })),
          },
          SELECT_TASK: {
            target: 'IDLE',
            actions: assign(({ event }) => ({
              ...initialContext,
              task: event.task as Task,
              taskId: (event.task as Task).id,
              userId: (event.task as Task).userId,
              teamId: (event.task as Task).teamId,
            })),
          },
        },
      },
    },
  },
  {
    guards: {
      auditPassed: ({ context }) => (context.auditResult?.score ?? 0) >= HSCC_THRESHOLD,
      canIterate: ({ context }) => context.iterationCount < MAX_ITERATIONS,
    },
  }
)
