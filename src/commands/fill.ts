import chalk from 'chalk';
import { Command } from 'commander';

import { BrowserHelper } from '../lib/browser-helper';
import { logger } from '../lib/logger';

export const fillCommand = new Command('fill')
  .description('Fill form fields with values')
  .argument(
    '<fields...>',
    'Field selector=value pairs (e.g., "#email=test@example.com" "#password=secret")'
  )
  .option('-p, --port <number>', 'Chrome debugging port', '9222')
  .action(async (fields, options) => {
    try {
      const port = parseInt(options.port);
      const page = await BrowserHelper.getActivePage(port);

      if (!page) {
        throw new Error('No active page. Use "playwright open" first');
      }

      let filledCount = 0;

      for (const field of fields) {
        const [selector, ...valueParts] = field.split('=');
        const value = valueParts.join('='); // Handle values with = in them

        if (!selector || !value) {
          logger.warn(
            chalk.yellow(
              `⚠️  Invalid field format: ${field}. Use selector=value`
            )
          );
          continue;
        }

        try {
          await page.fill(selector, value);
          logger.info(`  ✓ Filled ${selector} with "${value}"`);
          filledCount++;
        } catch (err: any) {
          logger.warn(
            chalk.yellow(`  ⚠️  Failed to fill ${selector}: ${err.message}`)
          );
        }
      }

      logger.success(`Filled ${filledCount} field(s)`);
    } catch (error: any) {
      logger.commandError(`Failed to fill form: ${error.message}`);
      process.exit(1);
    }
  });
