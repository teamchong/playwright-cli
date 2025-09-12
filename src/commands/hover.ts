import chalk from 'chalk';
import { Command } from 'commander';

import { BrowserHelper } from '../lib/browser-helper';
import { logger } from '../lib/logger';

export const hoverCommand = new Command('hover')
  .description('Hover over an element')
  .argument('<selector>', 'Element selector')
  .option('-p, --port <number>', 'Chrome debugging port', '9222')
  .action(async (selector, options) => {
    try {
      const port = parseInt(options.port);
      const page = await BrowserHelper.getActivePage(port);

      if (!page) {
        throw new Error('No active page. Use "playwright open" first');
      }

      await page.hover(selector);
      logger.success(`Hovered over ${selector}`);
    } catch (error: any) {
      logger.commandError(`Failed to hover: ${error.message}`);
      process.exit(1);
    }
  });
