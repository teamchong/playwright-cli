import chalk from 'chalk';
import { Command } from 'commander';

import { BrowserHelper } from '../lib/browser-helper';
import { logger } from '../lib/logger';

export const resizeCommand = new Command('resize')
  .description('Resize browser window')
  .argument('<width>', 'Window width in pixels')
  .argument('<height>', 'Window height in pixels')
  .option('-p, --port <number>', 'Chrome debugging port', '9222')
  .action(async (width, height, options) => {
    try {
      const port = parseInt(options.port);
      const page = await BrowserHelper.getActivePage(port);

      if (!page) {
        throw new Error('No active page. Use "playwright open" first');
      }

      const w = parseInt(width);
      const h = parseInt(height);

      if (isNaN(w) || isNaN(h)) {
        throw new Error('Width and height must be numbers');
      }

      await page.setViewportSize({ width: w, height: h });
      logger.success(`Resized window to ${w}x${h}`);
    } catch (error: any) {
      logger.commandError(`Failed to resize window: ${error.message}`);
      process.exit(1);
    }
  });
