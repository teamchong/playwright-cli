/**
 * Hover Command - Yargs Implementation
 *
 * Hovers over an element using Playwright's page.hover() method.
 */

import { createCommand } from '../../lib/command-builder'
import { BrowserHelper } from '../../../lib/browser-helper'
import { refManager } from '../../../lib/ref-manager'
import { findBestSelector } from '../../../lib/selector-resolver'
import { logger as refLogger } from '../../../lib/logger'
import chalk from 'chalk'
import type { SelectorOptions } from '../../types'

interface HoverOptions extends SelectorOptions {
  ref?: string
}

export const hoverCommand = createCommand<HoverOptions>({
  metadata: {
    name: 'hover',
    category: 'interaction',
    description: 'Hover over an element',
    aliases: [],
  },

  command: 'hover [selector]',
  describe: 'Hover over an element',

  builder: yargs => {
    return yargs
      .positional('selector', {
        describe: 'Element selector',
        type: 'string',
      })
      .option('ref', {
        describe: 'Use reference from snapshot instead of selector',
        type: 'string',
        alias: 'r',
      })
      .check(argv => {
        if (!argv.selector && !argv.ref) {
          throw new Error('Either selector or --ref must be provided')
        }
        if (argv.selector && argv.ref) {
          throw new Error('Cannot use both selector and --ref')
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
    const { selector, port, timeout, force, ref } = argv
    const tabIndex = argv['tab-index'] as number | undefined
    const tabId = argv['tab-id'] as string | undefined
    
    // Resolve ref to selector if using --ref
    let actualSelector = selector
    if (ref) {
      const storedSelector = refManager.getSelector(ref, tabId)
      if (!storedSelector) {
        const errorMsg = `ref not found: Element with ref=${ref} not found`
        refLogger.error(chalk.red(`❌ ${errorMsg}`))
        throw new Error(errorMsg)
      }
      actualSelector = storedSelector
    }

    const targetDesc = ref ? `[ref=${ref}]` : actualSelector
    const tabTarget =
      tabIndex !== undefined
        ? ` in tab ${tabIndex}`
        : tabId !== undefined
          ? ` in tab ${tabId.slice(0, 8)}...`
          : ''

    if (spinner) {
      spinner.text = `Hovering over ${targetDesc}${tabTarget}...`
    }

    await BrowserHelper.withTargetPage(port, tabIndex, tabId, async page => {
      // Try text-based selector resolution if not already resolved via ref
      if (!ref && actualSelector) {
        if (spinner) {
          spinner.text = `Finding element: "${actualSelector}"...`
        }
        
        const textSelectorResult = await findBestSelector(page, actualSelector)
        if (textSelectorResult) {
          actualSelector = textSelectorResult.selector
          if (spinner) {
            spinner.text = `Found via ${textSelectorResult.strategy}: ${actualSelector}...`
          }
        }
      }
      
      await page.hover(actualSelector, {
        timeout,
        force,
      })
    })

    logger.success(`Hovered over ${targetDesc}${tabTarget}`)
  },
})
