import { ValidationError, FSMError } from './errors'

interface RetryOptions {
  maxRetries?: number          // default 3
  baseDelayMs?: number         // default 500
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

// Backoff schedule: 500ms → 1000ms → 2000ms
export async function withAgentRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const maxRetries = opts.maxRetries ?? 3
  const baseDelay = opts.baseDelayMs ?? 500
  let attempt = 0

  while (true) {
    try {
      return await fn()
    } catch (error) {
      if (error instanceof ValidationError || error instanceof FSMError) {
        throw error  // non-retryable, propagate immediately
      }

      attempt++
      if (attempt > maxRetries) {
        throw error
      }

      const delay = baseDelay * Math.pow(2, attempt - 1)  // 500, 1000, 2000
      await sleep(delay)
    }
  }
}
