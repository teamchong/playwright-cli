import chalk from 'chalk';
import { Command } from 'commander';

import { BrowserHelper } from '../lib/browser-helper';
import { logger } from '../lib/logger';

export const listCommand = new Command('list')
  .description('List open pages and contexts')
  .option('-p, --port <port>', 'Debugging port', '9222')
  .action(async options => {
    try {
      const port = parseInt(options.port);

      // Get all contexts and pages
      const contexts = await BrowserHelper.getContexts(port);
      const pages = await BrowserHelper.getPages(port);

      logger.info(
        chalk.cyan(`\n📂 Contexts: ${contexts.length} | Pages: ${pages.length}`)
      );

      // Group pages by context
      let contextIndex = 0;
      for (const context of contexts) {
        const contextPages = context.pages();
        if (contextPages.length > 0) {
          logger.info(`\nContext ${++contextIndex}:`);

          contextPages.forEach((page, j) => {
            const url = page.url();
            const title = url.startsWith('http') ? url.split('/')[2] : 'Local';
            logger.info(`  ${chalk.green('►')} Page ${j + 1}: ${title}`);
            logger.info(`     ${url}`);
          });
        }
      }
    } catch (error: any) {
      if (error.message.includes('No browser running')) {
        logger.warn('No browser running');
        logger.info('   Use "playwright open" to start a browser');
      } else {
        logger.commandError(`Failed to list pages: ${error.message}`);
      }
      process.exit(1);
    }
  });
