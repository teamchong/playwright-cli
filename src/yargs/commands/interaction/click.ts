/**
 * Click Command - Yargs Implementation
 *
 * Performs click operations on elements using Playwright's page.click() method.
 * Supports various click types including single, double, and modifier-based clicks.
 */

import { createCommand } from '../../lib/command-builder'
import { BrowserHelper } from '../../../lib/browser-helper'
import { findElementByRef, nodeToSelector } from '../../../lib/ref-utils'
import { refManager } from '../../../lib/ref-manager'
import { findBestSelector } from '../../../lib/selector-resolver'
import type { ClickOptions } from '../../types'

export const clickCommand = createCommand<ClickOptions>({
  metadata: {
    name: 'click',
    category: 'interaction',
    description: 'Click on an element',
    aliases: [],
  },

  command: 'click [selector]',
  describe: 'Click on an element',

  builder: yargs => {
    return yargs
      .positional('selector', {
        describe: 'Element selector or text to find',
        type: 'string',
        demandOption: false,
      })
      .option('ref', {
        describe: 'Use a ref from snapshot command',
        type: 'string',
      })
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
      .option('timeout', {
        describe: 'Timeout in milliseconds',
        type: 'number',
        default: 5000,
      })
      .option('force', {
        describe: 'Force click even if element is not visible',
        type: 'boolean',
        default: false,
      })
      .option('double', {
        describe: 'Perform a double-click instead of single click',
        type: 'boolean',
        default: false,
      })
      .option('button', {
        describe: 'Mouse button to use',
        type: 'string',
        choices: ['left', 'right', 'middle'],
        default: 'left',
      })
      .option('shift', {
        describe: 'Hold Shift key while clicking',
        type: 'boolean',
        default: false,
      })
      .option('ctrl', {
        describe: 'Hold Ctrl key while clicking',
        type: 'boolean',
        default: false,
      })
      .option('alt', {
        describe: 'Hold Alt key while clicking',
        type: 'boolean',
        default: false,
      })
      .option('meta', {
        describe: 'Hold Meta key while clicking',
        type: 'boolean',
        default: false,
      })
      .option('ctrl-or-meta', {
        describe:
          'Hold Ctrl (Windows/Linux) or Meta (macOS) key while clicking',
        type: 'boolean',
        default: false,
      })
      .conflicts('tab-index', 'tab-id') // Cannot use both
  },

  handler: async ({ argv, logger, spinner }) => {
    const { port, timeout, force, double, button } = argv
    const tabIndex = argv['tab-index'] as number | undefined
    const tabId = argv['tab-id'] as string | undefined
    const ref = argv.ref as string | undefined
    const selector = argv.selector as string | undefined

    // Determine what to click
    if (!selector && !ref) {
      throw new Error('Either selector or --ref must be provided')
    }

    // Build modifiers array from options
    const modifiers: Array<
      'Shift' | 'Control' | 'Alt' | 'Meta' | 'ControlOrMeta'
    > = []
    if (argv.shift) modifiers.push('Shift')
    if (argv.ctrl) modifiers.push('Control')
    if (argv.alt) modifiers.push('Alt')
    if (argv.meta) modifiers.push('Meta')
    if (argv['ctrl-or-meta']) modifiers.push('ControlOrMeta')

    const clickType = double ? 'Double-clicking' : 'Clicking'
    const modifierText = modifiers.length > 0 ? ` (${modifiers.join('+')})` : ''
    const tabTarget =
      tabIndex !== undefined
        ? ` in tab ${tabIndex}`
        : tabId !== undefined
          ? ` in tab ${tabId.slice(0, 8)}...`
          : ''

    const targetDesc = ref ? `[ref=${ref}]` : selector
    if (spinner) {
      spinner.text = `${clickType}${modifierText} ${targetDesc}${tabTarget}...`
    }

    await BrowserHelper.withTargetPage(port, tabIndex, tabId, async page => {
      let actualSelector: string

      // Handle --ref flag
      if (ref) {
        // Try to get selector from RefManager first
        const storedSelector = refManager.getSelector(ref, tabId)
        if (storedSelector) {
          actualSelector = storedSelector
          if (spinner) {
            spinner.text = `Using stored ref=${ref}...`
          }
        } else {
          // Fallback to accessibility tree search
          if (spinner) {
            spinner.text = `Finding element with ref=${ref}...`
          }
          const snapshot = await page.accessibility.snapshot()
          const element = findElementByRef(snapshot, ref)
          if (!element) {
            throw new Error(`ref not found: Element with ref=${ref} not found`)
          }
          actualSelector = nodeToSelector(element)
        }
      } else if (selector) {
        // Check if it's a ref selector pattern [ref=xxx]
        const refMatch = selector.match(/^\[ref=([a-f0-9]+)\]$/)
        if (refMatch) {
          const targetRef = refMatch[1]
          if (spinner) {
            spinner.text = `Finding element with ref=${targetRef}...`
          }

          // Get accessibility snapshot
          const snapshot = await page.accessibility.snapshot()

          // Find the element with this ref
          const element = findElementByRef(snapshot, targetRef)

          if (!element) {
            throw new Error(`No element found with ref=${targetRef}`)
          }

          // Convert to a selector
          actualSelector = nodeToSelector(element)
          if (spinner) {
            spinner.text = `${clickType}${modifierText} ${element.role} "${element.name || ''}"...`
          }
        } else {
          // Try text-based selector resolution first
          if (spinner) {
            spinner.text = `Finding element: "${selector}"...`
          }
          
          const textSelectorResult = await findBestSelector(page, selector)
          if (textSelectorResult) {
            actualSelector = textSelectorResult.selector
            if (spinner) {
              spinner.text = `Found via ${textSelectorResult.strategy}: ${selector}...`
            }
          } else {
            // Fallback to using selector as-is (CSS selector)
            actualSelector = selector
          }
        }
      } else {
        // This shouldn't happen due to validation above
        throw new Error('No selector or ref provided')
      }

      // Click using Playwright
      const clickOptions = {
        timeout,
        force,
        button: button as 'left' | 'right' | 'middle',
        modifiers: modifiers.length > 0 ? modifiers : undefined,
      }

      if (double) {
        await page.dblclick(actualSelector, clickOptions)
      } else {
        // Wait for element to exist first (fail fast if not found)

        await page.waitForSelector(actualSelector, {
          timeout: Math.min(timeout || 5000, 2000),
        })

        await page.click(actualSelector, clickOptions)
      }
    })

    const successMessage = double ? 'Double-clicked' : 'Clicked'
    logger.success(`${successMessage}${modifierText} on ${targetDesc}`)
  },
})
