import chalk from 'chalk';
import { Command } from 'commander';

import { BrowserHelper } from '../lib/browser-helper';
import { logger } from '../lib/logger';

export const pressCommand = new Command('press')
  .description('Press a keyboard key')
  .argument('<key>', 'Key to press (e.g., Enter, Escape, ArrowDown, a, A)')
  .option('-p, --port <number>', 'Chrome debugging port', '9222')
  .action(async (key, options) => {
    try {
      const port = parseInt(options.port);
      const page = await BrowserHelper.getActivePage(port);

      if (!page) {
        throw new Error('No active page. Use "playwright open" first');
      }

      await page.keyboard.press(key);
      logger.success(`Pressed key: ${key}`);
    } catch (error: any) {
      logger.commandError(`Failed to press key: ${error.message}`);
      process.exit(1);
    }
  });
