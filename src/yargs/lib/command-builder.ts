/**
 * Command Builder Pattern for Yargs Commands
 *
 * This module provides a standardized way to create Yargs commands with:
 * - Consistent error handling
 * - Logging utilities
 * - Validation helpers
 * - Common middleware
 * - Type safety
 */

import type { CommandModule, ArgumentsCamelCase, Argv } from 'yargs'
import chalk from 'chalk'
import ora, { Ora } from 'ora'
import { BrowserHelper } from '../../lib/browser-helper'
import { logger } from '../../lib/logger'
import {
  withTimeout as withTimeoutUtil,
  TimeoutError,
} from '../../lib/timeout-utils'
import type {
  BaseCommandOptions,
  PlaywrightCommand,
  CommandHandler,
  CommandMetadata,
  CommandResult,
  Logger,
} from '../types'

// Default timeouts by command category (in milliseconds)
const DEFAULT_TIMEOUTS: Record<string, number> = {
  'navigation': 30000,
  'interaction': 10000,
  'capture': 20000,
  'advanced': 15000,
  'utility': 10000,
  'browser management': 5000,
}

/**
 * Get default timeout for a command category
 */
function getDefaultTimeout(category?: string): number {
  return DEFAULT_TIMEOUTS[category || ''] || 10000
}

/**
 * Command execution context that's passed to handlers
 */
export interface CommandContext<
  T extends BaseCommandOptions = BaseCommandOptions,
> {
  argv: ArgumentsCamelCase<T>
  spinner?: Ora
  logger: Logger
  startTime: number
}

/**
 * Options for creating a command
 */
export interface CreateCommandOptions<T extends BaseCommandOptions> {
  metadata: CommandMetadata
  command: string
  describe: string
  builder: (yargs: Argv) => Argv<T> | { [key: string]: any }
  handler: (context: CommandContext<T>) => Promise<void>
  middleware?: Array<(argv: ArgumentsCamelCase<T>) => void | Promise<void>>
  validateArgs?: (argv: ArgumentsCamelCase<T>) => void | string
  requiresBrowser?: boolean
  supportsJson?: boolean
}

/**
 * Creates a standardized Yargs command with common patterns
 */
export function createCommand<T extends BaseCommandOptions>(
  options: CreateCommandOptions<T>
): PlaywrightCommand<T> {
  const {
    metadata,
    command,
    describe,
    builder,
    handler,
    middleware = [],
    validateArgs,
    requiresBrowser = true,
    supportsJson = true,
  } = options

  return {
    command,
    describe,
    aliases: metadata.aliases,

    builder: (yargs: Argv) => {
      // Apply the custom builder
      const built =
        typeof builder === 'function' ? builder(yargs) : yargs.options(builder)

      // Add category for help grouping
      return built.group([], `${metadata.category} Commands:`)
    },

    handler: async (argv: ArgumentsCamelCase<T>) => {
      const startTime = Date.now()
      let spinner: Ora | undefined

      try {
        // Run middleware
        for (const mw of middleware) {
          await mw(argv)
        }

        // Validate arguments if validator provided
        if (validateArgs) {
          const error = validateArgs(argv)
          if (error) {
            throw new Error(error)
          }
        }

        // Create logger based on output preferences
        const commandLogger = createLogger(argv)

        // Create spinner if not in quiet or json mode AND we're in a TTY
        // Ora spinners can hang in non-TTY environments (like when run through execSync)
        const isTTY = process.stdout.isTTY && process.stderr.isTTY
        if (!argv.quiet && !argv.json && isTTY) {
          spinner = ora()
        }

        // Create context
        const context: CommandContext<T> = {
          argv,
          spinner,
          logger: commandLogger,
          startTime,
        }


        // Always skip timeout wrapper in tests - it causes more problems than it solves
        const isTest = process.env.NODE_ENV?.includes('test') ||
                       process.env.VITEST ||
                       process.env.PLAYWRIGHT_CLI_HEADLESS

        if (isTest) {
          await handler(context)
        } else {
          // Use category default timeout for command execution
          // Don't use argv.timeout here - that's for operation-specific timeouts (like wait duration)
          const commandTimeout = getDefaultTimeout(metadata.category)
          await withTimeoutUtil(handler(context), commandTimeout, `Command ${command}`)
        }


        // Success - stop spinner if running
        if (spinner?.isSpinning) {
          spinner.succeed()
        }

        // Log execution time in verbose mode
        if (argv.verbose) {
          const duration = Date.now() - startTime
          commandLogger.debug(`Command completed in ${duration}ms`)
        }

        // Success - handler completed without throwing
      } catch (error: any) {
        // Error handling
        if (spinner?.isSpinning) {
          spinner.fail()
        }

        if (argv.json && supportsJson) {
          // Output error as JSON
          const result: CommandResult = {
            success: false,
            error: error.message,
          }
          console.log(JSON.stringify(result, null, 2))
        } else {
          // Output error to stderr
          console.error(chalk.red('Error:'), error.message)

          if (argv.verbose && error.stack) {
            console.error(chalk.gray(error.stack))
          }
        }

        // Re-throw the error for yargs to handle
        throw error
      }
    },
  }
}

/**
 * Creates a logger instance based on command options
 */
export function createLogger(argv: BaseCommandOptions): Logger {
  return {
    info: (message: string) => {
      if (!argv.quiet && !argv.json) {
        console.log(message)
      }
    },

    success: (message: string) => {
      if (!argv.quiet && !argv.json) {
        console.log(chalk.green('✅'), message)
      }
    },

    error: (message: string) => {
      if (!argv.json) {
        console.error(chalk.red('❌'), message)
      }
    },

    warn: (message: string) => {
      if (!argv.quiet && !argv.json) {
        console.warn(chalk.yellow('⚠️'), message)
      }
    },

    debug: (_message: string) => {},

    json: (data: any) => {
      if (argv.json) {
        console.log(JSON.stringify(data, null, 2))
      }
    },
  }
}

/**
 * Common validation helpers
 */
export const validators = {
  /**
   * Validates that a URL is well-formed
   */
  isValidUrl: (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  },

  /**
   * Validates that a port number is valid
   */
  isValidPort: (port: number): boolean => {
    return Number.isInteger(port) && port > 0 && port <= 65535
  },

  /**
   * Validates that a selector is not empty
   */
  isValidSelector: (selector: string): boolean => {
    return Boolean(selector && selector.trim().length > 0)
  },

  /**
   * Validates file path exists (for upload commands, etc.)
   */
  fileExists: async (path: string): Promise<boolean> => {
    const fs = await import('fs/promises')
    try {
      await fs.access(path)
      return true
    } catch {
      return false
    }
  },
}

/**
 * Helper to create a browser-based command
 */
export function createBrowserCommand<T extends BaseCommandOptions>(
  options: Omit<CreateCommandOptions<T>, 'requiresBrowser'> & {
    browserHandler: (page: any, context: CommandContext<T>) => Promise<void>
  }
): PlaywrightCommand<T> {
  const { browserHandler, ...rest } = options

  return createCommand({
    ...rest,
    requiresBrowser: true,
    handler: async context => {
      const { argv, spinner } = context

      if (spinner) {
        spinner.start('Connecting to browser...')
      }

      await BrowserHelper.withActivePage(argv.port, async page => {
        if (spinner) {
          spinner.text = 'Executing command...'
        }

        await browserHandler(page, context)
      })
    },
  })
}

/**
 * Middleware for handling ref selectors
 */
export async function refSelectorMiddleware<T extends { selector?: string }>(
  argv: ArgumentsCamelCase<T>
): Promise<void> {
  // Middleware for ref selectors if needed in the future
  // Currently refs use simple [A], [B], [C] format
  return
}

/**
 * Middleware for parsing modifier keys
 */
export function modifierMiddleware<T extends BaseCommandOptions>(
  argv: ArgumentsCamelCase<T>
): void {
  // Parse modifier flags into an array
  const modifiers: string[] = []

  if ((argv as any).shift === true) modifiers.push('Shift')
  if ((argv as any).ctrl === true) modifiers.push('Control')
  if ((argv as any).alt === true) modifiers.push('Alt')
  if ((argv as any).meta === true) modifiers.push('Meta')
  if ((argv as any)['ctrl-or-meta'] === true)
    modifiers.push('ControlOrMeta')

    // Add modifiers array to argv
  ;(argv as any).modifiers = modifiers
}

/**
 * Helper to format command output
 */
export function formatOutput(
  data: any,
  format: 'json' | 'table' | 'list' = 'list'
): string {
  switch (format) {
    case 'json':
      return JSON.stringify(data, null, 2)

    case 'table':
      // Simple table formatting
      if (Array.isArray(data) && data.length > 0) {
        const keys = Object.keys(data[0])
        const header = keys.join('\t')
        const rows = data.map(item =>
          keys.map(key => String(item[key] ?? '')).join('\t')
        )
        return [header, ...rows].join('\n')
      }
      return String(data)

    case 'list':
    default:
      if (Array.isArray(data)) {
        return data.map((item, i) => `${i + 1}. ${String(item)}`).join('\n')
      }
      return String(data)
  }
}

/**
 * Helper to handle async operations with timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  })

  return Promise.race([promise, timeout])
}

/**
 * Helper to retry operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | undefined

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error

      if (i < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
  }

  throw lastError || new Error('Operation failed after retries')
}

/**
 * Export a command registry for tracking all commands
 */
export class CommandRegistry {
  private commands: Map<string, CommandMetadata> = new Map()

  register(command: string, metadata: CommandMetadata): void {
    this.commands.set(command, metadata)
  }

  get(command: string): CommandMetadata | undefined {
    return this.commands.get(command)
  }

  getAll(): CommandMetadata[] {
    return Array.from(this.commands.values())
  }

  getByCategory(category: string): CommandMetadata[] {
    return this.getAll().filter(cmd => cmd.category === category)
  }
}

// Global command registry instance
export const commandRegistry = new CommandRegistry()
