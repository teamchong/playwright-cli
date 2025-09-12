import chalk from 'chalk';
import { Command } from 'commander';

import { BrowserHelper } from '../lib/browser-helper';
import { logger } from '../lib/logger';

export const closeCommand = new Command('close')
  .description('Close the browser')
  .action(async () => {
    try {
      const browser = await BrowserHelper.getBrowser();
      await browser.close();
      logger.success('Browser closed');
    } catch (error: any) {
      logger.warn('No browser session to close');
    }
  });
