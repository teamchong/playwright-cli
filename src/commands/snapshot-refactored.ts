import chalk from 'chalk';

import { IBrowserService } from '../lib/browser-service';
import { CommandBase } from '../lib/command-base';
import { logger } from '../lib/logger';
import { extractInteractiveElements } from '../lib/ref-utils';

export class SnapshotCommand extends CommandBase {
  constructor(browserService?: IBrowserService) {
    super('snapshot', 'Capture interactive elements from the current page', browserService);
  }

  protected setupCommand(): void {
    this.command
      .option('-p, --port <number>', 'Chrome debugging port', '9222')
      .option('--json', 'Output as JSON format')
      .option('--full', 'Show full accessibility tree (not just interactive)');
  }

  protected async execute(args: any[], options: any): Promise<void> {
    const port = this.parsePort(options);

    await this.withActivePage(port, async page => {
      const snapshot = await page.accessibility.snapshot();

      if (options.full) {
        this.renderFullSnapshot(snapshot, options.json);
      } else {
        this.renderInteractiveElements(snapshot, options.json);
      }
    });
  }

  private renderFullSnapshot(snapshot: any, isJson: boolean): void {
    if (isJson) {
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
  }

  private renderInteractiveElements(snapshot: any, isJson: boolean): void {
    const interactiveElements = extractInteractiveElements(snapshot);

    if (isJson) {
      logger.info(JSON.stringify(interactiveElements, null, 2));
    } else {
      logger.info('Interactive Elements:');
      logger.info(chalk.gray('─'.repeat(40)));

      if (interactiveElements.length === 0) {
        this.logWarning('No interactive elements found');
      } else {
        interactiveElements.forEach(elem => {
          const roleColor = this.getRoleColor(elem.role);
          const name = elem.name || '(no text)';

          logger.info(
            `${roleColor(elem.role)} "${name}" ${chalk.gray(`[ref=${elem.ref}]`)}`
          );
        });
      }

      logger.info(chalk.gray('─'.repeat(40)));
      this.logInfo(`Found ${interactiveElements.length} interactive elements`);
    }
  }

  private getRoleColor(role: string): (text: string) => string {
    switch (role) {
    case 'button':
      return chalk.green;
    case 'link':
      return chalk.blue;
    case 'textbox':
      return chalk.yellow;
    default:
      return chalk.white;
    }
  }
}

// Export factory function instead of instance to avoid DI container issues during module load
export const createSnapshotCommand = () => new SnapshotCommand().getCommand();
