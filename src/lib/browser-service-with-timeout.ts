/**
 * Browser service with comprehensive timeout protection
 * Wraps all browser operations with timeouts to prevent hanging
 */

import { Browser, Page, BrowserContext } from 'playwright'
import { IBrowserService } from './browser-service'
import { BrowserHelper } from './browser-helper'
import { withTimeout, TimeoutError } from './timeout-utils'

// Operation-specific timeouts
const TIMEOUTS = {
  connect: 5000,
  getPage: 3000,
  navigation: 30000,
  interaction: 10000,
  evaluation: 15000,
  cdp: 2000,
}

/**
 * Enhanced browser service with timeout protection on all operations
 */
export class TimeoutProtectedBrowserService implements IBrowserService {
  async getBrowser(port = 9222): Promise<Browser> {
    return withTimeout(
      BrowserHelper.getBrowser(port),
      TIMEOUTS.connect,
      'Browser connection'
    )
  }

  async withBrowser<T>(
    port: number,
    action: (browser: Browser) => Promise<T>
  ): Promise<T> {
    const browser = await this.getBrowser(port)
    try {
      // Wrap the action in a timeout based on what it's likely doing
      return await withTimeout(
        action(browser),
        TIMEOUTS.navigation,
        'Browser operation'
      )
    } finally {
      // Always disconnect, but with a timeout
      await withTimeout(
        browser.close().catch(() => {}),
        2000,
        'Browser cleanup'
      )
    }
  }

  async getPages(port = 9222): Promise<Page[]> {
    return withTimeout(
      BrowserHelper.getPages(port),
      TIMEOUTS.getPage,
      'Get pages'
    )
  }

  async getPage(index?: number, port = 9222): Promise<Page | null> {
    return withTimeout(
      BrowserHelper.getPage(index, port),
      TIMEOUTS.getPage,
      `Get page at index ${index}`
    )
  }

  async getActivePage(port = 9222): Promise<Page> {
    return withTimeout(
      BrowserHelper.withActivePage(port, async page => page),
      TIMEOUTS.getPage,
      'Get active page'
    )
  }

  async withActivePage<T>(
    port: number,
    action: (page: Page) => Promise<T>
  ): Promise<T> {
    // The action timeout depends on what type of operation it is
    // We'll use a longer timeout by default and let specific commands override
    return withTimeout(
      BrowserHelper.withActivePage(port, action),
      TIMEOUTS.navigation,
      'Page operation'
    )
  }

  async getContexts(port = 9222): Promise<BrowserContext[]> {
    return withTimeout(
      BrowserHelper.getContexts(port),
      TIMEOUTS.getPage,
      'Get contexts'
    )
  }

  async isPortOpen(port: number): Promise<boolean> {
    return withTimeout(BrowserHelper.isPortOpen(port), 1000, 'Port check')
  }

  async launchChrome(
    port = 9222,
    browserPathOrType?: string,
    url?: string
  ): Promise<void> {
    return withTimeout(
      BrowserHelper.launchChrome(port, browserPathOrType, url),
      10000,
      'Chrome launch'
    )
  }

  async createTabHTTP(port: number, url: string): Promise<boolean> {
    return withTimeout(
      BrowserHelper.createTabHTTP(port, url),
      TIMEOUTS.connect,
      'Create tab'
    )
  }
}

/**
 * Factory function to create timeout-protected browser service
 */
export function createTimeoutProtectedBrowserService(): IBrowserService {
  return new TimeoutProtectedBrowserService()
}
