import chalk from 'chalk'
import winston from 'winston'

/**
 * Log levels in order of priority.
 * Used to control logging verbosity and output filtering.
 */
export enum LogLevel {
  /** Critical errors that stop execution */
  ERROR = 'error',
  /** Warning messages for potential issues */
  WARN = 'warn',
  /** General information messages */
  INFO = 'info',
  /** Detailed debugging information */
  DEBUG = 'debug',
}

// Custom format for CLI output with colors
const cliFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp }) => {
    const colorMap = {
      error: chalk.red,
      warn: chalk.yellow,
      info: chalk.cyan,
      debug: chalk.gray,
    }

    const colorFn = colorMap[level as keyof typeof colorMap] || chalk.white
    const prefix = level === 'info' ? '' : `[${level.toUpperCase()}] `

    return colorFn(`${prefix}${message}`)
  })
)

// JSON format for file logging
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
)

/**
 * Enhanced logger service using Winston for structured logging.
 * Provides colored console output and optional file logging.
 * Supports different log levels and environment-based configuration.
 *
 * @example
 * ```typescript
 * import { logger } from './lib/logger';
 *
 * logger.info('Application started');
 * logger.warn('Deprecated feature used');
 * logger.error('Failed to connect', new Error('Connection refused'));
 * logger.debug('Processing user input');
 * ```
 */
class Logger {
  private winston: winston.Logger

  constructor() {
    // Default to info level, can be overridden via env var
    const logLevel = process.env.LOG_LEVEL || 'info'

    this.winston = winston.createLogger({
      level: logLevel,
      exitOnError: false, // Don't exit on error
      transports: [
        // Console output for CLI users
        new winston.transports.Console({
          format: cliFormat,
          level: logLevel,
          handleExceptions: false,
          handleRejections: false,
        }),

        // Optional file logging (only if LOG_FILE is set)
        ...(process.env.LOG_FILE
          ? [
              new winston.transports.File({
                filename: process.env.LOG_FILE,
                format: fileFormat,
                level: 'debug', // Log all levels to file
              }),
            ]
          : []),
      ],
    })
  }

  error(message: string, error?: Error): void {
    if (error?.stack) {
      this.winston.error(message, { error: error.message, stack: error.stack })
    } else {
      this.winston.error(message)
    }
  }

  warn(message: string): void {
    this.winston.warn(message)
  }

  info(message: string): void {
    this.winston.info(message)
  }

  debug(message: string): void {
    this.winston.debug(message)
  }

  success(message: string): void {
    // Special case for success messages - always show in green
    console.log(chalk.green(`✅ ${message}`))
  }

  // Convenience method for command completion
  commandSuccess(message: string): void {
    this.success(message)
  }

  // Convenience method for command errors
  commandError(message: string, error?: Error): void {
    const errorMsg = error ? `${message}: ${error.message}` : message
    this.error(`❌ ${errorMsg}`, error)
  }

  // Set log level dynamically
  setLevel(level: LogLevel): void {
    this.winston.transports.forEach(transport => {
      if (transport instanceof winston.transports.Console) {
        transport.level = level
      }
    })
  }

  // Ensure clean shutdown
  close(): void {
    this.winston.end()
  }
}

// Export singleton instance
export const logger = new Logger()

// Export for testing/custom instances
export { Logger }
