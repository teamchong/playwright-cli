/**
 * Fill Command - Yargs Implementation
 * 
 * Fills multiple form fields with values using Playwright's page.fill() method.
 * Accepts selector=value pairs to fill multiple fields in one command.
 */

import { createCommand } from '../../lib/command-builder';
import { BrowserHelper } from '../../../lib/browser-helper';
import type { FillOptions } from '../../types';

export const fillCommand = createCommand<FillOptions>({
  metadata: {
    name: 'fill',
    category: 'interaction',
    description: 'Fill form fields with values',
    aliases: []
  },
  
  command: 'fill <fields...>',
  describe: 'Fill form fields with values',
  
  builder: (yargs) => {
    return yargs
      .positional('fields', {
        describe: 'Field selector=value pairs (e.g., "#email=test@example.com" "#password=secret")',
        type: 'string',
        array: true,
        demandOption: true
      })
      .option('port', {
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
        alias: 'p'
      })
      .option('timeout', {
        describe: 'Timeout in milliseconds',
        type: 'number',
        default: 5000
      });
  },
  
  handler: async ({ argv, logger, spinner }) => {
    const { fields, port, timeout } = argv;
    
    if (spinner) {
      spinner.text = `Filling ${fields.length} field(s)...`;
    }
    
    let filledCount = 0;
    const errors: string[] = [];
    
    await BrowserHelper.withActivePage(port, async (page) => {
      for (const field of fields) {
        const [selector, ...valueParts] = field.split('=');
        const value = valueParts.join('='); // Handle values with = in them
        
        if (!selector || !value) {
          errors.push(`Invalid field format: ${field}. Use selector=value`);
          continue;
        }
        
        try {
          await page.fill(selector, value, { timeout: timeout as number });
          logger.info(`  ✓ Filled ${selector} with "${value}"`);
          filledCount++;
        } catch (err: any) {
          errors.push(`Failed to fill ${selector}: ${err.message}`);
        }
      }
    });
    
    if (errors.length > 0) {
      errors.forEach(error => logger.warn(`  ⚠️  ${error}`));
    }
    
    logger.success(`Filled ${filledCount} field(s)`);
  }
});