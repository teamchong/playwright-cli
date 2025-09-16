import { CommandModule, Arguments } from 'yargs'
import chalk from 'chalk'
import ora from 'ora'

import { BrowserHelper } from '../../../lib/browser-helper'

interface ScreenshotArgs extends Arguments {
  'path': string
  'port': number
  'timeout': number
  'fullPage'?: boolean
  'selector'?: string
  'tab-index'?: number
  'tab-id'?: string
}

export const screenshotCommand: CommandModule<{}, ScreenshotArgs> = {
  command: 'screenshot [path]',
  aliases: ['capture'],
  describe: 'Take a screenshot',

  builder: yargs => {
    return yargs
      .positional('path', {
        describe: 'Output file path',
        type: 'string',
        default: 'screenshot.png',
      })
      .option('port', {
        alias: 'p',
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
      })
      .option('timeout', {
        alias: 't',
        describe: 'Timeout in milliseconds',
        type: 'number',
        default: 30000,
      })
      .option('full-page', {
        describe: 'Capture full page',
        type: 'boolean',
      })
      .option('selector', {
        describe: 'Capture specific element',
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

  handler: async argv => {
    const spinner = ora('Taking screenshot...').start()
    const tabIndex = argv['tab-index'] as number | undefined
    const tabId = argv['tab-id'] as string | undefined

    try {
      await BrowserHelper.withTargetPage(
        argv.port,
        tabIndex,
        tabId,
        async page => {
          const screenshotOptions: any = {
            path: argv.path,
            fullPage: !!argv.fullPage,
          }

          if (argv.selector) {
            const element = await page.$(argv.selector)
            if (!element) {
              throw new Error(`Element not found: ${argv.selector}`)
            }
            await element.screenshot({ path: argv.path })
          } else {
            await page.screenshot(screenshotOptions)
          }

          spinner.succeed(chalk.green(`✅ Screenshot saved to ${argv.path}`))
        }
      )

      return
    } catch (error: any) {
      spinner.fail(chalk.red(`❌ Screenshot failed: ${error.message}`))
      throw new Error('Command failed')
    }
  },
}
