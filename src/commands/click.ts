import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';

import { BrowserHelper } from '../lib/browser-helper';
import { findElementByRef, nodeToSelector } from '../lib/ref-utils';

export const clickCommand = new Command('click')
  .description('Click on an element')
  .argument('<selector>', 'Element selector')
  .option('-p, --port <port>', 'Debugging port', '9222')
  .option('--timeout <ms>', 'Timeout in milliseconds', '5000')
  .option('--force', 'Force click even if element is not visible')
  .option('--double', 'Perform a double-click instead of single click')
  .option('--shift', 'Hold Shift key while clicking')
  .option('--ctrl', 'Hold Ctrl key while clicking')
  .option('--alt', 'Hold Alt key while clicking')
  .option('--meta', 'Hold Meta key while clicking')
  .option(
    '--ctrl-or-meta',
    'Hold Ctrl (Windows/Linux) or Meta (macOS) key while clicking'
  )
  .action(async (selector, options) => {
    // Build modifiers array from options
    const modifiers: Array<
      'Shift' | 'Control' | 'Alt' | 'Meta' | 'ControlOrMeta'
    > = [];
    if (options.shift) modifiers.push('Shift');
    if (options.ctrl) modifiers.push('Control');
    if (options.alt) modifiers.push('Alt');
    if (options.meta) modifiers.push('Meta');
    if (options.ctrlOrMeta) modifiers.push('ControlOrMeta');

    const clickType = options.double ? 'Double-clicking' : 'Clicking';
    const modifierText = modifiers.length > 0 ? ` (${modifiers.join('+')})` : '';
    const spinner = ora(`${clickType}${modifierText} ${selector}...`).start();

    try {
      const port = parseInt(options.port);

      // Use withActivePage to auto-close connection
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
          spinner.text = `${clickType}${modifierText} ${element.role} "${element.name || ''}"...`;
        }

        // Click using Playwright
        const clickOptions = {
          timeout: parseInt(options.timeout),
          force: !!options.force,
          modifiers: modifiers.length > 0 ? modifiers : undefined
        };

        if (options.double) {
          await page.dblclick(actualSelector, clickOptions);
        } else {
          await page.click(actualSelector, clickOptions);
        }
      });

      const successMessage = options.double ? 'Double-clicked' : 'Clicked';
      spinner.succeed(
        chalk.green(`✅ ${successMessage}${modifierText} on ${selector}`)
      );
    } catch (error: any) {
      spinner.fail(chalk.red(`❌ Click failed: ${error.message}`));
      process.exit(1);
    }
  });
