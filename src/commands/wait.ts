import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';

import { BrowserHelper } from '../lib/browser-helper';

export const waitCommand = new Command('wait')
  .description('Wait for element or timeout')
  .argument('[selector]', 'Element selector to wait for')
  .option('--timeout <ms>', 'Timeout in milliseconds', '5000')
  .option(
    '--state <state>',
    'Wait for state (visible, hidden, attached, detached)',
    'visible'
  )
  .action(async (selector, options) => {
    const spinner = ora(
      selector ? `Waiting for ${selector}...` : 'Waiting...'
    ).start();

    try {
      const page = await BrowserHelper.getActivePage();
      if (!page) {
        throw new Error('No browser session. Use "playwright open" first');
      }

      if (selector) {
        await page.waitForSelector(selector, {
          timeout: parseInt(options.timeout),
          state: options.state as any
        });
        spinner.succeed(
          chalk.green(`✅ Element ${selector} is ${options.state}`)
        );
      } else {
        await page.waitForTimeout(parseInt(options.timeout));
        spinner.succeed(chalk.green(`✅ Waited ${options.timeout}ms`));
      }
    } catch (error: any) {
      spinner.fail(chalk.red(`❌ Wait failed: ${error.message}`));
      process.exit(1);
    }
  });
