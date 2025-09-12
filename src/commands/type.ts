import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';

import { BrowserHelper } from '../lib/browser-helper';
import { findElementByRef, nodeToSelector } from '../lib/ref-utils';

export const typeCommand = new Command('type')
  .description('Type text into an element')
  .argument('<selector>', 'Element selector')
  .argument('<text>', 'Text to type')
  .option('-p, --port <number>', 'Chrome debugging port', '9222')
  .option('--delay <ms>', 'Delay between keystrokes', '0')
  .option('--timeout <ms>', 'Timeout in milliseconds', '5000')
  .option('--clear', 'Clear field before typing')
  .action(async (selector, text, options) => {
    const spinner = ora(`Typing into ${selector}...`).start();

    try {
      const port = parseInt(options.port);

      await BrowserHelper.withActivePage(port, async page => {
        let actualSelector = selector;

        // Check if it's a ref selector
        const refMatch = selector.match(/^\[ref=([a-f0-9]+)\]$/);
        if (refMatch) {
          const targetRef = refMatch[1];
          spinner.text = `Finding element with ref=${targetRef}...`;

          // Get accessibility snapshot
          const snapshot = await page.accessibility.snapshot();

          // Find the element with this ref
          const element = findElementByRef(snapshot, targetRef);

          if (!element) {
            throw new Error(`No element found with ref=${targetRef}`);
          }

          // Convert to a selector
          actualSelector = nodeToSelector(element);
          spinner.text = `Typing into ${element.role} "${element.name || ''}"...`;
        }

        const timeout = parseInt(options.timeout || '5000');
        if (options.clear) {
          await page.fill(actualSelector, text, { timeout });
        } else {
          await page.type(actualSelector, text, {
            delay: parseInt(options.delay),
            timeout
          });
        }
      });

      spinner.succeed(chalk.green(`✅ Typed text into ${selector}`));
    } catch (error: any) {
      spinner.fail(chalk.red(`❌ Type failed: ${error.message}`));
      process.exit(1);
    }
  });
