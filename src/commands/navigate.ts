import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';

import { BrowserHelper } from '../lib/browser-helper';
import { logger } from '../lib/logger';

export const navigateCommand = new Command('navigate')
  .alias('goto')
  .description('Navigate to a URL')
  .argument('<url>', 'URL to navigate to')
  .option('-p, --port <port>', 'Debugging port', '9222')
  .option(
    '--wait-until <event>',
    'Wait until event (load, domcontentloaded, networkidle)',
    'load'
  )
  .action(async (url, options) => {
    const spinner = ora('Navigating...').start();

    try {
      const port = parseInt(options.port || '9222');

      await BrowserHelper.withActivePage(port, async page => {
        await page.goto(url, { waitUntil: options.waitUntil as any });

        spinner.succeed(chalk.green(`✅ Navigated to ${url}`));
        logger.info(`   Title: ${await page.title()}`);
      });
    } catch (error: any) {
      spinner.fail(chalk.red(`❌ Navigation failed: ${error.message}`));
      process.exit(1);
    }
  });
