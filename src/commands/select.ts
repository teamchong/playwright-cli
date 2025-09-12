import chalk from 'chalk';
import { Command } from 'commander';

import { BrowserHelper } from '../lib/browser-helper';
import { logger } from '../lib/logger';

export const selectCommand = new Command('select')
  .description('Select option(s) in a dropdown')
  .argument('<selector>', 'Dropdown selector')
  .argument('<values...>', 'Value(s) to select')
  .option('-p, --port <number>', 'Chrome debugging port', '9222')
  .action(async (selector, values, options) => {
    try {
      const port = parseInt(options.port);
      const page = await BrowserHelper.getActivePage(port);

      if (!page) {
        throw new Error('No active page. Use "playwright open" first');
      }

      await page.selectOption(selector, values);
      logger.info(
        chalk.green(`✅ Selected ${values.join(', ')} in ${selector}`)
      );
    } catch (error: any) {
      logger.commandError(`Failed to select option: ${error.message}`);
      process.exit(1);
    }
  });
