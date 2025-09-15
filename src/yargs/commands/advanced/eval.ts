/**
 * Eval Command - Yargs Implementation
 * 
 * Executes JavaScript expressions in the browser context and returns results.
 * Supports JSON output formatting for complex objects.
 */

import { createCommand } from '../../lib/command-builder';
import { BrowserHelper } from '../../../lib/browser-helper';
import { logger } from '../../../lib/logger';
import type { EvalOptions } from '../../types';

export const evalCommand = createCommand<EvalOptions>({
  metadata: {
    name: 'eval',
    category: 'advanced',
    description: 'Execute JavaScript in the browser',
    aliases: ['execute']
  },
  
  command: 'eval <expression>',
  describe: 'Execute JavaScript in the browser',
  
  builder: (yargs) => {
    return yargs
      .positional('expression', {
        describe: 'JavaScript code to execute',
        type: 'string',
        demandOption: true
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
      .example('$0 eval "document.title"', 'Get the page title')
      .example('$0 eval "Array.from(document.querySelectorAll(\'a\')).map(a => a.href)" --json', 'Get all links as JSON');
  },
  
  handler: async (context) => {
    try {
      const { argv, logger } = context;
      const page = await BrowserHelper.getActivePage(argv.port);
      
      if (!page) {
        throw new Error('No browser session. Use "playwright open" first');
      }
      
      // Execute the JavaScript expression
      const result = await page.evaluate(argv.expression);
      
      // Format output based on options
      if (argv.json) {
        logger.info(JSON.stringify(result, null, 2));
      } else {
        logger.info(String(result));
      }
    } catch (error: any) {
      logger.commandError(`Evaluation failed: ${error.message}`);
      throw new Error("Command failed");
    }
  }
});