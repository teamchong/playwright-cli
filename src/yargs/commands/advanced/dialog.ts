/**
 * Dialog Command - Yargs Implementation
 * 
 * Handles browser dialogs (alert, confirm, prompt) by accepting or dismissing them.
 * Supports providing text for prompt dialogs.
 */

import chalk from 'chalk';
import { createCommand } from '../../lib/command-builder';
import { BrowserHelper } from '../../../lib/browser-helper';
import type { DialogOptions } from '../../types';

export const dialogCommand = createCommand<DialogOptions>({
  metadata: {
    name: 'dialog',
    category: 'advanced',
    description: 'Handle browser dialogs (alert, confirm, prompt)',
    aliases: []
  },
  
  command: 'dialog <action>',
  describe: 'Handle browser dialogs (alert, confirm, prompt)',
  
  builder: (yargs) => {
    return yargs
      .positional('action', {
        describe: 'Action to take: accept or dismiss',
        type: 'string',
        choices: ['accept', 'dismiss'],
        demandOption: true
      })
      .option('port', {
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
        alias: 'p'
      })
      .option('text', {
        describe: 'Text to enter for prompt dialogs',
        type: 'string',
        alias: 't'
      })
      .example('$0 dialog accept', 'Accept the next dialog')
      .example('$0 dialog dismiss', 'Dismiss the next dialog')
      .example('$0 dialog accept --text "John Doe"', 'Accept prompt with text');
  },
  
  handler: async (cmdContext) => {
    try {
      const { argv, logger } = cmdContext;
      
      const page = await BrowserHelper.getActivePage(argv.port);
      if (!page) {
        throw new Error('No active page. Use "playwright open" first');
      }
      
      logger.warn('⏳ Waiting for dialog...');
      
      // Set up a promise to wait for dialog
      const dialogPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('No dialog appeared within 2000ms'));
        }, 2000);
        
        page.once('dialog', async dialog => {
          clearTimeout(timeout);
          
          logger.info(`📢 Dialog detected: ${dialog.type()}`);
          logger.info(`   Message: ${dialog.message()}`);
          
          try {
            if (argv.action === 'accept') {
              await dialog.accept(argv.text);
              logger.info(
                chalk.green(
                  `✅ Accepted dialog${argv.text ? ` with text: ${argv.text}` : ''}`
                )
              );
              console.log(`Accepted dialog${argv.text ? ` with text: ${argv.text}` : ''}`);
            } else {
              await dialog.dismiss();
              logger.success('Dismissed dialog');
              console.log('Dismissed dialog');
            }
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });
      
      await dialogPromise;
    } catch (error: any) {
      cmdContext.logger.error(`Failed to handle dialog: ${error.message}`);
      throw new Error("Command failed");
    }
  }
});