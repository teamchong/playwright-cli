/**
 * Drag Command - Yargs Implementation
 *
 * Performs drag and drop operations using Playwright's page.dragAndDrop() method.
 * Drags from a source element to a target element.
 */

import { createCommand } from '../../lib/command-builder'
import { BrowserHelper } from '../../../lib/browser-helper'
import type { DragOptions } from '../../types'

export const dragCommand = createCommand<DragOptions>({
  metadata: {
    name: 'drag',
    category: 'interaction',
    description: 'Drag from source to target element',
    aliases: ['dragAndDrop', 'drag-and-drop'],
  },

  command: 'drag <selector> <target>',
  describe: 'Drag from source to target element',

  builder: yargs => {
    return yargs
      .positional('selector', {
        describe: 'Source element selector',
        type: 'string',
        demandOption: true,
      })
      .positional('target', {
        describe: 'Target element selector',
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
        describe: 'Force drag even if elements are not visible',
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
    const { selector, target, port } = argv
    const tabIndex = argv['tab-index'] as number | undefined
    const tabId = argv['tab-id'] as string | undefined

    if (spinner) {
      spinner.text = `Dragging from ${selector} to ${target}...`
    }

    await BrowserHelper.withTargetPage(port, tabIndex, tabId, async page => {
      await page.dragAndDrop(selector, target, { timeout: 5000 })
    })

    logger.success(`Dragged from ${selector} to ${target}`)
  },
})
