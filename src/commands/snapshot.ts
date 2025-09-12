import chalk from 'chalk';
import { Command } from 'commander';

import { BrowserHelper } from '../lib/browser-helper';
import { logger } from '../lib/logger';
import { extractInteractiveElements } from '../lib/ref-utils';

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
export const snapshotCommand = new Command('snapshot')
  .description('Capture interactive elements from the current page')
  .option('-p, --port <number>', 'Chrome debugging port', '9222')
  .option('--json', 'Output as JSON format')
  .option('--full', 'Show full accessibility tree (not just interactive)')
  .action(async options => {
    try {
      const port = parseInt(options.port);

      await BrowserHelper.withActivePage(port, async page => {
        const snapshot = await page.accessibility.snapshot();

        if (options.full) {
          // Show full tree (old behavior)
          if (options.json) {
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

          if (options.json) {
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
    } catch (error: any) {
      logger.error(
        chalk.red(`❌ Failed to capture snapshot: ${error.message}`)
      );
      process.exit(1);
    }
  });
