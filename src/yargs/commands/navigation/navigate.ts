/**
 * Navigate Command - Yargs Implementation
 *
 * Navigates to a URL using Playwright's page.goto() method.
 * Supports various waitUntil conditions and timeout options.
 */

import { createCommand } from '../../lib/command-builder'
import { BrowserHelper } from '../../../lib/browser-helper'
import type { NavigateOptions } from '../../types'

export const navigateCommand = createCommand<NavigateOptions>({
  metadata: {
    name: 'navigate',
    category: 'navigation',
    description: 'Navigate to a URL',
    aliases: ['goto'],
  },

  command: 'navigate <url>',
  describe: 'Navigate to a URL',

  builder: yargs => {
    return yargs
      .positional('url', {
        describe: 'URL to navigate to',
        type: 'string',
        demandOption: true,
      })
      .option('port', {
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
        alias: 'p',
      })
      .option('waitUntil', {
        describe: 'Wait until event occurs before completing',
        type: 'string',
        choices: ['load', 'domcontentloaded', 'networkidle', 'commit'],
        default: 'load',
        alias: 'w',
      })
      .option('timeout', {
        describe: 'Navigation timeout in milliseconds',
        type: 'number',
        default: 30000,
        alias: 't',
      })
      .option('referer', {
        describe: 'Referer header value',
        type: 'string',
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
  },

  handler: async ({ argv, logger, spinner }) => {
    const { url, waitUntil, timeout, referer } = argv
    const tabIndex = argv['tab-index'] as number | undefined
    const tabId = argv['tab-id'] as string | undefined

    const tabTarget =
      tabIndex !== undefined
        ? ` in tab ${tabIndex}`
        : tabId !== undefined
          ? ` in tab ${tabId.slice(0, 8)}...`
          : ''

    if (spinner) {
      spinner.start(`Navigating to ${url}${tabTarget}...`)
    }

    // Validate URL format (allow data: URLs for testing)
    if (!url.startsWith('data:') && !url.startsWith('http')) {
      try {
        new URL(url)
      } catch (error) {
        throw new Error(`Invalid URL format: ${url}`)
      }
    }

    // Use BrowserHelper to get page and navigate
    await BrowserHelper.withTargetPage(
      argv.port,
      tabIndex,
      tabId,
      async page => {
        // Navigate with options
        const navigationOptions: any = {
          waitUntil: waitUntil as
            | 'load'
            | 'domcontentloaded'
            | 'networkidle'
            | 'commit',
          timeout,
        }

        if (referer) {
          navigationOptions.referer = referer
        }

        await page.goto(url, navigationOptions)

        // Get page info
        const title = await page.title()
        const finalUrl = page.url()

        if (spinner) {
          spinner.succeed(`Navigated to ${url}${tabTarget}`)
        }

        // Output results
        logger.success(`Successfully navigated to ${url}${tabTarget}`)
        logger.info(`Title: ${title}`)

        if (finalUrl !== url) {
          logger.info(`Final URL: ${finalUrl}`)
        }

        // JSON output for programmatic use
        if (argv.json) {
          logger.json({
            success: true,
            url,
            finalUrl,
            title,
            waitUntil,
            timeout,
          })
        }
      }
    )
  },

  // Enable JSON output support
  supportsJson: true,
})
