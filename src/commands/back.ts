import chalk from 'chalk';
import { Command } from 'commander';

import { BrowserHelper } from '../lib/browser-helper';
import { logger } from '../lib/logger';

export const backCommand = new Command('back')
  .description('Navigate back in browser history')
  .option('-p, --port <number>', 'Chrome debugging port', '9222')
  .action(async options => {
    try {
      const port = parseInt(options.port);
      const page = await BrowserHelper.getActivePage(port);

      if (!page) {
        throw new Error('No active page. Use "playwright open" first');
      }

      await page.goBack();
      logger.success('Navigated back');
    } catch (error: any) {
      logger.commandError(`Failed to navigate back: ${error.message}`);
      process.exit(1);
    }
  });
