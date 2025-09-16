/**
 * Hover Command - Yargs Implementation
 *
 * Hovers over an element using Playwright's page.hover() method.
 */

import { createCommand } from '../../lib/command-builder'
import { BrowserHelper } from '../../../lib/browser-helper'
import type { SelectorOptions } from '../../types'

export const hoverCommand = createCommand<SelectorOptions>({
  metadata: {
    name: 'hover',
    category: 'interaction',
    description: 'Hover over an element',
    aliases: [],
  },

  command: 'hover <selector>',
  describe: 'Hover over an element',

  builder: yargs => {
    return yargs
      .positional('selector', {
        describe: 'Element selector',
        type: 'string',
        demandOption: true,
      })
      .option('port', {
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
        alias: 'p',
      })
      .option('timeout', {
        describe: 'Timeout in milliseconds',
        type: 'number',
        default: 5000,
      })
      .option('force', {
        describe: 'Force hover even if element is not visible',
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
  },

  handler: async ({ argv, logger, spinner }) => {
    const { selector, port, timeout, force } = argv
    const tabIndex = argv['tab-index'] as number | undefined
    const tabId = argv['tab-id'] as string | undefined

    const tabTarget =
      tabIndex !== undefined
        ? ` in tab ${tabIndex}`
        : tabId !== undefined
          ? ` in tab ${tabId.slice(0, 8)}...`
          : ''

    if (spinner) {
      spinner.text = `Hovering over ${selector}${tabTarget}...`
    }

    await BrowserHelper.withTargetPage(port, tabIndex, tabId, async page => {
      await page.hover(selector, {
        timeout,
        force,
      })
    })

    logger.success(`Hovered over ${selector}${tabTarget}`)
  },
})
