/**
 * Exec Command - Yargs Implementation
 *
 * Executes JavaScript/TypeScript files in the browser context with access to page object.
 * Supports reading from files or stdin for script execution.
 */

import * as fs from 'fs'
import chalk from 'chalk'
import { createCommand } from '../../lib/command-builder'
import { BrowserHelper } from '../../../lib/browser-helper'
import { executeWithSimplifiedContext } from '../../../lib/script-context'
import type { ExecuteOptions } from '../../types'

export const execCommand = createCommand<ExecuteOptions>({
  metadata: {
    name: 'exec',
    category: 'advanced',
    description: 'Execute JavaScript/TypeScript file in Playwright session',
    aliases: [],
  },

  command: 'exec [file]',
  describe:
    'Execute JavaScript/TypeScript file or inline code in Playwright session',

  builder: yargs => {
    return yargs
      .positional('file', {
        describe: 'JavaScript/TypeScript file to execute (or read from stdin)',
        type: 'string',
      })
      .option('inline', {
        describe: 'Execute inline JavaScript code directly',
        type: 'string',
      })
      .option('simple', {
        describe:
          'Use simplified API with helper functions (goto, click, type, etc.)',
        type: 'boolean',
        default: false,
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
      .option('quiet', {
        describe: 'Suppress console output, only show result',
        type: 'boolean',
        default: false,
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
      .example('$0 exec script.js', 'Execute a JavaScript file')
      .example(
        'echo "console.log(location.href)" | $0 exec',
        'Execute from stdin'
      )
      .example(
        '$0 exec --inline "console.log(await page.title())"',
        'Execute inline JavaScript'
      )
      .example(
        '$0 exec --inline "await page.click(\'button\')"',
        'Execute inline page interaction'
      )
      .example(
        '$0 exec --inline "await click(\'button\')" --simple',
        'Execute with simplified API'
      )
  },

  handler: async cmdContext => {
    try {
      const { argv, logger } = cmdContext

      // Get code from file, inline, or stdin
      // Priority: inline > file > stdin
      let code: string
      let codeSource: 'inline' | 'file' | 'stdin'
      const isQuiet = argv.quiet as boolean
      if (argv.inline) {
        // Use inline code (highest priority)
        code = argv.inline as string
        codeSource = 'inline'
      } else if (argv.file) {
        // Read from file
        try {
          code = await fs.promises.readFile(argv.file, 'utf-8')
          codeSource = 'file'
        } catch (fileError: any) {
          if (fileError.code === 'ENOENT') {
            logger.error(`File not found: ${argv.file}`)
          } else {
            logger.error(`Failed to read file: ${fileError.message}`)
          }
          throw new Error('Command failed')
        }
      } else {
        // Read from stdin only if stdin is a pipe (not TTY)
        // If stdin is TTY, we'd hang waiting for user input
        const isTTY = process.stdin.isTTY

        if (isTTY) {
          throw new Error('No code provided. Use --inline <code> or provide a file path, or pipe code via stdin.')
        }

        // Read from stdin (stdin is a pipe, not interactive terminal)
        if (!isQuiet) {
          logger.info(
            chalk.gray('📝 Reading from stdin (press Ctrl+D when done)...')
          )
        }
        const chunks: Buffer[] = []
        for await (const chunk of process.stdin) {
          chunks.push(chunk)
        }
        code = Buffer.concat(chunks).toString('utf-8')
        codeSource = 'stdin'
      }

      const tabIndex = argv['tab-index'] as number | undefined
      const tabId = argv['tab-id'] as string | undefined

      await BrowserHelper.withTargetPage(
        argv.port,
        tabIndex,
        tabId,
        async page => {
          // Log execution start after successful connection
          if (!isQuiet) {
            if (codeSource === 'inline') {
              logger.info(`⚡ Executing inline JavaScript...`)
            } else if (codeSource === 'file') {
              logger.info(`📄 Executing ${argv.file}...`)
            }
          }

          // Create a function that has access to page and context
          const AsyncFunction = Object.getPrototypeOf(
            async function () {}
          ).constructor

          let executeCode
          try {
            const trimmedCode = code.trim()
            // Debug: Log the code if verbose
            if (argv.verbose) {
              console.log('Executing code:', trimmedCode)
            }
            executeCode = new AsyncFunction(
              'page',
              'context',
              'browser',
              'console',
              trimmedCode
            )
          } catch (syntaxError: any) {
            // Handle syntax errors in the script
            const errorMessage = syntaxError.message || String(syntaxError)
            if (argv.json) {
              console.log(
                JSON.stringify(
                  {
                    error: `Syntax error in script: ${errorMessage}`,
                    console: [],
                  },
                  null,
                  2
                )
              )
            } else {
              console.error(`❌ Syntax error in script: ${errorMessage}`)
            }
            throw syntaxError
          }

          // Create a console wrapper that captures output
          const consoleOutput: any[] = []
          const consoleWrapper = {
            log: (...args: any[]) => {
              consoleOutput.push({ type: 'log', args })
              if (!isQuiet) {
                logger.info(args.map(String).join(' '))
              }
            },
            error: (...args: any[]) => {
              consoleOutput.push({ type: 'error', args })
              if (!isQuiet) {
                logger.error(args.map(String).join(' '))
              }
            },
            warn: (...args: any[]) => {
              consoleOutput.push({ type: 'warn', args })
              if (!isQuiet) {
                logger.warn(args.map(String).join(' '))
              }
            },
            info: (...args: any[]) => {
              consoleOutput.push({ type: 'info', args })
              if (!isQuiet) {
                console.info(...args)
              }
            },
          }

          // Get browser context for advanced operations
          const browserContext = page.context()
          const browser = browserContext.browser()

          // Create alias for compatibility - tests expect 'context' but we pass 'browserContext'
          const context = browserContext

          // Set a reasonable default timeout for page operations
          page.setDefaultTimeout(5000) // 5 seconds default timeout

          // Execute the code with appropriate context
          let result
          try {
            // Add timeout to execution to prevent hanging
            const executePromise = argv.simple
              ? executeWithSimplifiedContext(
                  code,
                  page,
                  context,
                  browser,
                  consoleWrapper
                )
              : executeCode(page, context, browser, consoleWrapper)

            // Set a reasonable timeout for script execution (30 seconds)
            let timeoutHandle: NodeJS.Timeout
            const timeoutPromise = new Promise((_, reject) => {
              timeoutHandle = setTimeout(
                () =>
                  reject(
                    new Error('Script execution timed out after 30 seconds')
                  ),
                30000
              )
            })

            try {
              result = await Promise.race([executePromise, timeoutPromise])
            } finally {
              // Always clear the timeout to prevent hanging
              clearTimeout(timeoutHandle!)
            }
          } catch (execError: any) {
            // Handle execution errors gracefully
            const errorMessage = execError.message || String(execError)
            if (argv.json) {
              console.log(
                JSON.stringify(
                  {
                    error: errorMessage,
                    console: consoleOutput,
                  },
                  null,
                  2
                )
              )
            } else {
              console.error(`❌ Execution error: ${errorMessage}`)
            }
            // Throw to propagate error up, will be caught by outer handler
            throw execError
          }

          if (argv.json) {
            // Use console.log for clean JSON output
            console.log(
              JSON.stringify(
                {
                  result,
                  console: consoleOutput,
                },
                null,
                2
              )
            )
          } else if (result !== undefined) {
            // Handle different result types appropriately
            let resultString: string
            if (typeof result === 'object' && result !== null) {
              resultString = JSON.stringify(result, null, 2)
            } else {
              resultString = String(result)
            }
            if (isQuiet) {
              // In quiet mode, only output the result
              console.log(resultString)
            } else {
              logger.info(chalk.green('✅ Result:') + ' ' + resultString)
            }
          } else if (!isQuiet) {
            logger.success('Code executed successfully')
          }
        }
      )
    } catch (error: any) {
      // Log the error if not already logged
      if (error.message && !error.message.includes('Command failed')) {
        cmdContext.logger.error(error.message)
      }
      throw new Error('Command failed')
    }
  },
})
