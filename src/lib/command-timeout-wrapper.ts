/**
 * Command Timeout Wrapper
 * Provides a global solution for wrapping all command executions with timeout protection
 */

import { withTimeout, TimeoutError } from './timeout-utils'
import { Page } from 'playwright'

// Global timeout configuration
export const COMMAND_TIMEOUTS = {
  // CDP operations
  cdp: 2000,
  browserConnect: 5000,
  tabOperation: 3000,

  // User operations
  navigation: 30000,
  interaction: 10000,
  evaluation: 15000,
  capture: 20000,

  // File operations
  fileOperation: 5000,

  // Default fallback
  default: 10000,
}

/**
 * Wrap any async operation with appropriate timeout
 */
export async function withCommandTimeout<T>(
  operation: Promise<T>,
  operationType: keyof typeof COMMAND_TIMEOUTS = 'default',
  operationName?: string
): Promise<T> {
  const timeout = COMMAND_TIMEOUTS[operationType]
  const name = operationName || operationType

  try {
    return await withTimeout(operation, timeout, name)
  } catch (error) {
    if (error instanceof TimeoutError) {
      // Clean up and provide helpful error message
      console.error(`❌ Operation timed out: ${name}`)
      console.error(`💡 This usually means:`)

      switch (operationType) {
        case 'cdp':
          console.error('   - The browser is unresponsive')
          console.error('   - The tab ID might be invalid')
          break
        case 'navigation':
          console.error('   - The page is taking too long to load')
          console.error('   - Network issues or slow server')
          break
        case 'interaction':
          console.error('   - The element is not available')
          console.error("   - The page hasn't finished loading")
          break
        default:
          console.error('   - The operation is taking longer than expected')
      }

      // Re-throw with cleaner error
      throw new Error(`${name} timed out after ${timeout}ms`)
    }
    throw error
  }
}

/**
 * Create a timeout-protected version of a function
 */
export function createTimeoutProtectedFunction<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  operationType: keyof typeof COMMAND_TIMEOUTS = 'default'
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    return withCommandTimeout(fn(...args), operationType, fn.name)
  }
}

/**
 * Wrap page operations with timeout
 */
export function wrapPageWithTimeout(page: Page): Page {
  // Create a proxy that wraps all async methods with timeout
  return new Proxy(page, {
    get(target, prop) {
      const original = target[prop as keyof Page]

      // Only wrap async functions
      if (typeof original === 'function') {
        return function (...args: any[]) {
          const result = (original as any).apply(target, args)

          // If it returns a promise, wrap with timeout
          if (result && typeof result.then === 'function') {
            // Determine operation type based on method name
            let operationType: keyof typeof COMMAND_TIMEOUTS = 'default'

            const methodName = String(prop)
            if (
              methodName.includes('goto') ||
              methodName.includes('navigate')
            ) {
              operationType = 'navigation'
            } else if (
              methodName.includes('click') ||
              methodName.includes('type') ||
              methodName.includes('fill')
            ) {
              operationType = 'interaction'
            } else if (methodName.includes('eval')) {
              operationType = 'evaluation'
            } else if (
              methodName.includes('screenshot') ||
              methodName.includes('pdf')
            ) {
              operationType = 'capture'
            }

            return withCommandTimeout(
              result,
              operationType,
              `page.${methodName}`
            )
          }

          return result
        }
      }

      return original
    },
  })
}
