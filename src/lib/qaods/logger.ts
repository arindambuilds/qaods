export type LogLevel  = 'debug' | 'info' | 'warn' | 'error'
export type LogDomain = 'agent' | 'fsm' | 'persistence' | 'ui' | 'audit'

export interface LogEvent {
  level: LogLevel
  domain: LogDomain
  event: string
  timestamp: string          // ISO-8601
  sessionId: string
  [key: string]: unknown     // arbitrary structured fields
}

export interface LogTransport {
  name: string
  filterLevel: LogLevel      // minimum level to emit
  emit(event: LogEvent): void
}

export interface QAODSLogger {
  debug(event: string, fields?: Record<string, unknown>): void
  info(event: string, fields?: Record<string, unknown>): void
  warn(event: string, fields?: Record<string, unknown>): void
  error(event: string, fields?: Record<string, unknown>): void
  setDomain(domain: LogDomain): QAODSLogger   // returns scoped child logger
  addTransport(transport: LogTransport): void
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

function shouldEmit(eventLevel: LogLevel, filterLevel: LogLevel): boolean {
  return LEVEL_ORDER[eventLevel] >= LEVEL_ORDER[filterLevel]
}

const SESSION_ID = typeof crypto !== 'undefined' && crypto.randomUUID
  ? crypto.randomUUID()
  : Math.random().toString(36).slice(2)

export class ConsoleTransport implements LogTransport {
  name = 'console'
  filterLevel: LogLevel
  private pretty: boolean

  constructor(opts: { filterLevel?: LogLevel; pretty?: boolean } = {}) {
    this.filterLevel = opts.filterLevel ?? 'debug'
    this.pretty = opts.pretty ?? (process.env.NODE_ENV !== 'production')
  }

  emit(event: LogEvent): void {
    if (!shouldEmit(event.level, this.filterLevel)) return
    if (this.pretty) {
      console[event.level](`[${event.domain}] ${event.event}`, event)
    } else {
      console[event.level](JSON.stringify(event))
    }
  }
}

export class LocalStorageTransport implements LogTransport {
  name = 'localStorage'
  filterLevel: LogLevel = 'info'

  emit(event: LogEvent): void {
    if (!shouldEmit(event.level, this.filterLevel)) return
    if (typeof window === 'undefined') return
    const key = `qaods:log:${event.sessionId}:${event.timestamp.slice(0, 10)}`
    const existing = JSON.parse(localStorage.getItem(key) ?? '[]') as LogEvent[]
    existing.push(event)
    localStorage.setItem(key, JSON.stringify(existing))
  }
}

export class RemoteTransport implements LogTransport {
  name = 'remote'
  filterLevel: LogLevel = 'warn'
  emit(_event: LogEvent): void { /* TODO: POST to /api/logs */ }
}

class QAODSLoggerImpl implements QAODSLogger {
  private transports: LogTransport[] = []
  private domain: LogDomain

  constructor(domain: LogDomain, transports: LogTransport[] = []) {
    this.domain = domain
    this.transports = transports
  }

  private emit(level: LogLevel, event: string, fields?: Record<string, unknown>): void {
    const logEvent: LogEvent = {
      level,
      domain: this.domain,
      event,
      timestamp: new Date().toISOString(),
      sessionId: SESSION_ID,
      ...fields,
    }
    for (const transport of this.transports) {
      transport.emit(logEvent)
    }
  }

  debug(event: string, fields?: Record<string, unknown>): void { this.emit('debug', event, fields) }
  info(event: string, fields?: Record<string, unknown>): void { this.emit('info', event, fields) }
  warn(event: string, fields?: Record<string, unknown>): void { this.emit('warn', event, fields) }
  error(event: string, fields?: Record<string, unknown>): void { this.emit('error', event, fields) }

  setDomain(domain: LogDomain): QAODSLogger {
    return new QAODSLoggerImpl(domain, this.transports)
  }

  addTransport(transport: LogTransport): void {
    this.transports.push(transport)
  }
}

function createLogger(opts: { domain: LogDomain; transports: LogTransport[] }): QAODSLogger {
  return new QAODSLoggerImpl(opts.domain, opts.transports)
}

export const logger: QAODSLogger = createLogger({
  domain: 'agent',
  transports: [
    new ConsoleTransport({ filterLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug' }),
    new LocalStorageTransport(),
  ],
})
