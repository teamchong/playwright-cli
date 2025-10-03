/**
 * Timeout utilities for preventing hanging operations
 */

export class TimeoutError extends Error {
  constructor(
    message: string,
    public readonly operation?: string
  ) {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * Wraps a promise with a timeout
 * @param promise The promise to wrap
 * @param timeoutMs Timeout in milliseconds
 * @param operation Optional operation name for error messages
 * @returns The result of the promise or throws TimeoutError
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation?: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const message = operation
        ? `Operation '${operation}' timed out after ${timeoutMs}ms`
        : `Operation timed out after ${timeoutMs}ms`
      reject(new TimeoutError(message, operation))
    }, timeoutMs)
    // Unref so this timer doesn't keep process alive
    timeoutId.unref()
  })

  try {
    const result = await Promise.race([promise, timeoutPromise])
    clearTimeout(timeoutId!)
    return result
  } catch (error) {
    clearTimeout(timeoutId!)
    throw error
  }
}

/**
 * Creates a timeout-protected function
 * @param fn The async function to wrap
 * @param defaultTimeoutMs Default timeout in milliseconds
 * @returns A new function that includes timeout protection
 */
export function timeoutProtected<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  defaultTimeoutMs = 5000
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    return withTimeout(fn(...args), defaultTimeoutMs, fn.name)
  }
}

/**
 * Retry an operation with exponential backoff
 * @param fn The async function to retry
 * @param maxRetries Maximum number of retries
 * @param initialDelayMs Initial delay between retries
 * @returns The result of the function or throws the last error
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 100
): Promise<T> {
  let lastError: Error
  let delay = initialDelayMs

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (i < maxRetries) {
        await new Promise(resolve => {
          const timer = setTimeout(resolve, delay)
          timer.unref() // Don't keep process alive
        })
        delay *= 2 // Exponential backoff
      }
    }
  }

  throw lastError!
}

/**
 * Ensures a promise completes within a timeout or returns a default value
 * @param promise The promise to wrap
 * @param timeoutMs Timeout in milliseconds
 * @param defaultValue Default value to return on timeout
 * @returns The result of the promise or the default value
 */
export async function withTimeoutOrDefault<T>(
  promise: Promise<T>,
  timeoutMs: number,
  defaultValue: T
): Promise<T> {
  try {
    return await withTimeout(promise, timeoutMs)
  } catch (error) {
    if (error instanceof TimeoutError) {
      return defaultValue
    }
    throw error
  }
}
