/**
 * Type command with validation layer - demonstrates retrofitting existing commands
 * Shows how to add validation to existing commands with minimal refactoring
 */

import chalk from 'chalk';

import { CommandBase } from '../lib/command-base';
import { ValidationError } from '../lib/validation';
import { ValidationHelper } from '../lib/validation-helper';

export class TypeValidatedCommand extends CommandBase {
  constructor() {
    super('type-v2', 'Type text into an element (with validation)');
  }

  protected setupCommand(): void {
    this.command
      .argument('<selector>', 'Element selector')
      .argument('<text>', 'Text to type')
      .option('-p, --port <port>', 'Debugging port', '9222')
      .option('--timeout <ms>', 'Timeout in milliseconds', '5000')
      .option('--delay <ms>', 'Delay between keystrokes in milliseconds', '0')
      .option('--clear', 'Clear existing text before typing')
      .option('--submit', 'Press Enter after typing');
  }

  protected async execute(args: any[], options: any): Promise<void> {
    const [selector, text] = args;
    const { port, timeout, delay, clear, submit } = options;

    // Use ValidationHelper for easy parameter validation
    const schema = ValidationHelper.createSchema()
      .selector('selector', true, 'Selector is required and must be valid')
      .string('text', 1, 10000, true, 'Text is required and must be 1-10000 characters')
      .port('port', false, 'Port must be a valid number between 1-65535')
      .timeout('timeout', false, 'Timeout must be a positive number')
      .custom('delay', [
        (value, fieldName) => {
          if (!value) return { isValid: true, errors: [], sanitizedValue: 0 };
          const num = parseInt(String(value), 10);
          if (isNaN(num) || num < 0) {
            return { isValid: false, errors: [`${fieldName} must be a non-negative number`] };
          }
          return { isValid: true, errors: [], sanitizedValue: num };
        }
      ], (value) => parseInt(String(value || '0'), 10));

    // Validate the parameters
    const paramsToValidate = { selector, text, port, timeout, delay };
    const { isValid, errors, sanitizedParams } = schema.validate(paramsToValidate, {
      throwOnError: true
    });

    // Validate boolean options separately
    const booleanValidation = ValidationHelper.validateBooleans({ clear, submit });
    if (!booleanValidation.isValid) {
      const allErrors = [...errors, ...booleanValidation.errors];
      throw new ValidationError(allErrors);
    }

    // Use validated and sanitized parameters
    const cleanSelector = sanitizedParams.selector;
    const cleanText = sanitizedParams.text;
    const portNum = this.parsePort(options);
    const timeoutNum = this.parseTimeout(options);
    const delayNum = sanitizedParams.delay || 0;

    this.startSpinner(`Typing into ${cleanSelector}...`);

    await this.withActivePage(portNum, async page => {
      // Handle ref selector
      const { actualSelector, element } = await this.resolveRefSelector(
        cleanSelector,
        page,
        'Finding element with ref...'
      );

      // Update spinner with element info if it's a ref
      if (element) {
        this.updateSpinner(`Typing into ${element.role} "${element.name || ''}"...`);
      }

      // Clear existing text if requested
      if (clear) {
        await page.fill(actualSelector, '');
        this.logInfo('✓ Existing text cleared');
      }

      // Type the text with specified options
      const typeOptions: any = { timeout: timeoutNum };
      if (delayNum > 0) {
        typeOptions.delay = delayNum;
        this.logInfo(`✓ Typing with ${delayNum}ms delay between keystrokes`);
      }

      await page.type(actualSelector, cleanText, typeOptions);

      // Submit if requested
      if (submit) {
        await page.press(actualSelector, 'Enter');
        this.logInfo('✓ Enter key pressed');
      }

      this.succeedSpinner(`✅ Typed "${cleanText.length > 50 ? cleanText.substring(0, 50) + '...' : cleanText}" into ${cleanSelector}`);

      // Log validation success
      this.logInfo(`✓ Input validated: ${cleanText.length} characters`);
      if (delayNum > 0) {
        this.logInfo(`✓ Typing delay: ${delayNum}ms`);
      }
    });
  }
}

export const typeValidatedCommand = new TypeValidatedCommand().getCommand();
