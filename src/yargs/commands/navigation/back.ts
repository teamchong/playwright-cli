/**
 * Back Command - Yargs Implementation
 * 
 * Navigates back in browser history using Playwright's page.goBack() method.
 */

import { createCommand } from '../../lib/command-builder';
import { BrowserHelper } from '../../../lib/browser-helper';
import type { NavigationHistoryOptions } from '../../types';

export const backCommand = createCommand<NavigationHistoryOptions>({
  metadata: {
    name: 'back',
    category: 'navigation',
    description: 'Navigate back in browser history'
  },
  
  command: 'back',
  describe: 'Navigate back in browser history',
  
  builder: (yargs) => {
    return yargs
      .option('port', {
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
        alias: 'p'
      })
      .example('$0 back', 'Go back one page in browser history')
      .example('$0 back --port 8080', 'Go back using specific port');
  },
  
  handler: async ({ argv, logger, spinner }) => {
    if (spinner) {
      spinner.start('Navigating back...');
    }
    
    await BrowserHelper.withActivePage(argv.port, async (page) => {
      try {
        await page.goBack();
      } catch (error: any) {
        // If goBack fails, it might be because there's no history
        if (error.message.includes('go back') || error.message.includes('history')) {
          throw new Error('Cannot navigate back - no previous page in history');
        }
        throw error;
      }
      
      const title = await page.title();
      const url = page.url();
      
      if (spinner) {
        spinner.succeed('Navigated back');
      }
      
      logger.success('Successfully navigated back');
      logger.info(`Current page: ${url}`);
      logger.info(`Title: ${title}`);
      
      if (argv.json) {
        logger.json({
          success: true,
          action: 'back',
          url,
          title
        });
      }
    });
  },
  
  supportsJson: true
});