#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import chalk from 'chalk'
import { CommandModule } from 'yargs'

/**
 * Main Yargs CLI Entry Point
 *
 * This replaces the Commander.js + minimist hybrid architecture with a single,
 * unified Yargs-based CLI that provides:
 *
 * 1. Clean parse() method for testing without execution
 * 2. Built-in TypeScript type inference for all commands
 * 3. Consistent argument parsing without preprocessing
 * 4. Proper middleware support for global options
 * 5. Better error handling and validation
 */

// Command imports will be added as they're migrated
// Navigation commands
import { navigateCommand } from './commands/navigation/navigate'
import { backCommand } from './commands/navigation/back'
import { openCommand } from './commands/navigation/open'
import { closeCommand } from './commands/navigation/close'
import { tabsCommand } from './commands/navigation/tabs'
import { waitCommand } from './commands/navigation/wait'

// Interaction commands
import { clickCommand } from './commands/interaction/click'
import { hoverCommand } from './commands/interaction/hover'
import { typeCommand } from './commands/interaction/type'
import { fillCommand } from './commands/interaction/fill'
import { selectCommand } from './commands/interaction/select'
import { dragCommand } from './commands/interaction/drag'
import { pressCommand } from './commands/interaction/press'
import { uploadCommand } from './commands/interaction/upload'

// Capture commands
import { screenshotCommand } from './commands/capture/screenshot'
import { pdfCommand } from './commands/capture/pdf'
import { snapshotCommand } from './commands/capture/snapshot'
import { listCommand } from './commands/capture/list'
import { resizeCommand } from './commands/capture/resize'

// Advanced commands
import { evalCommand } from './commands/advanced/eval'
import { execCommand } from './commands/advanced/exec'
import { consoleCommand } from './commands/advanced/console'
import { networkCommand } from './commands/advanced/network'
import { dialogCommand } from './commands/advanced/dialog'
import { perfCommand } from './commands/advanced/perf'

// Utility commands
import { codegenCommand } from './commands/utility/codegen'
import { testCommand } from './commands/utility/test'
import { sessionCommand } from './commands/utility/session'
import { installCommand } from './commands/utility/install'
import { claudeCommand } from './commands/utility/claude'

/**
 * Global CLI options interface
 * These options are available to all commands
 */
export interface GlobalOptions {
  'port': number
  'verbose'?: boolean
  'quiet'?: boolean
  'json'?: boolean
  'no-color'?: boolean
}

/**
 * Create the Yargs CLI instance
 *
 * @param argv - Optional argv array for testing (defaults to process.argv)
 * @returns Configured Yargs instance
 */
export function createCli(argv?: string[]) {
  const cli = yargs(argv || hideBin(process.argv))
    .scriptName('playwright')
    .usage('$0 <command> [options]')

    // Global options available to all commands
    .option('port', {
      alias: 'p',
      describe: 'Chrome debugging port',
      type: 'number',
      default: 9222,
      global: true,
    })
    .option('verbose', {
      describe: 'Show verbose output',
      type: 'boolean',
      default: false,
      global: true,
    })
    .option('quiet', {
      alias: 'q',
      describe: 'Suppress output',
      type: 'boolean',
      default: false,
      global: true,
    })
    .option('json', {
      describe: 'Output results as JSON',
      type: 'boolean',
      default: false,
      global: true,
    })
    .option('color', {
      describe: 'Enable colored output',
      type: 'boolean',
      default: true,
      global: true,
    })

    // Command registration
    // Navigation commands
    .command(navigateCommand)
    .command(backCommand)
    .command(openCommand)
    .command(closeCommand)
    .command(tabsCommand)
    .command(waitCommand)

    // Interaction commands
    .command(clickCommand)
    .command(hoverCommand)
    .command(typeCommand)
    .command(fillCommand)
    .command(selectCommand)
    .command(dragCommand)
    .command(pressCommand)
    .command(uploadCommand)

    // Capture commands
    .command(screenshotCommand)
    .command(pdfCommand)
    .command(snapshotCommand)
    .command(listCommand)
    .command(resizeCommand)

    // Advanced commands
    .command(evalCommand)
    .command(execCommand)
    .command(consoleCommand)
    .command(networkCommand)
    .command(dialogCommand)
    .command(perfCommand)

    // Utility commands
    .command(codegenCommand)
    .command(testCommand)
    .command(sessionCommand)
    .command(installCommand)
    .command(claudeCommand)

    // CLI configuration
    // Only demand command in production
    .demandCommand(
      process.env.NODE_ENV === 'test' ? 0 : 1,
      'You need at least one command'
    )
    .recommendCommands()
    .strict()
    .help()
    .alias('h', 'help')
    .version()
    .alias('v', 'version')

    // Error handling
    .fail((msg, err, yargs) => {
      // Don't exit in test environment
      if (process.env.NODE_ENV === 'test') {
        throw err || new Error(msg)
      }

      if (err) {
        // Handle actual errors
        console.error(chalk.red('Error:'), err.message)
        if (process.env.DEBUG) {
          console.error(err.stack)
        }
      } else {
        // Handle parsing errors
        console.error(chalk.red('Error:'), msg)
        console.error()
        yargs.showHelp()
      }
      process.exit(1)
    })

    // Middleware for global preprocessing using our middleware chain
    .middleware(async argv => {
      const { globalMiddlewareChain } = await import(
        './middleware/global-options'
      )
      await globalMiddlewareChain(argv)
    }, true) // Apply before command handlers

  return cli
}

/**
 * Register a command with the CLI
 * This helper ensures consistent command registration
 */
export function registerCommand(
  cli: ReturnType<typeof createCli>,
  command: CommandModule
) {
  return cli.command(command)
}

/**
 * Export the default CLI instance for production use
 */
export const cli = createCli()

/**
 * Main entry point when run directly
 */
if (require.main === module) {
  // Parse and execute
  cli.parse()
}

/**
 * Export for testing purposes
 * Tests can import createCli to create isolated instances
 */
export default cli
