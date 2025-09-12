import chalk from 'chalk';
import { Command } from 'commander';

import { BrowserHelper } from '../lib/browser-helper';
import { logger } from '../lib/logger';

export const consoleCommand = new Command('console')
  .description('Monitor browser console output')
  .option('--once', 'Show current console messages and exit')
  .action(async options => {
    try {
      const page = await BrowserHelper.getActivePage();
      if (!page) {
        throw new Error('No browser session. Use "playwright open" first');
      }

      logger.info('📋 Console output:');

      const messages: string[] = [];

      page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        const prefix =
          type === 'error'
            ? chalk.red('❌')
            : type === 'warning'
              ? chalk.yellow('⚠️')
              : chalk.blue('ℹ️');

        const output = `${prefix} [${type}] ${text}`;
        logger.info(output);
        messages.push(output);
      });

      if (options.once) {
        await page.evaluate(() => {
          logger.info('Playwright CLI connected');
        });
        setTimeout(() => process.exit(0), 1000);
      } else {
        logger.info('Monitoring console... Press Ctrl+C to exit');

        await page.evaluate(() => {
          logger.info('Playwright CLI connected - monitoring console');
        });

        process.stdin.resume();
      }
    } catch (error: any) {
      logger.commandError(`Console monitoring failed: ${error.message}`);
      process.exit(1);
    }
  });
