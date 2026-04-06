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

// ═══════════════════════════════════════════════════════════════════════════
// Critical Document domain
// ═══════════════════════════════════════════════════════════════════════════

// ── Doc type registry ─────────────────────────────────────────────────────
// Add new document types here as the domain grows.
export type DocType = 'exam_form_cbse_v1' | 'resume_simple_v1'

// ── Field schema ──────────────────────────────────────────────────────────
// Describes a single fillable field in a document template.
export interface DocField {
  id: string
  label: string
  type: 'text' | 'number' | 'date' | 'select'
  required: boolean
  options?: string[]      // for type === 'select'
  pattern?: string        // regex validation string
  minLength?: number
  maxLength?: number
}

// ── Audit types ───────────────────────────────────────────────────────────
export type DocIssueSeverity = 'error' | 'warn'

export interface DocIssue {
  fieldId: string | null  // null = document-level issue (not field-specific)
  severity: DocIssueSeverity
  code: string            // machine-readable, e.g. 'REQUIRED_MISSING', 'PATTERN_MISMATCH'
  message: string         // human-readable
}

export interface DocAuditResult {
  score: number           // 0–100, same scale as QAODSContext.auditResult
  passed: boolean         // score >= DOC_AUDIT_THRESHOLD (defined in criticalDocMachine)
  issues: DocIssue[]
}

// ── FSM context for the Critical Doc pipeline ─────────────────────────────
// Intentionally separate from QAODSContext — the two machines are independent.
// Both follow the same Q-AODS FSM patterns (PENDING → ... → MERGED/FAILED,
// score-gated retries, withAgentRetry, auditLogger).
export interface CriticalDocContext {
  // Session identity
  sessionId: string
  userId: string

  // Document being processed
  docType: DocType | null
  fieldsManifest: DocField[]      // loaded from the doc template registry
  userInputs: Record<string, string>  // fieldId → raw user value

  // Pipeline results (cleared on RESET)
  generatedDoc: string | null     // rendered HTML or JSON string
  auditResult: DocAuditResult | null

  // Iteration tracking — mirrors QAODSContext shape
  iterationCount: number

  // Failure info (set on FAILED transition)
  failedAgent?: string
  failureError?: import('./errors').QAODSError
  finalScore?: number
  iterationsUsed?: number
}

// ── Agent result types for the Critical Doc pipeline ──────────────────────
export interface DocGenerationResult {
  generatedDoc: string    // rendered output (HTML or JSON)
  fieldsUsed: string[]    // fieldIds that were included
}

export interface DocValidationResult {
  validationStatus: 'valid' | 'invalid'
  issues: DocIssue[]
}

// ── Rule engine ───────────────────────────────────────────────────────────
// A Rule is a pure function: given normalised inputs, it returns zero or more
// DocIssues. Rules are stored in the template and evaluated by the Auditor.
export type RuleId = string

export interface Rule {
  id: RuleId
  description: string
  // Weight used in the Auditor's scoring (0–1, must sum to ≤ 1 across all rules)
  weight: number
  evaluate: (inputs: Record<string, string>) => DocIssue[]
}

// ── Critical Doc agent result types ───────────────────────────────────────
export interface CriticalDocStrategyResult {
  docType: DocType
  templateId: string
  fieldsManifest: DocField[]
}

export interface CriticalDocResearchResult {
  rules: Rule[]
  lastVerifiedAt: string
}

export interface CriticalDocExecutionResult {
  normalizedInputs: Record<string, string>
  generatedDoc: string    // HTML stub
}

// ── Template shape ────────────────────────────────────────────────────────
export interface DocTemplate {
  id: string
  version: number
  docType: DocType
  fieldsManifest: DocField[]
  rules: Rule[]
  lastVerifiedAt: string  // ISO-8601
}
