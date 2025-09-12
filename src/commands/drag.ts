import chalk from 'chalk';
import { Command } from 'commander';

import { BrowserHelper } from '../lib/browser-helper';
import { logger } from '../lib/logger';

export const dragCommand = new Command('drag')
  .description('Drag from source to target element')
  .argument('<source>', 'Source element selector')
  .argument('<target>', 'Target element selector')
  .option('-p, --port <number>', 'Chrome debugging port', '9222')
  .action(async (source, target, options) => {
    try {
      const port = parseInt(options.port);
      const page = await BrowserHelper.getActivePage(port);

      if (!page) {
        throw new Error('No active page. Use "playwright open" first');
      }

      await page.dragAndDrop(source, target);
      logger.success(`Dragged from ${source} to ${target}`);
    } catch (error: any) {
      logger.commandError(`Failed to drag and drop: ${error.message}`);
      process.exit(1);
    }
  });
