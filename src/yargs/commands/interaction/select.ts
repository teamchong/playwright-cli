/**
 * Select Command - Yargs Implementation
 *
 * Selects option(s) in a dropdown using Playwright's page.selectOption() method.
 * Supports single and multiple value selection.
 */

import { createCommand } from '../../lib/command-builder'
import { BrowserHelper } from '../../../lib/browser-helper'
import type { SelectOptions } from '../../types'

export const selectCommand = createCommand<SelectOptions>({
  metadata: {
    name: 'select',
    category: 'interaction',
    description: 'Select option(s) in a dropdown',
    aliases: [],
  },

  command: 'select <selector> <values...>',
  describe: 'Select option(s) in a dropdown',

  builder: yargs => {
    return yargs
      .positional('selector', {
        describe: 'Dropdown selector',
        type: 'string',
        demandOption: true,
      })
      .positional('values', {
        describe: 'Value(s) to select',
        type: 'string',
        array: true,
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
    const { selector, values, port, timeout } = argv
    const tabIndex = argv['tab-index'] as number | undefined
    const tabId = argv['tab-id'] as string | undefined

    if (spinner) {
      spinner.start(`Selecting ${values.join(', ')} in ${selector}...`)
    }

    try {
      await BrowserHelper.withTargetPage(port, tabIndex, tabId, async page => {
        await page.selectOption(selector, values, { timeout: timeout || 5000 })
      })

      if (spinner) {
        spinner.succeed(`Selected ${values.join(', ')} in ${selector}`)
      }

      logger.success(`Selected ${values.join(', ')} in ${selector}`)

      if (argv.json) {
        logger.json({
          success: true,
          action: 'select',
          selector,
          values: values,
        })
      }
    } catch (error: any) {
      if (spinner) {
        spinner.fail(`Failed to select ${values.join(', ')} in ${selector}`)
      }

      if (
        error.message.includes('Timeout') ||
        error.message.includes('timeout')
      ) {
        throw new Error(
          `Timeout waiting for selector "${selector}" (${timeout || 5000}ms)`
        )
      } else if (
        error.message.includes('not found') ||
        error.message.includes('No node found')
      ) {
        throw new Error(`Element not found: ${selector}`)
      } else {
        throw new Error(`Selection failed: ${error.message}`)
      }
    }
  },

  supportsJson: true,
})
