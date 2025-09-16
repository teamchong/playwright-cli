/**
 * Press Command - Yargs Implementation
 *
 * Presses keyboard keys using Playwright's page.keyboard.press() method.
 * Supports special keys like Enter, Escape, arrows, and key combinations.
 */

import { createCommand } from '../../lib/command-builder'
import { BrowserHelper } from '../../../lib/browser-helper'
import type { PressOptions } from '../../types'

export const pressCommand = createCommand<PressOptions>({
  metadata: {
    name: 'press',
    category: 'interaction',
    description: 'Press a keyboard key',
    aliases: ['key'],
  },

  command: 'press <key>',
  describe: 'Press a keyboard key',

  builder: yargs => {
    return yargs
      .positional('key', {
        describe: 'Key to press (e.g., Enter, Escape, ArrowDown, a, A)',
        type: 'string',
        demandOption: true,
      })
      .option('port', {
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
        alias: 'p',
      })
      .option('delay', {
        describe: 'Delay between key down and key up in milliseconds',
        type: 'number',
        default: 0,
      })
      .option('selector', {
        describe: 'Optional selector to focus before pressing key',
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
    const { key, port, selector } = argv
    const tabIndex = argv['tab-index'] as number | undefined
    const tabId = argv['tab-id'] as string | undefined

    const tabTarget =
      tabIndex !== undefined
        ? ` in tab ${tabIndex}`
        : tabId !== undefined
          ? ` in tab ${tabId.slice(0, 8)}...`
          : ''

    if (spinner) {
      spinner.text = `Pressing key: ${key}${tabTarget}...`
    }

    await BrowserHelper.withTargetPage(port, tabIndex, tabId, async page => {
      // Focus on selector if provided
      if (selector && typeof selector === 'string') {
        await page.focus(selector)
      }

      await page.keyboard.press(key)
    })

    logger.success(`Pressed key: ${key}${tabTarget}`)
  },
})
