import * as fs from 'fs';

import chalk from 'chalk';
import { Command } from 'commander';

import { BrowserHelper } from '../lib/browser-helper';
import { logger } from '../lib/logger';

export const execCommand = new Command('exec')
  .description('Execute JavaScript/TypeScript file in Playwright session')
  .argument(
    '[file]',
    'JavaScript/TypeScript file to execute (or read from stdin)'
  )
  .option('--json', 'Output result as JSON')
  .action(async (file, options) => {
    try {
      // Get code from file or stdin
      let code: string;
      if (file) {
        // Read from file
        code = await fs.promises.readFile(file, 'utf-8');
        logger.info(`📄 Executing ${file}...`);
      } else {
        // Read from stdin
        logger.info(
          chalk.gray('📝 Reading from stdin (press Ctrl+D when done)...')
        );
        const chunks: Buffer[] = [];
        for await (const chunk of process.stdin) {
          chunks.push(chunk);
        }
        code = Buffer.concat(chunks).toString('utf-8');
      }

      // Get the page
      const page = await BrowserHelper.getActivePage();
      if (!page) {
        throw new Error('No browser session. Use "playwright open" first');
      }

      // Create a function that has access to page
      const AsyncFunction = Object.getPrototypeOf(
        async function () {}
      ).constructor;
      const executeCode = new AsyncFunction('page', 'console', code);

      // Create a console wrapper that captures output
      const consoleOutput: any[] = [];
      const consoleWrapper = {
        log: (...args: any[]) => {
          consoleOutput.push({ type: 'log', args });
          logger.info(args.map(String).join(' '));
        },
        error: (...args: any[]) => {
          consoleOutput.push({ type: 'error', args });
          logger.error(args.map(String).join(' '));
        },
        warn: (...args: any[]) => {
          consoleOutput.push({ type: 'warn', args });
          logger.warn(args.map(String).join(' '));
        },
        info: (...args: any[]) => {
          consoleOutput.push({ type: 'info', args });
          console.info(...args);
        }
      };

      // Execute the code with page context
      const result = await executeCode(page, consoleWrapper);

      if (options.json) {
        logger.info(
          JSON.stringify(
            {
              result,
              console: consoleOutput
            },
            null,
            2
          )
        );
      } else if (result !== undefined) {
        logger.info(chalk.green('✅ Result:') + ' ' + String(result));
      } else {
        logger.success('Code executed successfully');
      }
    } catch (error: any) {
      logger.commandError(`Execution failed: ${error.message}`);
      process.exit(1);
    }
  });
