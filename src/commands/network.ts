import chalk from 'chalk';
import { Command } from 'commander';

import { BrowserHelper } from '../lib/browser-helper';
import { logger } from '../lib/logger';

export const networkCommand = new Command('network')
  .description('Monitor network requests')
  .option('-p, --port <number>', 'Chrome debugging port', '9222')
  .option('--json', 'Output as JSON')
  .option('-f, --filter <pattern>', 'Filter URLs by pattern')
  .action(async options => {
    try {
      const port = parseInt(options.port);
      const page = await BrowserHelper.getActivePage(port);

      if (!page) {
        throw new Error('No active page. Use "playwright open" first');
      }

      const requests: any[] = [];

      // Set up request listener
      page.on('request', request => {
        const url = request.url();

        if (options.filter && !url.includes(options.filter)) {
          return;
        }

        const requestInfo = {
          url,
          method: request.method(),
          resourceType: request.resourceType(),
          timestamp: new Date().toISOString()
        };

        requests.push(requestInfo);

        if (!options.json) {
          logger.info(
            `${chalk.cyan(`→ ${requestInfo.method} ${requestInfo.resourceType}`)} ${requestInfo.url}`
          );
        }
      });

      // Set up response listener
      page.on('response', response => {
        const url = response.url();

        if (options.filter && !url.includes(options.filter)) {
          return;
        }

        if (!options.json) {
          const status = response.status();
          const statusColor =
            status >= 400
              ? chalk.red
              : status >= 300
                ? chalk.yellow
                : chalk.green;
          logger.info(`${statusColor(`← ${status}`)} ${url}`);
        }
      });

      logger.info(
        chalk.yellow('📡 Monitoring network requests... Press Ctrl+C to stop')
      );

      // Keep monitoring until interrupted
      await new Promise(() => {});
    } catch (error: any) {
      logger.commandError(`Failed to monitor network: ${error.message}`);
      process.exit(1);
    }
  });
