import { performance } from 'perf_hooks'

export interface RetryConfig {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
  timeoutMs: number
  retryableErrors: string[]
}

export interface RetryMetrics {
  totalAttempts: number
  successfulAttempts: number
  failedAttempts: number
  totalRetryTime: number
  lastError?: Error
  circuitBreakerState: 'closed' | 'open' | 'half-open'
}

export interface RetryableOperation<T> {
  (): Promise<T>
}

/**
 * Abstract base class for retry strategies
 */
export abstract class RetryStrategy {
  protected metrics: RetryMetrics = {
    totalAttempts: 0,
    successfulAttempts: 0,
    failedAttempts: 0,
    totalRetryTime: 0,
    circuitBreakerState: 'closed',
  }

  constructor(protected config: RetryConfig) {}

  abstract calculateDelay(attempt: number): number

  async execute<T>(operation: RetryableOperation<T>): Promise<T> {
    const startTime = performance.now()
    let lastError: Error = new Error('Operation failed')

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      this.metrics.totalAttempts++

      try {
        // Check circuit breaker state
        if (this.metrics.circuitBreakerState === 'open') {
          throw new Error('Circuit breaker is open - operation blocked')
        }

        const result = await this.executeWithTimeout(operation)
        this.metrics.successfulAttempts++

        // Reset circuit breaker on success
        if (this.metrics.circuitBreakerState === 'half-open') {
          this.metrics.circuitBreakerState = 'closed'
        }

        this.metrics.totalRetryTime = performance.now() - startTime
        return result
      } catch (error: any) {
        lastError = error
        this.metrics.failedAttempts++
        this.metrics.lastError = error

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          this.updateCircuitBreaker(false)
          throw error
        }

        // If this was the last attempt, fail
        if (attempt === this.config.maxAttempts) {
          this.updateCircuitBreaker(false)
          break
        }

        // Calculate delay and wait
        const delay = this.calculateDelay(attempt)
        await this.delay(delay)
      }
    }

    this.metrics.totalRetryTime = performance.now() - startTime
    throw new Error(
      `Operation failed after ${this.config.maxAttempts} attempts. Last error: ${lastError.message}`
    )
  }

  private async executeWithTimeout<T>(
    operation: RetryableOperation<T>
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(`Operation timed out after ${this.config.timeoutMs}ms`)
        )
      }, this.config.timeoutMs)

      operation()
        .then(result => {
          clearTimeout(timeout)
          resolve(result)
        })
        .catch(error => {
          clearTimeout(timeout)
          reject(error)
        })
    })
  }

  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase()
    return this.config.retryableErrors.some(retryableError =>
      message.includes(retryableError.toLowerCase())
    )
  }

  private updateCircuitBreaker(success: boolean): void {
    if (!success) {
      // Simple circuit breaker: open after 3 consecutive failures
      if (this.metrics.failedAttempts >= 3) {
        this.metrics.circuitBreakerState = 'open'
        // Auto-reset to half-open after 30 seconds
        setTimeout(() => {
          if (this.metrics.circuitBreakerState === 'open') {
            this.metrics.circuitBreakerState = 'half-open'
          }
        }, 30000)
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getMetrics(): RetryMetrics {
    return { ...this.metrics }
  }

  resetMetrics(): void {
    this.metrics = {
      totalAttempts: 0,
      successfulAttempts: 0,
      failedAttempts: 0,
      totalRetryTime: 0,
      circuitBreakerState: 'closed',
    }
  }
}

/**
 * Linear retry strategy - increases delay linearly
 */
export class LinearRetryStrategy extends RetryStrategy {
  calculateDelay(attempt: number): number {
    const delay = this.config.baseDelayMs * attempt
    return Math.min(delay, this.config.maxDelayMs)
  }
}

/**
 * Exponential backoff retry strategy - increases delay exponentially
 */
export class ExponentialRetryStrategy extends RetryStrategy {
  calculateDelay(attempt: number): number {
    const delay = this.config.baseDelayMs * Math.pow(2, attempt - 1)
    return Math.min(delay, this.config.maxDelayMs)
  }
}

/**
 * Fixed delay retry strategy - uses the same delay between attempts
 */
export class FixedRetryStrategy extends RetryStrategy {
  calculateDelay(_attempt: number): number {
    return this.config.baseDelayMs
  }
}

/**
 * Factory for creating retry strategies
 */
export class RetryStrategyFactory {
  static create(
    type: 'linear' | 'exponential' | 'fixed',
    config: RetryConfig
  ): RetryStrategy {
    switch (type) {
      case 'linear':
        return new LinearRetryStrategy(config)
      case 'exponential':
        return new ExponentialRetryStrategy(config)
      case 'fixed':
        return new FixedRetryStrategy(config)
      default:
        throw new Error(`Unknown retry strategy type: ${type}`)
    }
  }
}

/**
 * Pre-configured retry configurations for different command types
 */
export const RetryConfigs: Record<string, RetryConfig> = {
  // For browser connection operations
  browser: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 5000,
    timeoutMs: 10000,
    retryableErrors: [
      'no browser running',
      'connection refused',
      'timeout',
      'network error',
      'browser closed',
    ],
  },

  // For page interaction operations
  interaction: {
    maxAttempts: 2,
    baseDelayMs: 500,
    maxDelayMs: 2000,
    timeoutMs: 5000,
    retryableErrors: [
      'element not found',
      'element not visible',
      'element not clickable',
      'timeout waiting for',
      'navigation timeout',
    ],
  },

  // For network-related operations
  network: {
    maxAttempts: 5,
    baseDelayMs: 2000,
    maxDelayMs: 10000,
    timeoutMs: 15000,
    retryableErrors: [
      'network error',
      'connection refused',
      'timeout',
      'dns resolution failed',
      'socket hang up',
    ],
  },

  // For file operations
  file: {
    maxAttempts: 2,
    baseDelayMs: 100,
    maxDelayMs: 1000,
    timeoutMs: 5000,
    retryableErrors: [
      'file not found',
      'permission denied',
      'resource busy',
      'operation not permitted',
    ],
  },
} as const
