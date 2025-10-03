/**
 * Dialog Command - Yargs Implementation
 *
 * Handles browser dialogs (alert, confirm, prompt) by accepting or dismissing them.
 * Supports providing text for prompt dialogs.
 */

import chalk from 'chalk'
import { createCommand } from '../../lib/command-builder'
import { BrowserHelper } from '../../../lib/browser-helper'
import type { DialogOptions } from '../../types'

export const dialogCommand = createCommand<DialogOptions>({
  metadata: {
    name: 'dialog',
    category: 'advanced',
    description: 'Handle browser dialogs (alert, confirm, prompt)',
    aliases: [],
  },

  command: 'dialog <action>',
  describe: 'Handle browser dialogs (alert, confirm, prompt)',

  builder: yargs => {
    return yargs
      .positional('action', {
        describe: 'Action to take: accept or dismiss',
        type: 'string',
        choices: ['accept', 'dismiss'],
        demandOption: true,
      })
      .option('port', {
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
        alias: 'p',
      })
      .option('text', {
        describe: 'Text to enter for prompt dialogs',
        type: 'string',
        alias: 't',
      })
      .example('$0 dialog accept', 'Accept the next dialog')
      .example('$0 dialog dismiss', 'Dismiss the next dialog')
      .example('$0 dialog accept --text "John Doe"', 'Accept prompt with text')
  },

  handler: async cmdContext => {
    try {
      const { argv, logger } = cmdContext

      const page = await BrowserHelper.getActivePage(argv.port)
      if (!page) {
        logger.error('No active page. Use "pw open" first')
        throw new Error('No active page')
      }

      logger.warn('⏳ Waiting for dialog...')

      // Set up a promise to wait for dialog
      const dialogPromise = new Promise<void>((resolve, reject) => {
        const dialogHandler = async (dialog: any) => {
          clearTimeout(timeout)

          logger.info(`📢 Dialog detected: ${dialog.type()}`)
          logger.info(`   Message: ${dialog.message()}`)

          try {
            if (argv.action === 'accept') {
              await dialog.accept(argv.text)
              logger.info(
                chalk.green(
                  `✅ Accepted dialog${argv.text ? ` with text: ${argv.text}` : ''}`
                )
              )
              console.log(
                `Accepted dialog${argv.text ? ` with text: ${argv.text}` : ''}`
              )
            } else {
              await dialog.dismiss()
              logger.success('Dismissed dialog')
              console.log('Dismissed dialog')
            }
            resolve()
          } catch (err) {
            reject(err)
          }
        }

        const timeout = setTimeout(() => {
          // Remove the event listener when timeout occurs
          page.off('dialog', dialogHandler)
          reject(new Error('No dialog appeared within 1000ms'))
        }, 1000)

        page.once('dialog', dialogHandler)
      })

      await dialogPromise
    } catch (error: any) {
      cmdContext.logger.error(`Failed to handle dialog: ${error.message}`)
      // Set proper exit code and throw to ensure command fails
      process.exitCode = 1
      throw error
    }
  },
})
