/**
 * Tabs Command - Yargs Implementation
 *
 * Manages browser tabs - list, create new, close, and select tabs.
 * Equivalent to the Commander.js tabs command with full feature parity.
 */

import { createCommand } from '../../lib/command-builder'
import { BrowserHelper } from '../../../lib/browser-helper'
import type { TabOptions } from '../../types'

export const tabsCommand = createCommand<TabOptions>({
  metadata: {
    name: 'tabs',
    category: 'navigation',
    description: 'Manage browser tabs',
  },

  command: 'tabs [action]',
  describe: 'Manage browser tabs',

  builder: yargs => {
    return yargs
      .positional('action', {
        describe: 'Action to perform',
        type: 'string',
        choices: ['list', 'new', 'close', 'select'],
        default: 'list',
      })
      .option('port', {
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
        alias: 'p',
      })
      .option('index', {
        describe: 'Tab index for close/select actions',
        type: 'number',
        alias: 'i',
      })
      .option('tab-id', {
        describe: 'Tab ID for close/select actions',
        type: 'string',
      })
      .option('url', {
        describe: 'URL for new tab',
        type: 'string',
        alias: 'u',
      })
      .example('$0 tabs list', 'List all open tabs')
      .example(
        '$0 tabs new --url https://example.com',
        'Create new tab with URL'
      )
      .example('$0 tabs close --index 2', 'Close tab at index 2')
      .example('$0 tabs select --index 1', 'Select tab at index 1')
  },

  validateArgs: argv => {
    const { action, index, url } = argv
    const tabId = argv['tab-id'] as string | undefined

    if (
      (action === 'close' || action === 'select') &&
      typeof index !== 'number' &&
      !tabId
    ) {
      return `${action} action requires either --index or --tab-id parameter`
    }

    if (action === 'new' && url) {
      try {
        new URL(url)
      } catch {
        return `Invalid URL format: ${url}`
      }
    }
  },

  handler: async ({ argv, logger, spinner }) => {
    const { action, index, url } = argv
    const tabId = argv['tab-id'] as string | undefined

    if (spinner) {
      spinner.start(`Managing tabs: ${action}...`)
    }

    switch (action) {
      case 'list': {
        await BrowserHelper.withBrowser(argv.port, async browser => {
          const pages = await BrowserHelper.getPages(argv.port)

          if (pages.length === 0) {
            logger.info('No tabs open')
            if (argv.json) {
              logger.json({ success: true, tabs: [] })
            }
            return
          }

          if (spinner) {
            spinner.succeed(`Found ${pages.length} open tabs`)
          }

          logger.info('Open tabs:')
          const tabInfo = []

          for (let i = 0; i < pages.length; i++) {
            const page = pages[i]
            const pageUrl = page.url()
            const title = (await page.title()) || 'Untitled'
            const displayTitle = pageUrl === 'about:blank' ? 'New Tab' : title

            // Get unique tab ID
            let tabId = ''
            try {
              tabId = await BrowserHelper.getPageId(page)
            } catch (error) {
              tabId = 'unknown'
            }

            logger.info(`  ${i}: ${displayTitle}`)
            logger.info(`     ${pageUrl}`)
            logger.info(`     ID: ${tabId}`)

            tabInfo.push({
              index: i,
              id: tabId,
              title: displayTitle,
              url: pageUrl,
            })
          }

          if (argv.json) {
            logger.json({
              success: true,
              tabs: tabInfo,
              count: pages.length,
            })
          }
        })
        break
      }

      case 'new': {
        await BrowserHelper.withBrowser(argv.port, async browser => {
          const contexts = browser.contexts()
          if (contexts.length === 0) {
            throw new Error(
              'No browser context available. Use "playwright open" first'
            )
          }

          const context = contexts[0]
          const newPage = await context.newPage()

          if (url) {
            await newPage.goto(url)
          }

          // Get the unique tab ID
          const tabId = await BrowserHelper.getPageId(newPage)

          if (spinner) {
            spinner.succeed(`Created new tab${url ? ` with ${url}` : ''}`)
          }

          logger.success(`Created new tab${url ? ` with ${url}` : ''}`)
          logger.info(`Tab ID: ${tabId}`)

          if (argv.json) {
            logger.json({
              success: true,
              action: 'new',
              url: url || 'about:blank',
              tabId: tabId,
            })
          }
        })
        break
      }

      case 'close': {
        const pages = await BrowserHelper.getPages(argv.port)
        let targetPage: any
        let targetIndex: number = -1

        if (tabId) {
          // Find page by tab ID
          for (let i = 0; i < pages.length; i++) {
            const page = pages[i]
            try {
              const pageId = await BrowserHelper.getPageId(page)
              if (pageId === tabId) {
                targetPage = page
                targetIndex = i
                break
              }
            } catch {
              // Continue searching
            }
          }
          
          if (!targetPage) {
            throw new Error(`Tab with ID ${tabId} not found`)
          }
        } else {
          // Use index
          if (typeof index !== 'number' || index < 0 || index >= pages.length) {
            throw new Error(
              `Invalid tab index: ${index}. Available: 0-${pages.length - 1}`
            )
          }
          targetPage = pages[index]
          targetIndex = index
        }

        await targetPage.close()

        if (spinner) {
          spinner.succeed(`Closed tab ${tabId ? `with ID ${tabId.slice(0, 8)}...` : targetIndex}`)
        }

        console.log(`Closed tab ${tabId ? `with ID ${tabId.slice(0, 8)}...` : targetIndex}`)

        if (argv.json) {
          logger.json({
            success: true,
            action: 'close',
            index: targetIndex,
            tabId: tabId,
          })
        }
        break
      }

      case 'select': {
        const pages = await BrowserHelper.getPages(argv.port)
        let targetPage: any
        let targetIndex: number = -1

        if (tabId) {
          // Find page by tab ID
          for (let i = 0; i < pages.length; i++) {
            const page = pages[i]
            try {
              const pageId = await BrowserHelper.getPageId(page)
              if (pageId === tabId) {
                targetPage = page
                targetIndex = i
                break
              }
            } catch {
              // Continue searching
            }
          }
          
          if (!targetPage) {
            throw new Error(`Tab with ID ${tabId} not found`)
          }
        } else {
          // Use index
          if (typeof index !== 'number' || index < 0 || index >= pages.length) {
            throw new Error(
              `Invalid tab index: ${index}. Available: 0-${pages.length - 1}`
            )
          }
          targetPage = pages[index]
          targetIndex = index
        }

        await targetPage.bringToFront()

        if (spinner) {
          spinner.succeed(`Selected tab ${tabId ? `with ID ${tabId.slice(0, 8)}...` : targetIndex}`)
        }

        logger.success(`Selected tab ${tabId ? `with ID ${tabId.slice(0, 8)}...` : targetIndex}`)

        if (argv.json) {
          logger.json({
            success: true,
            action: 'select',
            index: targetIndex,
            tabId: tabId,
          })
        }
        break
      }

      default:
        throw new Error(
          `Unknown action: ${action}. Use list, new, close, or select`
        )
    }
  },

  supportsJson: true,
})
