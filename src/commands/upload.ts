import chalk from 'chalk';
import { Command } from 'commander';

import { BrowserHelper } from '../lib/browser-helper';
import { logger } from '../lib/logger';

export const uploadCommand = new Command('upload')
  .description('Upload file(s) to a file input')
  .argument('<selector>', 'File input selector')
  .argument('<files...>', 'File path(s) to upload')
  .option('-p, --port <number>', 'Chrome debugging port', '9222')
  .action(async (selector, files, options) => {
    try {
      const port = parseInt(options.port);
      const page = await BrowserHelper.getActivePage(port);

      if (!page) {
        throw new Error('No active page. Use "playwright open" first');
      }

      // Resolve absolute paths
      const path = require('path');
      const absolutePaths = files.map((file: string) =>
        path.isAbsolute(file) ? file : path.resolve(process.cwd(), file)
      );

      await page.setInputFiles(selector, absolutePaths);
      logger.info(
        chalk.green(`✅ Uploaded ${files.length} file(s) to ${selector}`)
      );
    } catch (error: any) {
      logger.commandError(`Failed to upload files: ${error.message}`);
      process.exit(1);
    }
  });
