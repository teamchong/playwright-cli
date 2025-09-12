import chalk from 'chalk';
import { Command } from 'commander';

import { BrowserHelper } from '../lib/browser-helper';
import { logger } from '../lib/logger';

export const dialogCommand = new Command('dialog')
  .description('Handle browser dialogs (alert, confirm, prompt)')
  .argument('<action>', 'Action to take: accept or dismiss')
  .option('-t, --text <text>', 'Text to enter for prompt dialogs')
  .option('-p, --port <number>', 'Chrome debugging port', '9222')
  .action(async (action, options) => {
    try {
      const port = parseInt(options.port);
      const page = await BrowserHelper.getActivePage(port);

      if (!page) {
        throw new Error('No active page. Use "playwright open" first');
      }

      if (action !== 'accept' && action !== 'dismiss') {
        throw new Error('Action must be "accept" or "dismiss"');
      }

      // Set up dialog handler
      page.once('dialog', async dialog => {
        logger.info(`📢 Dialog detected: ${dialog.type()}`);
        logger.info(`   Message: ${dialog.message()}`);

        if (action === 'accept') {
          await dialog.accept(options.text);
          logger.info(
            chalk.green(
              `✅ Accepted dialog${options.text ? ` with text: ${options.text}` : ''}`
            )
          );
        } else {
          await dialog.dismiss();
          logger.success('Dismissed dialog');
        }
      });

      logger.warn('⏳ Waiting for dialog...');

      // Wait for a dialog to appear (timeout after 30 seconds)
      await page.waitForEvent('dialog', { timeout: 5000 });
    } catch (error: any) {
      logger.commandError(`Failed to handle dialog: ${error.message}`);
      process.exit(1);
    }
  });
