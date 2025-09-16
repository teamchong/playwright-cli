/**
 * Console Command - Yargs Implementation
 *
 * Monitors browser console output and displays messages with appropriate formatting.
 * Supports both continuous monitoring and one-time message retrieval.
 */

import chalk from 'chalk'
import { createCommand } from '../../lib/command-builder'
import { BrowserHelper } from '../../../lib/browser-helper'
import type { ConsoleOptions } from '../../types'

export const consoleCommand = createCommand<ConsoleOptions>({
  metadata: {
    name: 'console',
    category: 'advanced',
    description: 'Capture browser console output',
    aliases: [],
  },

  command: 'console',
  describe: 'Capture browser console output',

  builder: yargs => {
    return yargs
      .option('port', {
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
        alias: 'p',
      })
      .option('filter', {
        describe: 'Filter messages by type',
        type: 'string',
        choices: ['error', 'warn', 'info', 'debug', 'all'],
        default: 'all',
      })
      .option('json', {
        describe: 'Output messages as JSON',
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
      .example('$0 console', 'Monitor all console messages')
      .example('$0 console --filter error', 'Monitor only error messages')
      .example('$0 console --once', 'Show current messages and exit')
  },

  handler: async cmdContext => {
    try {
      const { argv, logger } = cmdContext
      const tabIndex = argv['tab-index'] as number | undefined
      const tabId = argv['tab-id'] as string | undefined

      await BrowserHelper.withTargetPage(
        argv.port,
        tabIndex,
        tabId,
        async page => {
          const messages: any[] = []

          // Set up console message listener
          page.on('console', msg => {
            const type = msg.type()
            const text = msg.text()

            // Apply filter if specified
            if (argv.filter !== 'all' && type !== argv.filter) {
              return
            }

            const messageData = {
              type,
              text,
              timestamp: new Date().toISOString(),
            }

            messages.push(messageData)

            if (argv.json) {
              logger.info(JSON.stringify(messageData))
            } else {
              const prefix =
                type === 'error'
                  ? chalk.red('❌')
                  : type === 'warning'
                    ? chalk.yellow('⚠️')
                    : type === 'debug'
                      ? chalk.gray('🐛')
                      : chalk.blue('ℹ️')

              const output = `${prefix} [${type}] ${text}`
              logger.info(output)
            }
          })

          // Get tab ID for reference
          const tabId = BrowserHelper.getPageId(page)
          
          // Trigger a console message to capture any buffered messages
          try {
            await page.evaluate('console.log("Playwright CLI snapshot")')
          } catch (e) {
            // Ignore evaluation errors
          }

          // Wait briefly for messages to be captured (500ms)
          await new Promise(resolve => setTimeout(resolve, 500))

          // Filter out our own test message
          const filteredMessages = messages.filter(m => m.text !== 'Playwright CLI snapshot')

          if (argv.json) {
            logger.json({
              success: true,
              tabId,
              messages: filteredMessages,
              count: filteredMessages.length,
              timestamp: new Date().toISOString()
            })
          } else {
            logger.success(`✅ Console snapshot for tab: ${tabId}`)
            if (filteredMessages.length === 0) {
              logger.info('📋 No console messages')
            } else {
              logger.info(`📋 ${filteredMessages.length} message(s) captured:`)
              filteredMessages.slice(0, 10).forEach(msg => {
                const prefix =
                  msg.type === 'error'
                    ? chalk.red('❌')
                    : msg.type === 'warning'
                      ? chalk.yellow('⚠️')
                      : msg.type === 'debug'
                        ? chalk.gray('🐛')
                        : chalk.blue('ℹ️')
                logger.info(`  ${prefix} [${msg.type}] ${msg.text}`)
              })
              if (filteredMessages.length > 10) {
                logger.info(`  ... and ${filteredMessages.length - 10} more`)
              }
            }
          }
        }
      )
    } catch (error: any) {
      cmdContext.logger.error(`Console monitoring failed: ${error.message}`)
      throw new Error('Command failed')
    }
  },
})
