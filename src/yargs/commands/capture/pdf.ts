import { CommandModule, Arguments } from 'yargs';
import chalk from 'chalk';
import ora from 'ora';

import { BrowserHelper } from '../../../lib/browser-helper';

interface PdfArgs extends Arguments {
  path: string;
  port: number;
  timeout: number;
  format?: string;
  landscape?: boolean;
  'tab-index'?: number;
  'tab-id'?: string;
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
      })
      .option('landscape', {
        describe: 'Use landscape orientation',
        type: 'boolean',
        default: false
      })
      .option('tab-index', {
        describe: 'Target specific tab by index (0-based)',
        type: 'number',
        alias: 'tab'
      })
      .option('tab-id', {
        describe: 'Target specific tab by unique ID',
        type: 'string'
      })
      .conflicts('tab-index', 'tab-id');
  },
  
  handler: async (argv) => {
    const spinner = ora('Generating PDF...').start();
    const tabIndex = argv['tab-index'] as number | undefined;
    const tabId = argv['tab-id'] as string | undefined;

    try {
      await BrowserHelper.withTargetPage(argv.port, tabIndex, tabId, async (page) => {
        await page.pdf({
          path: argv.path,
          format: argv.format,
          landscape: argv.landscape
        });

        spinner.succeed(chalk.green(`✅ PDF saved to ${argv.path}`));
        console.log(`PDF saved to ${argv.path}`);
      });

      return;

    } catch (error: any) {
      spinner.fail(chalk.red(`❌ PDF generation failed: ${error.message}`));
      throw new Error("Command failed");
    }
  }
};