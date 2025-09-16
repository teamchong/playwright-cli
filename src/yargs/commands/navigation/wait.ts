/**
 * Wait Command - Yargs Implementation
 *
 * Waits for an element to appear or for a timeout period.
 * Equivalent to the Commander.js wait command with full feature parity.
 */

import { createCommand } from '../../lib/command-builder'
import { BrowserHelper } from '../../../lib/browser-helper'
import type { WaitOptions } from '../../types'

interface WaitArgs extends WaitOptions {
  selector?: string
  timeout?: number
  state?: 'attached' | 'detached' | 'visible' | 'hidden'
  waitFor?: 'load' | 'domcontentloaded' | 'networkidle'
}

export const waitCommand = createCommand<WaitArgs>({
  metadata: {
    name: 'wait',
    category: 'navigation',
    description: 'Wait for element or timeout',
  },

  command: 'wait [selector]',
  describe: 'Wait for element or timeout',

  builder: yargs => {
    return yargs
      .positional('selector', {
        describe: 'Element selector to wait for',
        type: 'string',
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
      .option('state', {
        describe: 'Wait for element state',
        type: 'string',
        choices: ['attached', 'detached', 'visible', 'hidden'],
        default: 'visible',
      })
      .option('wait-for', {
        describe: 'Wait for page load state',
        type: 'string',
        choices: ['load', 'domcontentloaded', 'networkidle'],
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
      .example('$0 wait "#button"', 'Wait for element to be visible')
      .example(
        '$0 wait "#button" --state hidden',
        'Wait for element to be hidden'
      )
      .example('$0 wait --timeout 10000', 'Wait for 10 seconds')
      .example('$0 wait --wait-for networkidle', 'Wait for network to be idle')
  },

  handler: async ({ argv, spinner, logger }) => {
    let { selector, timeout, state, waitFor } = argv
    const tabIndex = argv['tab-index'] as number | undefined
    const tabId = argv['tab-id'] as string | undefined

    // Check if the selector is actually a numeric timeout value
    if (selector && /^\d+$/.test(selector)) {
      // If selector is a pure number, treat it as timeout
      timeout = parseInt(selector, 10)
      selector = undefined
    }

    if (spinner) {
      if (selector) {
        spinner.start(`Waiting for ${selector} to be ${state}...`)
      } else if (waitFor) {
        spinner.start(`Waiting for page ${waitFor}...`)
      } else {
        spinner.start(`Waiting for ${timeout}ms...`)
      }
    }

    await BrowserHelper.withTargetPage(
      argv.port,
      tabIndex,
      tabId,
      async page => {
        try {
          if (selector) {
            // Wait for element with specific state
            await page.waitForSelector(selector, {
              timeout,
              state: state as any,
            })

            if (spinner) {
              spinner.succeed(`Element ${selector} is ${state}`)
            }
            logger.success(`Element ${selector} is ${state}`)

            if (argv.json) {
              logger.json({
                success: true,
                type: 'element',
                selector,
                state,
                timeout,
              })
            }
          } else if (waitFor) {
            // Wait for page load state
            await page.waitForLoadState(waitFor as any, { timeout })

            if (spinner) {
              spinner.succeed(`Page reached ${waitFor} state`)
            }
            logger.success(`Page reached ${waitFor} state`)

            if (argv.json) {
              logger.json({
                success: true,
                type: 'loadstate',
                waitFor,
                timeout,
              })
            }
          } else {
            // Simple timeout wait
            await page.waitForTimeout(timeout || 5000)

            if (spinner) {
              spinner.succeed(`Waited ${timeout}ms`)
            }
            logger.success(`Waited ${timeout}ms`)

            if (argv.json) {
              logger.json({
                success: true,
                type: 'timeout',
                timeout,
              })
            }
          }
        } catch (error: any) {
          if (error.name === 'TimeoutError') {
            if (selector) {
              throw new Error(
                `Timeout waiting for ${selector} to be ${state} (${timeout}ms)`
              )
            } else if (waitFor) {
              throw new Error(
                `Timeout waiting for page ${waitFor} state (${timeout}ms)`
              )
            } else {
              // This shouldn't happen for simple timeouts, but just in case
              throw new Error(`Wait operation timed out (${timeout}ms)`)
            }
          }
          throw new Error(`Wait failed: ${error.message}`)
        }
      }
    )
  },

  supportsJson: true,
})
