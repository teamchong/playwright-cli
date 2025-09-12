/**
 * Navigate command with validation decorators
 * Demonstrates the new validation layer implementation
 */

import chalk from 'chalk';

import { CommandBase } from '../lib/command-base';
import { Sanitizers } from '../lib/decorators';
import { ValidationUtils, Validators, ValidationError } from '../lib/validation';

const WAIT_UNTIL_OPTIONS = ['load', 'domcontentloaded', 'networkidle'] as const;
type WaitUntilOption = typeof WAIT_UNTIL_OPTIONS[number];

export class NavigateValidatedCommand extends CommandBase {
  constructor() {
    super('navigate-v2', 'Navigate to a URL (with validation)');
  }

  protected setupCommand(): void {
    this.command
      .alias('goto-v2')
      .argument('<url>', 'URL to navigate to')
      .option('-p, --port <port>', 'Debugging port', '9222')
      .option(
        '--wait-until <event>',
        'Wait until event (load, domcontentloaded, networkidle)',
        'load'
      );
  }

  protected async execute(args: any[], options: any): Promise<void> {
    const [url] = args;
    const { port, waitUntil } = options;

    // Apply validation using the validation utilities
    const validationSchema = {
      url: [Validators.url({ required: true })],
      port: [Validators.port({ required: false })],
      waitUntil: [Validators.enum([...WAIT_UNTIL_OPTIONS], { required: false })]
    };

    const dataToValidate = { url, port, waitUntil };
    const { isValid, errors, sanitizedData } = ValidationUtils.validateObject(
      dataToValidate,
      validationSchema
    );

    if (!isValid) {
      const errorMessages = Object.entries(errors)
        .flatMap(([field, fieldErrors]) =>
          fieldErrors.map(error => `${field}: ${error}`)
        );
      throw new ValidationError(errorMessages);
    }

    // Use sanitized data
    const sanitizedUrl = Sanitizers.normalizeUrl(sanitizedData.url || url);
    const portNum = this.parsePort(options);

    this.startSpinner(`Navigating to ${sanitizedUrl}...`);

    await this.withActivePage(portNum, async page => {
      await page.goto(sanitizedUrl, { waitUntil: sanitizedData.waitUntil || waitUntil });

      this.succeedSpinner(`✅ Navigated to ${sanitizedUrl}`);
      this.logInfo(`Title: ${await page.title()}`);
    });
  }
}

export const navigateValidatedCommand = new NavigateValidatedCommand().getCommand();
