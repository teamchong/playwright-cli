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
      .option('monitor', {
        describe: 'Continuously monitor console output',
        type: 'boolean',
        default: false,
        alias: 'm',
      })
      .conflicts('tab-index', 'tab-id')
      .example('$0 console', 'Show all console messages from the page')
      .example('$0 console --monitor', 'Continuously monitor console messages')
      .example('$0 console --filter error', 'Show only error messages')
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

          // Set up console message listener BEFORE any actions
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

            // Log messages in real-time if not in JSON mode
            if (!argv.json) {
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
          const pageTabId = await BrowserHelper.getPageId(page)

          // Always reload the page to capture all messages from the beginning
          // Users expect to see ALL console messages when they run this command
          const currentUrl = page.url()
          if (currentUrl && currentUrl !== 'about:blank') {
            await page.reload()
            // Wait for the page to load
            await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
          }

          // If monitor mode, keep running indefinitely
          if (argv.monitor) {
            logger.info(`📡 Monitoring console output for tab: ${pageTabId}`)
            logger.info('Press Ctrl+C to stop...')

            // Keep the process running
            await new Promise(() => {})
          }

          // Otherwise, wait briefly to capture any immediate messages
          await new Promise(resolve => setTimeout(resolve, 500))

          // Show all captured messages
          const filteredMessages = messages

          if (argv.json) {
            logger.json({
              success: true,
              tabId: pageTabId,
              messages: filteredMessages,
              count: filteredMessages.length,
              timestamp: new Date().toISOString(),
            })
          } else {
            logger.success(`✅ Console snapshot for tab: ${pageTabId}`)
            if (filteredMessages.length === 0) {
              logger.info('📋 No console messages')
            } else {
              logger.info(`📋 ${filteredMessages.length} message(s) captured:`)
              // Show ALL messages, not just first 10
              filteredMessages.forEach(msg => {
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
