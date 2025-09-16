/**
 * Console Command - Yargs Implementation
 * 
 * Monitors browser console output and displays messages with appropriate formatting.
 * Supports both continuous monitoring and one-time message retrieval.
 */

import chalk from 'chalk';
import { createCommand } from '../../lib/command-builder';
import { BrowserHelper } from '../../../lib/browser-helper';
import type { ConsoleOptions } from '../../types';

export const consoleCommand = createCommand<ConsoleOptions>({
  metadata: {
    name: 'console',
    category: 'advanced',
    description: 'Monitor browser console output',
    aliases: []
  },
  
  command: 'console',
  describe: 'Monitor browser console output',
  
  builder: (yargs) => {
    return yargs
      .option('port', {
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
        alias: 'p'
      })
      .option('once', {
        describe: 'Show current console messages and exit',
        type: 'boolean',
        default: false
      })
      .option('filter', {
        describe: 'Filter messages by type',
        type: 'string',
        choices: ['error', 'warn', 'info', 'debug', 'all'],
        default: 'all'
      })
      .option('json', {
        describe: 'Output messages as JSON',
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
      .conflicts('tab-index', 'tab-id')
      .example('$0 console', 'Monitor all console messages')
      .example('$0 console --filter error', 'Monitor only error messages')
      .example('$0 console --once', 'Show current messages and exit');
  },
  
  handler: async (cmdContext) => {
    try {
      const { argv, logger } = cmdContext;
      const tabIndex = argv['tab-index'] as number | undefined;
      const tabId = argv['tab-id'] as string | undefined;
      
      await BrowserHelper.withTargetPage(argv.port, tabIndex, tabId, async (page) => {
        const messages: any[] = [];
        
        // Set up console message listener
        page.on('console', msg => {
          const type = msg.type();
          const text = msg.text();
          
          // Apply filter if specified
          if (argv.filter !== 'all' && type !== argv.filter) {
            return;
          }
          
          const messageData = {
            type,
            text,
            timestamp: new Date().toISOString()
          };
          
          messages.push(messageData);
          
          if (argv.json) {
            logger.info(JSON.stringify(messageData));
          } else {
            const prefix = 
              type === 'error' ? chalk.red('❌') :
              type === 'warning' ? chalk.yellow('⚠️') :
              type === 'debug' ? chalk.gray('🐛') :
              chalk.blue('ℹ️');
            
            const output = `${prefix} [${type}] ${text}`;
            logger.info(output);
          }
        });
        
        if (!argv.json) {
          logger.info('📋 Console output:');
        }
        
        if (argv.once) {
          // Trigger a console message to ensure we get any buffered messages
          try {
            await page.evaluate('console.log("Playwright CLI connected")');
          } catch (e) {
            // Ignore evaluation errors in once mode
          }
          
          // Wait briefly for messages to be captured
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          if (argv.json) {
            logger.info(JSON.stringify({ messages }, null, 2));
          } else {
            if (messages.length === 0) {
              logger.info('📋 No console messages captured');
            } else {
              logger.info(`📋 Captured ${messages.length} console message(s)`);
            }
          }
        } else {
          if (!argv.json) {
            logger.info('Monitoring console... Press Ctrl+C to exit');
          }
          
          // Announce connection
          try {
            await page.evaluate('console.log("Playwright CLI connected - monitoring console")');
          } catch (e) {
            // Ignore evaluation errors
          }
          
          // Keep the process running
          process.stdin.resume();
          
          // Handle graceful shutdown
          process.on('SIGINT', () => {
            if (argv.json && messages.length > 0) {
              logger.info(JSON.stringify({ messages }, null, 2));
            }
            logger.info('\nStopped monitoring console');
          });
        }
      });
    } catch (error: any) {
      cmdContext.logger.error(`Console monitoring failed: ${error.message}`);
      throw new Error("Command failed");
    }
  }
});