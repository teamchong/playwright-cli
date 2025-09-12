import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';

import { BrowserHelper } from '../lib/browser-helper';

export const pdfCommand = new Command('pdf')
  .description('Save page as PDF')
  .argument('[path]', 'Output file path', 'page.pdf')
  .option('--format <format>', 'Paper format (A4, Letter, etc)', 'A4')
  .action(async (path, options) => {
    const spinner = ora('Generating PDF...').start();

    try {
      const page = await BrowserHelper.getActivePage();
      if (!page) {
        throw new Error('No browser session. Use "playwright open" first');
      }

      await page.pdf({
        path,
        format: options.format
      });

      spinner.succeed(chalk.green(`✅ PDF saved to ${path}`));
    } catch (error: any) {
      spinner.fail(chalk.red(`❌ PDF generation failed: ${error.message}`));
      process.exit(1);
    }
  });
