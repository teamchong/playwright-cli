import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';

import { BrowserHelper } from '../lib/browser-helper';

export const screenshotCommand = new Command('screenshot')
  .alias('capture')
  .description('Take a screenshot')
  .argument('[path]', 'Output file path', 'screenshot.png')
  .option('--full-page', 'Capture full page')
  .option('--selector <selector>', 'Capture specific element')
  .action(async (path, options) => {
    const spinner = ora('Taking screenshot...').start();

    try {
      const page = await BrowserHelper.getActivePage();
      if (!page) {
        throw new Error('No browser session. Use "playwright open" first');
      }

      const screenshotOptions: any = {
        path,
        fullPage: !!options.fullPage
      };

      if (options.selector) {
        const element = await page.$(options.selector);
        if (!element) {
          throw new Error(`Element not found: ${options.selector}`);
        }
        await element.screenshot({ path });
      } else {
        await page.screenshot(screenshotOptions);
      }

      spinner.succeed(chalk.green(`✅ Screenshot saved to ${path}`));
    } catch (error: any) {
      spinner.fail(chalk.red(`❌ Screenshot failed: ${error.message}`));
      process.exit(1);
    }
  });
