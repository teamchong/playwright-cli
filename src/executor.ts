#!/usr/bin/env node
/**
 * Playwright Code Executor Service
 * Executes JavaScript/TypeScript code in connected Playwright session
 */

import * as fs from 'fs';

import chalk from 'chalk';
import { Command } from 'commander';

import { BrowserHelper } from './lib/browser-helper';
import { logger } from './lib/logger';

const program = new Command();

program
  .name('playwright-exec')
  .description('Execute code in Playwright session')
  .argument('[file]', 'JavaScript file to execute (or read from stdin)')
  .option('--json', 'Output result as JSON')
  .action(async (file, options) => {
    try {
      // Get code from file or stdin
      let code: string;
      if (file) {
        code = await fs.promises.readFile(file, 'utf-8');
      } else {
        // Read from stdin for Node.js
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
          logger.info(args.map(arg => String(arg)).join(' '));
        },
        error: (...args: any[]) => {
          consoleOutput.push({ type: 'error', args });
          logger.error(args.map(arg => String(arg)).join(' '));
        },
        warn: (...args: any[]) => {
          consoleOutput.push({ type: 'warn', args });
          logger.warn(args.map(arg => String(arg)).join(' '));
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
        logger.info(`${chalk.green('Result:')} ${result}`);
      }
    } catch (error: any) {
      logger.commandError(`Execution failed: ${error.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
