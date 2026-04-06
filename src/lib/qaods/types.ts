import type { QAODSError } from './errors'

// ── Identity ──────────────────────────────────────────────────────────────
export type TaskStatus   = 'todo' | 'active' | 'done' | 'blocked'
export type TaskPriority = 'low' | 'medium' | 'high'
export type AgentName    = 'strategist' | 'researcher' | 'executor' | 'auditor'

// ── FSM States ────────────────────────────────────────────────────────────
export type WorkflowState =
  | 'IDLE' | 'PENDING' | 'STRATEGIST' | 'RESEARCHER'
  | 'EXECUTOR' | 'AUDITOR' | 'ITERATE' | 'MERGED' | 'FAILED'

// ── Task ──────────────────────────────────────────────────────────────────
export interface Task {
  id: string
  title: string
  component: string
  filePath: string
  description: string
  priority: TaskPriority
  tags: string
  status: TaskStatus
  iterationCount: number
  userId: string
  teamId: string
  createdAt: string
  updatedAt: string
  workflowState?: WorkflowState
}

// ── Versioned persistence wrapper ─────────────────────────────────────────
export interface PersistedTask {
  schemaVersion: number
  data: Task
}

// ── Agent result types ────────────────────────────────────────────────────
export interface StrategyResult {
  validationStatus: 'valid' | 'invalid'
  scopedComponent: string
  executionPlan: string
}

export interface PromptPayload {
  systemPrompt: string
  userPrompt: string
  constraints: string[]
}

export interface PromptBudget {
  maxSystemTokens: number
  maxUserTokens: number
  maxConstraints: number
}

export interface ExecutionResult {
  delta: string
  filesChanged: string[]
  status: 'success' | 'partial' | 'failed'
}

export interface AuditResult {
  score: number           // 0–100
  passed: boolean         // score >= HSCC_THRESHOLD (85)
  breakdown: AuditBreakdown
}

export interface AuditBreakdown {
  correctness: number
  completeness: number
  scopeAdherence: number
  reasons: string[]
}

// ── Audit log ─────────────────────────────────────────────────────────────
export type AuditEventType =
  | 'AUDIT_STARTED'
  | 'AUDIT_RESULT'
  | 'TASK_MERGED'
  | 'ITERATION_TRIGGERED'
  | 'TASK_FAILED'

export interface AuditEntry {
  id: string
  taskId: string
  eventType: AuditEventType
  timestamp: string
  payload: Record<string, unknown>
}

// ── FSM context ───────────────────────────────────────────────────────────
export interface QAODSContext {
  task: Task | null
  taskId: string | null
  userId: string
  teamId: string
  strategyResult?: StrategyResult
  promptPayload?: PromptPayload
  executionResult?: ExecutionResult
  auditResult?: AuditResult
  iterationCount: number
  failedAgent?: AgentName
  failureError?: QAODSError
  finalScore?: number
  iterationsUsed?: number
}

// ── Execution context passed to executor ──────────────────────────────────
export interface ExecutionContext {
  taskId: string
  userId: string
  iterationCount: number
  promptPayload: PromptPayload
  strategyResult: StrategyResult
}
