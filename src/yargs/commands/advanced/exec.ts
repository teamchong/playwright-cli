/**
 * Exec Command - Yargs Implementation
 * 
 * Executes JavaScript/TypeScript files in the browser context with access to page object.
 * Supports reading from files or stdin for script execution.
 */

import * as fs from 'fs';
import chalk from 'chalk';
import { createCommand } from '../../lib/command-builder';
import { BrowserHelper } from '../../../lib/browser-helper';
import type { ExecuteOptions } from '../../types';

export const execCommand = createCommand<ExecuteOptions>({
  metadata: {
    name: 'exec',
    category: 'advanced',
    description: 'Execute JavaScript/TypeScript file in Playwright session',
    aliases: []
  },
  
  command: 'exec [file]',
  describe: 'Execute JavaScript/TypeScript file in Playwright session',
  
  builder: (yargs) => {
    return yargs
      .positional('file', {
        describe: 'JavaScript/TypeScript file to execute (or read from stdin)',
        type: 'string'
      })
      .option('port', {
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
        alias: 'p'
      })
      .option('json', {
        describe: 'Output result as JSON',
        type: 'boolean',
        default: false
      })
      .option('timeout', {
        describe: 'Timeout in milliseconds',
        type: 'number',
        default: 30000
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
      .conflicts('tab-index', 'tab-id')
      .example('$0 exec script.js', 'Execute a JavaScript file')
      .example('echo "console.log(location.href)" | $0 exec', 'Execute from stdin');
  },
  
  handler: async (cmdContext) => {
    try {
      const { argv, logger } = cmdContext;
      
      // Get code from file or stdin
      let code: string;
      if (argv.file) {
        // Read from file
        code = await fs.promises.readFile(argv.file, 'utf-8');
        logger.info(`📄 Executing ${argv.file}...`);
      } else {
        // Read from stdin
        logger.info(chalk.gray('📝 Reading from stdin (press Ctrl+D when done)...'));
        const chunks: Buffer[] = [];
        for await (const chunk of process.stdin) {
          chunks.push(chunk);
        }
        code = Buffer.concat(chunks).toString('utf-8');
      }
      
      const tabIndex = argv['tab-index'] as number | undefined;
      const tabId = argv['tab-id'] as string | undefined;
      
      await BrowserHelper.withTargetPage(argv.port, tabIndex, tabId, async (page) => {
        // Create a function that has access to page and context
        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
        const executeCode = new AsyncFunction('page', 'context', 'browser', 'console', code);
        
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
        
        // Get browser context for advanced operations
        const browserContext = page.context();
        const browser = browserContext.browser();
        
        // Execute the code with page context
        const result = await executeCode(page, browserContext, browser, consoleWrapper);
        
        if (argv.json) {
          logger.info(JSON.stringify({
            result,
            console: consoleOutput
          }, null, 2));
        } else if (result !== undefined) {
          logger.info(chalk.green('✅ Result:') + ' ' + String(result));
        } else {
          logger.success('Code executed successfully');
        }
      });
    } catch (error: any) {
      cmdContext.logger.error(`Execution failed: ${error.message}`);
      throw new Error("Command failed");
    }
  }
});