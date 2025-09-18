/**
 * Type Command - Yargs Implementation
 *
 * Types text into an element using Playwright's page.type() or page.fill() methods.
 * Supports clearing fields before typing and controlling typing speed.
 */

import { createCommand } from '../../lib/command-builder'
import { BrowserHelper } from '../../../lib/browser-helper'
import { findElementByRef, nodeToSelector } from '../../../lib/ref-utils'
import { refManager } from '../../../lib/ref-manager'
import { findBestSelector } from '../../../lib/selector-resolver'
import type { TypeOptions } from '../../types'

export const typeCommand = createCommand<TypeOptions>({
  metadata: {
    name: 'type',
    category: 'interaction',
    description: 'Type text into an element',
    aliases: [],
  },

  command: 'type [selector] <text>',
  describe: 'Type text into an element',

  builder: yargs => {
    return yargs
      .positional('selector', {
        describe: 'Element selector or text to find',
        type: 'string',
        demandOption: false,
      })
      .positional('text', {
        describe: 'Text to type',
        type: 'string',
        demandOption: true,
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
      .option('delay', {
        describe: 'Delay between keystrokes in milliseconds',
        type: 'number',
        default: 0,
      })
      .option('timeout', {
        describe: 'Timeout in milliseconds',
        type: 'number',
        default: 5000,
      })
      .option('clear', {
        describe: 'Clear field before typing',
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
    const { text, port, delay, timeout, clear } = argv
    const tabIndex = argv['tab-index'] as number | undefined
    const tabId = argv['tab-id'] as string | undefined
    const ref = argv.ref as string | undefined
    const selector = argv.selector as string | undefined

    // Determine what to type into
    if (!selector && !ref) {
      throw new Error('Either selector or --ref must be provided')
    }

    const tabTarget =
      tabIndex !== undefined
        ? ` in tab ${tabIndex}`
        : tabId !== undefined
          ? ` in tab ${tabId.slice(0, 8)}...`
          : ''

    const targetDesc = ref ? `[ref=${ref}]` : selector

    if (spinner) {
      spinner.text = `Typing into ${targetDesc}${tabTarget}...`
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
            spinner.text = `Typing into ${element.role} "${element.name || ''}"...`
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
        throw new Error('No selector or ref provided')
      }

      // Wait for element to exist first (fail fast if not found)
      await page.waitForSelector(actualSelector, {
        timeout: Math.min(timeout || 5000, 2000),
      })

      if (clear) {
        await page.fill(actualSelector, text, { timeout })
      } else {
        await page.type(actualSelector, text, {
          delay,
          timeout,
        })
      }
    })

    logger.success(`Typed text into ${targetDesc}${tabTarget}`)
  },
})
