import { CommandModule, Arguments } from 'yargs';
import chalk from 'chalk';

import { BrowserHelper } from '../../../lib/browser-helper';
import { logger } from '../../../lib/logger';

interface ResizeArgs extends Arguments {
  width: string;
  height: string;
  port: number;
  timeout: number;
}

export const resizeCommand: CommandModule<{}, ResizeArgs> = {
  command: 'resize <width> <height>',
  describe: 'Resize browser window',
  
  builder: (yargs) => {
    return yargs
      .positional('width', {
        describe: 'Window width in pixels',
        type: 'string',
        demandOption: true
      })
      .positional('height', {
        describe: 'Window height in pixels',
        type: 'string',
        demandOption: true
      })
      .option('port', {
        alias: 'p',
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222
      })
      .option('timeout', {
        alias: 't',
        describe: 'Timeout in milliseconds',
        type: 'number',
        default: 30000
      });
  },
  
  handler: async (argv) => {
    try {
      const page = await BrowserHelper.getActivePage(argv.port);

      if (!page) {
        throw new Error('No active page. Use "playwright open" first');
      }

      const w = parseInt(argv.width);
      const h = parseInt(argv.height);

      if (isNaN(w) || isNaN(h)) {
        throw new Error('Width and height must be numbers');
      }

      await page.setViewportSize({ width: w, height: h });
      logger.success(`Resized window to ${w}x${h}`);
      // Exit cleanly

      return;

    } catch (error: any) {
      logger.commandError(`Failed to resize window: ${error.message}`);
      throw new Error("Command failed");
    }
  }
};