import chalk from 'chalk';

import { CommandBase } from '../lib/command-base';

export class NavigateCommand extends CommandBase {
  constructor() {
    super('navigate', 'Navigate to a URL');
    // Configure retry strategy for network operations
    this.configureRetryStrategy('exponential', 'network');
  }

  protected setupCommand(): void {
    this.command
      .alias('goto')
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
    const port = this.parsePort(options);

    this.startSpinner('Navigating...');

    await this.withActivePageRetry(port, async page => {
      await page.goto(url, { waitUntil: options.waitUntil as any });

      this.succeedSpinner(`✅ Navigated to ${url}`);
      this.logInfo(`Title: ${await page.title()}`);
    });

    // Log retry metrics if there were any failures
    this.logRetryMetrics();
  }
}

export const navigateCommand = new NavigateCommand().getCommand();
