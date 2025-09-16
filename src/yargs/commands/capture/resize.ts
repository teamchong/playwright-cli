import { CommandModule, Arguments } from 'yargs';
import chalk from 'chalk';

import { BrowserHelper } from '../../../lib/browser-helper';
import { logger } from '../../../lib/logger';

interface ResizeArgs extends Arguments {
  width: string;
  height: string;
  port: number;
  timeout: number;
  'tab-index'?: number;
  'tab-id'?: string;
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
      })
      .option('tab-index', {
        describe: 'Target specific tab by index (0-based)',
        type: 'number',
        alias: 'tab'
      })
      .option('tab-id', {
        describe: 'Target specific tab by unique ID',
        type: 'string'
      })
      .conflicts('tab-index', 'tab-id');
  },
  
  handler: async (argv) => {
    const tabIndex = argv['tab-index'] as number | undefined;
    const tabId = argv['tab-id'] as string | undefined;
    
    try {
      await BrowserHelper.withTargetPage(argv.port, tabIndex, tabId, async (page) => {
        const w = parseInt(argv.width);
        const h = parseInt(argv.height);

        if (isNaN(w) || isNaN(h)) {
          throw new Error('Width and height must be numbers');
        }

        await page.setViewportSize({ width: w, height: h });
        logger.success(`Resized window to ${w}x${h}`);
        console.log(`Resized window to ${w}x${h}`);
      });

      return;

    } catch (error: any) {
      logger.commandError(`Failed to resize window: ${error.message}`);
      throw new Error("Command failed");
    }
  }
};