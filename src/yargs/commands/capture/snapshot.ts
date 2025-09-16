import { CommandModule, Arguments } from 'yargs';
import chalk from 'chalk';

import { BrowserHelper } from '../../../lib/browser-helper';
import { logger } from '../../../lib/logger';
import { extractInteractiveElements } from '../../../lib/ref-utils';

interface SnapshotArgs extends Arguments {
  port: number;
  timeout: number;
  json?: boolean;
  full?: boolean;
  'tab-index'?: number;
  'tab-id'?: string;
}

/**
 * Snapshot command that captures the page's accessibility tree.
 * Extracts interactive elements with reference IDs for use with click/type commands.
 * Supports both compact (interactive-only) and full tree output modes.
 *
 * @example
 * ```bash
 * playwright snapshot                 # Show interactive elements with refs
 * playwright snapshot --full          # Show complete accessibility tree
 * playwright snapshot --json          # Output as JSON for scripting
 * ```
 */
export const snapshotCommand: CommandModule<{}, SnapshotArgs> = {
  command: 'snapshot',
  describe: 'Capture interactive elements from the current page',
  
  builder: (yargs) => {
    return yargs
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
      .option('json', {
        describe: 'Output as JSON format',
        type: 'boolean'
      })
      .option('full', {
        describe: 'Show full accessibility tree (not just interactive)',
        type: 'boolean'
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
    const tabIndex = argv['tab-index'] as number | undefined;
    const tabId = argv['tab-id'] as string | undefined;
    
    try {
      await BrowserHelper.withTargetPage(argv.port, tabIndex, tabId, async page => {
        const snapshot = await page.accessibility.snapshot();

        if (argv.full) {
          // Show full tree (old behavior)
          if (argv.json) {
            logger.info(JSON.stringify(snapshot, null, 2));
          } else {
            const printNode = (node: any, indent = '') => {
              const role = node.role || 'unknown';
              const name = node.name ? ` "${node.name}"` : '';
              logger.info(`${indent}${role}${name}`);

              if (node.children) {
                node.children.forEach((child: any) => {
                  printNode(child, indent + '  ');
                });
              }
            };

            logger.info('Full Accessibility Tree:');
            if (snapshot) {
              printNode(snapshot);
            }
          }
        } else {
          // Show only interactive elements with refs (new default)
          const interactiveElements = extractInteractiveElements(snapshot);

          if (argv.json) {
            logger.info(JSON.stringify(interactiveElements, null, 2));
          } else {
            logger.info('Interactive Elements:');
            logger.info(chalk.gray('─'.repeat(40)));

            if (interactiveElements.length === 0) {
              logger.warn('No interactive elements found');
            } else {
              interactiveElements.forEach(elem => {
                const roleColor =
                  elem.role === 'button'
                    ? chalk.green
                    : elem.role === 'link'
                      ? chalk.blue
                      : elem.role === 'textbox'
                        ? chalk.yellow
                        : chalk.white;

                const name = elem.name || '(no text)';
                logger.info(
                  `${roleColor(elem.role)} "${name}" ${chalk.gray(`[ref=${elem.ref}]`)}`
                );
              });
            }

            logger.info(chalk.gray('─'.repeat(40)));
            logger.info(
              chalk.gray(
                `Found ${interactiveElements.length} interactive elements`
              )
            );
          }
        }
      });
      // Exit cleanly

      return;

    } catch (error: any) {
      logger.error(
        chalk.red(`❌ Failed to capture snapshot: ${error.message}`)
      );
      throw new Error("Command failed");
    }
  }
};