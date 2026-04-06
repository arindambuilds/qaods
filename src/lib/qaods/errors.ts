export type QAODSErrorCode =
  | 'VALIDATION_ERROR'
  | 'FSM_ERROR'
  | 'EXECUTION_ERROR'
  | 'AUDIT_ERROR'
  | 'PERSISTENCE_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR'

export abstract class QAODSError extends Error {
  abstract readonly code: QAODSErrorCode
  readonly retryable: boolean
  constructor(message: string, retryable = false) {
    super(message)
    this.name = this.constructor.name
    this.retryable = retryable
  }
}

export class ValidationError extends QAODSError {
  readonly code = 'VALIDATION_ERROR' as const
  constructor(message: string) { super(message, false) }
}

export class FSMError extends QAODSError {
  readonly code = 'FSM_ERROR' as const
  constructor(message: string) { super(message, false) }
}

export class ExecutionError extends QAODSError {
  readonly code = 'EXECUTION_ERROR' as const
  constructor(message: string) { super(message, true) }
}

export class AuditError extends QAODSError {
  readonly code = 'AUDIT_ERROR' as const
  constructor(message: string) { super(message, true) }
}

export class PersistenceError extends QAODSError {
  readonly code = 'PERSISTENCE_ERROR' as const
  constructor(message: string) { super(message, true) }
}

export class NetworkError extends QAODSError {
  readonly code = 'NETWORK_ERROR' as const
  constructor(message: string) { super(message, true) }
}
