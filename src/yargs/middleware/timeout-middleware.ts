/**
 * Global timeout middleware for all commands
 * Provides consistent timeout protection across the entire CLI
 */

import { Argv } from 'yargs'
import { withTimeout, TimeoutError } from '../../lib/timeout-utils'
import { CDPConnectionPool } from '../../lib/cdp-connection-pool'

// Default timeout for different operation types
const TIMEOUT_DEFAULTS = {
  cdp: 5000, // CDP operations
  navigation: 30000, // Page navigation
  interaction: 10000, // User interactions (click, type, etc)
  capture: 20000, // Screenshots, PDFs
  evaluation: 15000, // JavaScript execution
  default: 10000, // Fallback timeout
}

export interface TimeoutOptions {
  timeout?: number
  operationType?: keyof typeof TIMEOUT_DEFAULTS
}

/**
 * Wraps a command handler with timeout protection
 */
export function withTimeoutProtection<T extends Record<string, any>>(
  handler: (argv: T) => Promise<any>,
  options: TimeoutOptions = {}
): (argv: T) => Promise<any> {
  return async (argv: T) => {
    // Determine timeout based on options or command type
    const timeout =
      argv.timeout ||
      options.timeout ||
      TIMEOUT_DEFAULTS[options.operationType || 'default']

    // Wrap the entire command execution in a timeout
    try {
      return await withTimeout(
        handler(argv),
        timeout,
        `Command '${argv.$0} ${argv._?.join(' ')}'`
      )
    } catch (error) {
      if (error instanceof TimeoutError) {
        // Cleanup any hanging connections
        const pool = CDPConnectionPool.getInstance()
        pool.shutdown()

        console.error(`❌ ${error.message}`)
        if (argv.verbose) {
          console.error('💡 Try increasing timeout with --timeout flag')
          console.error('💡 Or check if the browser is responsive')
        }
        process.exit(1)
      }
      throw error
    }
  }
}

/**
 * Global timeout middleware for yargs
 */
export const timeoutMiddleware = (argv: any) => {
  // Add global timeout option if not present
  if (!('timeout' in argv)) {
    argv.timeout = undefined
  }
  return argv
}

/**
 * Add timeout option to command builder
 */
export function addTimeoutOption(yargs: Argv): Argv {
  return yargs.option('timeout', {
    describe: 'Command timeout in milliseconds',
    type: 'number',
    group: 'Timeout Options:',
  })
}

/**
 * Wrap browser operations with automatic timeout and error handling
 */
export async function withBrowserTimeout<T>(
  operation: () => Promise<T>,
  operationType: keyof typeof TIMEOUT_DEFAULTS = 'default',
  customTimeout?: number
): Promise<T> {
  const timeout = customTimeout || TIMEOUT_DEFAULTS[operationType]

  try {
    return await withTimeout(operation(), timeout, operationType)
  } catch (error) {
    if (error instanceof TimeoutError) {
      // Log specific guidance based on operation type
      switch (operationType) {
        case 'cdp':
          console.error(
            '💡 CDP operation timed out. The browser may be unresponsive.'
          )
          break
        case 'navigation':
          console.error(
            '💡 Navigation timed out. The page may be slow to load.'
          )
          break
        case 'interaction':
          console.error(
            '💡 Interaction timed out. The element may not be available.'
          )
          break
        case 'capture':
          console.error('💡 Capture timed out. The page may be too complex.')
          break
        case 'evaluation':
          console.error(
            '💡 Script execution timed out. The script may be stuck.'
          )
          break
      }
    }
    throw error
  }
}
