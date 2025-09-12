import chalk from 'chalk';
import { Command } from 'commander';

import { BrowserHelper } from '../lib/browser-helper';
import { logger } from '../lib/logger';

export const evalCommand = new Command('eval')
  .alias('execute')
  .description('Execute JavaScript in the browser')
  .argument('<code>', 'JavaScript code to execute')
  .option('-p, --port <port>', 'Debugging port', '9222')
  .option('--json', 'Output result as JSON')
  .action(async (code, options) => {
    try {
      const port = parseInt(options.port);

      // Get the active page and evaluate
      const page = await BrowserHelper.getActivePage(port);
      const result = await page.evaluate(code);

      if (options.json) {
        logger.info(JSON.stringify(result, null, 2));
      } else {
        logger.info(String(result));
      }
    } catch (error: any) {
      logger.commandError(`Evaluation failed: ${error.message}`);
      process.exit(1);
    }
  });
