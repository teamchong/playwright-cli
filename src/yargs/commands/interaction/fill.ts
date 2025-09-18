/**
 * Fill Command - Yargs Implementation
 *
 * Fills multiple form fields with values using Playwright's page.fill() method.
 * Accepts selector=value pairs to fill multiple fields in one command.
 */

import { createCommand } from '../../lib/command-builder'
import { BrowserHelper } from '../../../lib/browser-helper'
import { refManager } from '../../../lib/ref-manager'
import { findBestSelector } from '../../../lib/selector-resolver'
import type { FillOptions } from '../../types'
import chalk from 'chalk'

interface FillWithRefOptions extends FillOptions {
  ref?: string
}

export const fillCommand = createCommand<FillWithRefOptions>({
  metadata: {
    name: 'fill',
    category: 'interaction',
    description: 'Fill form fields with values',
    aliases: [],
  },

  command: 'fill [fields...]',
  describe: 'Fill form fields with values',

  builder: yargs => {
    return yargs
      .positional('fields', {
        describe:
          'Field selector=value pairs (e.g., "#email=test@example.com" "#password=secret")',
        type: 'string',
        array: true,
      })
      .option('ref', {
        describe: 'Use reference from snapshot to fill a single field',
        type: 'string',
        alias: 'r',
      })
      .check(argv => {
        if (!argv.fields?.length && !argv.ref) {
          throw new Error('Either fields or --ref must be provided')
        }
        if (argv.ref && (!argv.fields || argv.fields.length !== 1)) {
          throw new Error('When using --ref, provide exactly one value')
        }
        return true
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
    const { fields, port, timeout, ref } = argv
    const tabIndex = argv['tab-index'] as number | undefined
    const tabId = argv['tab-id'] as string | undefined
    
    // Handle --ref mode (single field fill)
    if (ref) {
      const storedSelector = refManager.getSelector(ref, tabId)
      if (!storedSelector) {
        const errorMsg = `ref not found: Element with ref=${ref} not found`
        logger.error(chalk.red(`❌ ${errorMsg}`))
        throw new Error(errorMsg)
      }
      
      const value = fields![0] // We checked in validation that exactly one value is provided
      
      await BrowserHelper.withTargetPage(port, tabIndex, tabId, async page => {
        try {
          await page.fill(storedSelector, value, { timeout: timeout as number })
          logger.success(`Filled [ref=${ref}] with "${value}"`)
        } catch (err: any) {
          logger.error(`Failed to fill [ref=${ref}]: ${err.message}`)
          throw err
        }
      })
      return
    }

    const tabTarget =
      tabIndex !== undefined
        ? ` in tab ${tabIndex}`
        : tabId !== undefined
          ? ` in tab ${tabId.slice(0, 8)}...`
          : ''

    if (spinner) {
      spinner.text = `Filling ${fields.length} field(s)${tabTarget}...`
    }

    let filledCount = 0
    const errors: string[] = []

    await BrowserHelper.withTargetPage(port, tabIndex, tabId, async page => {
      for (const field of fields!) {
        const [selector, ...valueParts] = field.split('=')
        const value = valueParts.join('=') // Handle values with = in them

        if (!selector || !value) {
          errors.push(`Invalid field format: ${field}. Use selector=value`)
          continue
        }

        try {
          // Try text-based selector resolution first
          let actualSelector = selector
          const textSelectorResult = await findBestSelector(page, selector)
          if (textSelectorResult) {
            actualSelector = textSelectorResult.selector
            if (spinner) {
              spinner.text = `Filling field via ${textSelectorResult.strategy}: ${selector}...`
            }
          }
          
          await page.fill(actualSelector, value, { timeout: timeout as number })
          logger.info(`  ✓ Filled ${selector} with "${value}"`)
          filledCount++
        } catch (err: any) {
          errors.push(`Failed to fill ${selector}: ${err.message}`)
        }
      }
    })

    if (errors.length > 0) {
      errors.forEach(error => logger.warn(`  ⚠️  ${error}`))
    }

    logger.success(`Filled ${filledCount} field(s)${tabTarget}`)
  },
})
