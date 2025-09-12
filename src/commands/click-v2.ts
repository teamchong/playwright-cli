import { CommandBase } from '../lib/command-base';

/**
 * Click command implementation using the new CommandBase pattern
 * This is a proof of concept migration from the original click command
 */
export class ClickCommand extends CommandBase {
  constructor() {
    super('click-v2', 'Click on an element (v2 implementation)');
  }

  protected setupCommand(): void {
    this.command
      .argument('<selector>', 'Element selector')
      .option('-p, --port <port>', 'Debugging port', '9222')
      .option('--timeout <ms>', 'Timeout in milliseconds', '5000')
      .option('--force', 'Force click even if element is not visible')
      .option('--double', 'Perform a double-click instead of single click')
      .option('--shift', 'Hold Shift key while clicking')
      .option('--ctrl', 'Hold Ctrl key while clicking')
      .option('--alt', 'Hold Alt key while clicking')
      .option('--meta', 'Hold Meta key while clicking')
      .option('--ctrl-or-meta', 'Hold Ctrl (Windows/Linux) or Meta (macOS) key while clicking');
  }

  protected async execute(args: string[], options: any): Promise<void> {
    const [selector] = args;

    // Build modifiers array from options
    const modifiers: Array<'Shift' | 'Control' | 'Alt' | 'Meta' | 'ControlOrMeta'> = [];
    if (options.shift) modifiers.push('Shift');
    if (options.ctrl) modifiers.push('Control');
    if (options.alt) modifiers.push('Alt');
    if (options.meta) modifiers.push('Meta');
    if (options.ctrlOrMeta) modifiers.push('ControlOrMeta');

    const clickType = options.double ? 'Double-clicking' : 'Clicking';
    const modifierText = modifiers.length > 0 ? ` (${modifiers.join('+')})` : '';

    this.startSpinner(`${clickType}${modifierText} ${selector}...`);

    const port = this.parsePort(options);

    await this.withActivePage(port, async (page) => {
      const { actualSelector, element } = await this.resolveRefSelector(
        selector,
        page,
        'Finding element with ref...'
      );

      // Update spinner text if we resolved a ref
      if (element) {
        this.updateSpinner(`${clickType}${modifierText} ${element.role} "${element.name || ''}"...`);
      }

      // Click using Playwright
      const clickOptions = {
        timeout: this.parseTimeout(options),
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
    this.succeedSpinner(`✅ ${successMessage}${modifierText} on ${selector}`);
  }
}

// Export the command instance
export const clickV2Command = new ClickCommand().getCommand();
