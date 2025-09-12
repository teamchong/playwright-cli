import chalk from 'chalk';
import { Command } from 'commander';

import { BrowserHelper } from '../lib/browser-helper';
import { logger } from '../lib/logger';

export const tabsCommand = new Command('tabs')
  .description('Manage browser tabs')
  .argument('[action]', 'Action: list, new, close, select', 'list')
  .option('-i, --index <number>', 'Tab index for close/select actions')
  .option('-u, --url <url>', 'URL for new tab')
  .option('-p, --port <number>', 'Chrome debugging port', '9222')
  .action(async (action, options) => {
    try {
      const port = parseInt(options.port);

      switch (action) {
      case 'list': {
        const pages = await BrowserHelper.getPages(port);

        if (pages.length === 0) {
          logger.warn('No tabs open');
          return;
        }

        logger.info('Open tabs:');
        pages.forEach((page, index) => {
          const url = page.url();
          const title = url === 'about:blank' ? 'New Tab' : url;
          logger.info(`  ${index}: ${title}`);
        });
        break;
      }

      case 'new': {
        const browser = await BrowserHelper.getBrowser(port);
        if (!browser) {
          throw new Error(
            'No browser connection. Use "playwright open" first'
          );
        }

        const newPage = await browser.newPage();
        if (options.url) {
          await newPage.goto(options.url);
        }

        logger.info(
          chalk.green(
            `✅ Created new tab${options.url ? ` with ${options.url}` : ''}`
          )
        );
        break;
      }

      case 'close': {
        const pages = await BrowserHelper.getPages(port);
        const index = parseInt(options.index || '0');

        if (index < 0 || index >= pages.length) {
          throw new Error(`Invalid tab index: ${index}`);
        }

        await pages[index].close();
        logger.success(`Closed tab ${index}`);
        break;
      }

      case 'select': {
        const pages = await BrowserHelper.getPages(port);
        const index = parseInt(options.index || '0');

        if (index < 0 || index >= pages.length) {
          throw new Error(`Invalid tab index: ${index}`);
        }

        await pages[index].bringToFront();
        logger.success(`Selected tab ${index}`);
        break;
      }

      default:
        throw new Error(
          `Unknown action: ${action}. Use list, new, close, or select`
        );
      }
    } catch (error: any) {
      logger.commandError(`Failed to manage tabs: ${error.message}`);
      process.exit(1);
    }
  });
