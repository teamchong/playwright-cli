/**
 * Click command with validation layer
 * Demonstrates comprehensive parameter validation and sanitization
 */

import chalk from 'chalk';

import { CommandBase } from '../lib/command-base';
import { Sanitizers } from '../lib/decorators';
import { ValidationUtils, Validators, ValidationError } from '../lib/validation';

const MODIFIER_KEYS = ['Alt', 'Control', 'Meta', 'Shift', 'ControlOrMeta'] as const;
type ModifierKey = typeof MODIFIER_KEYS[number];

export class ClickValidatedCommand extends CommandBase {
  constructor() {
    super('click-v2', 'Click on an element (with validation)');
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

  protected async execute(args: any[], options: any): Promise<void> {
    const [selector] = args;
    const { port, timeout, force, double, shift, ctrl, alt, meta, ctrlOrMeta } = options;

    // Define validation schema
    const validationSchema = {
      selector: [Validators.selector({ required: true })],
      port: [Validators.port({ required: false })],
      timeout: [Validators.timeout({ required: false })]
    };

    // Validate core parameters
    const coreData = { selector, port, timeout };
    const { isValid, errors, sanitizedData } = ValidationUtils.validateObject(
      coreData,
      validationSchema
    );

    if (!isValid) {
      const errorMessages = Object.entries(errors)
        .flatMap(([field, fieldErrors]) =>
          fieldErrors.map(error => `${field}: ${error}`)
        );
      throw new ValidationError(errorMessages);
    }

    // Validate and build modifiers array
    const modifiers: ModifierKey[] = [];
    const modifierValidationErrors: string[] = [];

    if (shift) {
      if (typeof shift !== 'boolean') {
        modifierValidationErrors.push('shift: Must be a boolean value');
      } else {
        modifiers.push('Shift');
      }
    }

    if (ctrl) {
      if (typeof ctrl !== 'boolean') {
        modifierValidationErrors.push('ctrl: Must be a boolean value');
      } else {
        modifiers.push('Control');
      }
    }

    if (alt) {
      if (typeof alt !== 'boolean') {
        modifierValidationErrors.push('alt: Must be a boolean value');
      } else {
        modifiers.push('Alt');
      }
    }

    if (meta) {
      if (typeof meta !== 'boolean') {
        modifierValidationErrors.push('meta: Must be a boolean value');
      } else {
        modifiers.push('Meta');
      }
    }

    if (ctrlOrMeta) {
      if (typeof ctrlOrMeta !== 'boolean') {
        modifierValidationErrors.push('ctrlOrMeta: Must be a boolean value');
      } else {
        modifiers.push('ControlOrMeta');
      }
    }

    if (modifierValidationErrors.length > 0) {
      throw new ValidationError(modifierValidationErrors);
    }

    // Use sanitized and validated data
    const cleanSelector = Sanitizers.trim(sanitizedData.selector || selector);
    const portNum = this.parsePort(options);
    const timeoutNum = this.parseTimeout(options);

    // Validate boolean options
    const booleanValidationErrors: string[] = [];

    if (force !== undefined && typeof force !== 'boolean') {
      booleanValidationErrors.push('force: Must be a boolean value');
    }

    if (double !== undefined && typeof double !== 'boolean') {
      booleanValidationErrors.push('double: Must be a boolean value');
    }

    if (booleanValidationErrors.length > 0) {
      throw new ValidationError(booleanValidationErrors);
    }

    // Execute the click operation
    const clickType = double ? 'Double-clicking' : 'Clicking';
    const modifierText = modifiers.length > 0 ? ` (${modifiers.join('+')})` : '';

    this.startSpinner(`${clickType}${modifierText} ${cleanSelector}...`);

    await this.withActivePage(portNum, async page => {
      // Handle ref selector
      const { actualSelector, element } = await this.resolveRefSelector(
        cleanSelector,
        page,
        'Finding element with ref...'
      );

      // Update spinner with element info if it's a ref
      if (element) {
        this.updateSpinner(`${clickType}${modifierText} ${element.role} "${element.name || ''}"...`);
      }

      // Click using Playwright with validated options
      const clickOptions = {
        timeout: timeoutNum,
        force: !!force,
        modifiers: modifiers.length > 0 ? modifiers : undefined
      };

      if (double) {
        await page.dblclick(actualSelector, clickOptions);
      } else {
        await page.click(actualSelector, clickOptions);
      }

      const successMessage = double ? 'Double-clicked' : 'Clicked';
      this.succeedSpinner(`${successMessage}${modifierText} on ${cleanSelector}`);

      // Log validation success info
      this.logInfo('✓ Parameters validated successfully');
      if (modifiers.length > 0) {
        this.logInfo(`✓ Modifier keys: ${modifiers.join(', ')}`);
      }
    });
  }
}

export const clickValidatedCommand = new ClickValidatedCommand().getCommand();
