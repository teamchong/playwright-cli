/**
 * Back Command - Yargs Implementation
 *
 * Navigates back in browser history using Playwright's page.goBack() method.
 */

import { createCommand } from '../../lib/command-builder'
import { BrowserHelper } from '../../../lib/browser-helper'
import type { NavigationHistoryOptions } from '../../types'

export const backCommand = createCommand<NavigationHistoryOptions>({
  metadata: {
    name: 'back',
    category: 'navigation',
    description: 'Navigate back in browser history',
  },

  command: 'back',
  describe: 'Navigate back in browser history',

  builder: yargs => {
    return yargs
      .option('port', {
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
        alias: 'p',
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
      .example('$0 back', 'Go back one page in browser history')
      .example('$0 back --port 8080', 'Go back using specific port')
  },

  handler: async ({ argv, logger, spinner }) => {
    const tabIndex = argv['tab-index'] as number | undefined
    const tabId = argv['tab-id'] as string | undefined

    if (spinner) {
      spinner.start('Navigating back...')
    }

    await BrowserHelper.withTargetPage(
      argv.port,
      tabIndex,
      tabId,
      async page => {
        try {
          // Start navigation back without waiting for completion
          await Promise.race([
            page.goBack({ waitUntil: 'domcontentloaded' }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Navigation timeout')), 3000)
            ),
          ])
        } catch (error: any) {
          // If goBack fails, it might be because there's no history
          if (
            error.message.includes('go back') ||
            error.message.includes('history')
          ) {
            throw new Error(
              'Cannot navigate back - no previous page in history'
            )
          }
          if (
            error.message.includes('timeout') ||
            error.message.includes('Timeout')
          ) {
            // Navigation was initiated but timed out - that's OK
            logger.warn('Navigation back initiated (may still be loading)')
          } else {
            throw error
          }
        }

        let title, url
        try {
          title = await Promise.race([
            page.title(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Title timeout')), 1000)
            ),
          ])
          url = page.url()
        } catch (error: any) {
          title = 'Unknown'
          url = 'about:blank'
        }

        if (spinner) {
          spinner.succeed('Navigated back')
        }

        logger.success('Navigated back')
        logger.info(`Current page: ${url}`)
        logger.info(`Title: ${title}`)

        if (argv.json) {
          logger.json({
            success: true,
            action: 'back',
            url,
            title,
          })
        }
      }
    )
  },

  supportsJson: true,
})
