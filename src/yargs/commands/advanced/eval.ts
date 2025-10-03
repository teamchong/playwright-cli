/**
 * Eval Command - Yargs Implementation
 *
 * Executes JavaScript expressions in the browser context and returns results.
 * Supports JSON output formatting for complex objects.
 */

import { createCommand } from '../../lib/command-builder'
import { BrowserHelper } from '../../../lib/browser-helper'
import { logger } from '../../../lib/logger'
import type { EvalOptions } from '../../types'

export const evalCommand = createCommand<EvalOptions>({
  metadata: {
    name: 'eval',
    category: 'advanced',
    description: 'Execute JavaScript in the browser',
    aliases: ['execute'],
  },

  command: 'eval <expression>',
  describe: 'Execute JavaScript in the browser',

  builder: yargs => {
    return yargs
      .positional('expression', {
        describe: 'JavaScript code to execute',
        type: 'string',
        demandOption: true,
      })
      .option('port', {
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
        alias: 'p',
      })
      .option('json', {
        describe: 'Output result as JSON',
        type: 'boolean',
        default: false,
      })
      .option('timeout', {
        describe: 'Timeout in milliseconds',
        type: 'number',
        default: 30000,
      })
      .option('tab-index', {
        describe: 'Target specific tab by index (0-based)',
        type: 'number',
        alias: 'tab',
      })
      .option('tab-id', {
        describe: 'Target specific tab by unique ID',
        type: 'string',
      })
      .conflicts('tab-index', 'tab-id')
      .example('$0 eval "document.title"', 'Get the page title')
      .example(
        '$0 eval "Array.from(document.querySelectorAll(\'a\')).map(a => a.href)" --json',
        'Get all links as JSON'
      )
  },

  handler: async context => {
    const { argv, logger } = context
    const tabIndex = argv['tab-index'] as number | undefined
    const tabId = argv['tab-id'] as string | undefined
    const isQuiet = argv.quiet as boolean

    try {
      await BrowserHelper.withTargetPage(
        argv.port,
        tabIndex,
        tabId,
        async page => {
          // Execute the JavaScript expression
          const result = await page.evaluate(argv.expression)

          // Format output based on options
          if (argv.json) {
            // JSON mode - always output to stdout (not logger)
            console.log(JSON.stringify(result, null, 2))
          } else if (isQuiet) {
            // Quiet mode - only output the result value
            console.log(String(result))
          } else {
            // Normal mode - use logger
            logger.info(String(result))
          }
        }
      )
    } catch (error: any) {
      if (!isQuiet) {
        logger.error(`Evaluation failed: ${error.message}`)
      }
      throw new Error('Command failed')
    }
  },
})
