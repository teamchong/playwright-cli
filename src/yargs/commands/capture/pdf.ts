import { CommandModule, Arguments } from 'yargs';
import chalk from 'chalk';
import ora from 'ora';

import { BrowserHelper } from '../../../lib/browser-helper';

interface PdfArgs extends Arguments {
  path: string;
  port: number;
  timeout: number;
  format?: string;
}

export const pdfCommand: CommandModule<{}, PdfArgs> = {
  command: 'pdf [path]',
  describe: 'Save page as PDF',
  
  builder: (yargs) => {
    return yargs
      .positional('path', {
        describe: 'Output file path',
        type: 'string',
        default: 'page.pdf'
      })
      .option('port', {
        alias: 'p',
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222
      })
      .option('timeout', {
        alias: 't',
        describe: 'Timeout in milliseconds',
        type: 'number',
        default: 30000
      })
      .option('format', {
        describe: 'Paper format (A4, Letter, etc)',
        type: 'string',
        default: 'A4'
      });
  },
  
  handler: async (argv) => {
    const spinner = ora('Generating PDF...').start();

    try {
      const page = await BrowserHelper.getActivePage(argv.port);
      if (!page) {
        throw new Error('No browser session. Use "playwright open" first');
      }

      await page.pdf({
        path: argv.path,
        format: argv.format
      });

      spinner.succeed(chalk.green(`✅ PDF saved to ${argv.path}`));
      // Exit cleanly

      return;

    } catch (error: any) {
      spinner.fail(chalk.red(`❌ PDF generation failed: ${error.message}`));
      throw new Error("Command failed");
    }
  }
};