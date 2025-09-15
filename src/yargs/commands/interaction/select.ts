/**
 * Select Command - Yargs Implementation
 * 
 * Selects option(s) in a dropdown using Playwright's page.selectOption() method.
 * Supports single and multiple value selection.
 */

import { createCommand } from '../../lib/command-builder';
import { BrowserHelper } from '../../../lib/browser-helper';
import type { SelectOptions } from '../../types';

export const selectCommand = createCommand<SelectOptions>({
  metadata: {
    name: 'select',
    category: 'interaction',
    description: 'Select option(s) in a dropdown',
    aliases: []
  },
  
  command: 'select <selector> <values...>',
  describe: 'Select option(s) in a dropdown',
  
  builder: (yargs) => {
    return yargs
      .positional('selector', {
        describe: 'Dropdown selector',
        type: 'string',
        demandOption: true
      })
      .positional('values', {
        describe: 'Value(s) to select',
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
    const { selector, values, port } = argv;
    
    if (spinner) {
      spinner.text = `Selecting ${values.join(', ')} in ${selector}...`;
    }
    
    await BrowserHelper.withActivePage(port, async (page) => {
      await page.selectOption(selector, values, { timeout: 5000 });
    });
    
    logger.success(`Selected ${values.join(', ')} in ${selector}`);
  }
});