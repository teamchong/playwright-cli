import chalk from 'chalk';

import { CommandBase } from '../lib/command-base';

/**
 * Navigate command implementation using the new CommandBase pattern
 * This is a proof of concept migration from the original navigate command
 */
export class NavigateCommand extends CommandBase {
  constructor() {
    super('navigate-v2', 'Navigate to a URL (v2 implementation)');
  }

  protected setupCommand(): void {
    this.command
      .alias('goto-v2')
      .argument('<url>', 'URL to navigate to')
      .option('-p, --port <port>', 'Debugging port', '9222')
      .option('--wait-until <event>', 'Wait until event (load, domcontentloaded, networkidle)', 'load')
      .option('-n, --new-tab', 'Always open URL in a new tab instead of current tab')
      .option('--tab-index <index>', 'Navigate specific tab by index (0-based)');
  }

  protected async execute(args: string[], options: any): Promise<void> {
    const [url] = args;

    this.startSpinner('Navigating...');

    const port = this.parsePort(options);

    if (options.newTab) {
      await this.navigateNewTab(url, options, port);
    } else if (options.tabIndex !== undefined) {
      await this.navigateSpecificTab(url, options, port);
    } else {
      await this.navigateCurrentTab(url, options, port);
    }
  }

  private async navigateNewTab(url: string, options: any, port: number): Promise<void> {
    await this.withBrowser(port, async (browser) => {
      const contexts = browser.contexts();
      let page: any;

      if (contexts.length === 0) {
        const context = await browser.newContext();
        page = await context.newPage();
      } else {
        page = await contexts[0].newPage();
      }

      await page.goto(url, { waitUntil: options.waitUntil as any });
      const title = await page.title();

      this.succeedSpinner(`✅ Opened new tab and navigated to ${url}`);
      this.logInfo(`Title: ${title}`);
    });
  }

  private async navigateSpecificTab(url: string, options: any, port: number): Promise<void> {
    const tabIndex = parseInt(options.tabIndex);

    await this.withBrowser(port, async (browser) => {
      const allPages: any[] = [];
      for (const context of browser.contexts()) {
        allPages.push(...context.pages());
      }

      if (tabIndex < 0 || tabIndex >= allPages.length) {
        throw new Error(`Invalid tab index: ${tabIndex}. Available tabs: 0-${allPages.length - 1}`);
      }

      const targetPage = allPages[tabIndex];
      await targetPage.goto(url, { waitUntil: options.waitUntil as any });
      await targetPage.bringToFront();

      const title = await targetPage.title();

      this.succeedSpinner(`✅ Navigated tab ${tabIndex} to ${url}`);
      this.logInfo(`Title: ${title}`);
    });
  }

  private async navigateCurrentTab(url: string, options: any, port: number): Promise<void> {
    await this.withActivePage(port, async (page) => {
      await page.goto(url, { waitUntil: options.waitUntil as any });
      const title = await page.title();

      this.succeedSpinner(`✅ Navigated to ${url}`);
      this.logInfo(`Title: ${title}`);
    });
  }
}

// Export the command instance
export const navigateV2Command = new NavigateCommand().getCommand();
