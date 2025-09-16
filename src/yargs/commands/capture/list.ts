import { CommandModule, Arguments } from 'yargs'
import chalk from 'chalk'

import { BrowserHelper } from '../../../lib/browser-helper'
import { logger } from '../../../lib/logger'

interface ListArgs extends Arguments {
  port: number
  timeout: number
}

export const listCommand: CommandModule<{}, ListArgs> = {
  command: 'list',
  describe: 'List open pages and contexts',

  builder: yargs => {
    return yargs
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
  },

  handler: async argv => {
    try {
      // Get all contexts and pages
      const contexts = await BrowserHelper.getContexts(argv.port)
      const pages = await BrowserHelper.getPages(argv.port)

      logger.info(
        chalk.cyan(`\n📂 Contexts: ${contexts.length} | Pages: ${pages.length}`)
      )

      // Group pages by context
      let contextIndex = 0
      for (const context of contexts) {
        const contextPages = context.pages()
        if (contextPages.length > 0) {
          logger.info(`\nContext ${++contextIndex}:`)

          contextPages.forEach((page, j) => {
            const url = page.url()
            const title = url.startsWith('http') ? url.split('/')[2] : 'Local'
            logger.info(`  ${chalk.green('►')} Page ${j + 1}: ${title}`)
            logger.info(`     ${url}`)
          })
        }
      }

      // Exit cleanly
      return
    } catch (error: any) {
      if (error.message.includes('No browser running')) {
        logger.warn('No browser running')
        logger.info('   Use "playwright open" to start a browser')
      } else {
        logger.commandError(`Failed to list pages: ${error.message}`)
      }
      throw new Error('Command failed')
    }
  },
}
