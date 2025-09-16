import { Browser, Page, BrowserContext } from 'playwright'

/**
 * Interface for browser operations
 * This abstraction allows for easy testing and dependency injection
 */
export interface IBrowserService {
  /**
   * Get browser connection
   */
  getBrowser(port?: number): Promise<Browser>

  /**
   * Execute an action with auto-disconnect
   */
  withBrowser<T>(
    port: number,
    action: (browser: Browser) => Promise<T>
  ): Promise<T>

  /**
   * Get all pages from all contexts
   */
  getPages(port?: number): Promise<Page[]>

  /**
   * Get a specific page by index
   */
  getPage(index?: number, port?: number): Promise<Page | null>

  /**
   * Get the active page (first non-chrome:// page)
   */
  getActivePage(port?: number): Promise<Page>

  /**
   * Execute an action with active page and auto-disconnect
   */
  withActivePage<T>(
    port: number,
    action: (page: Page) => Promise<T>
  ): Promise<T>

  /**
   * Get all contexts
   */
  getContexts(port?: number): Promise<BrowserContext[]>

  /**
   * Check if browser is running on port
   */
  isPortOpen(port: number): Promise<boolean>

  /**
   * Launch Chrome with debugging port
   */
  launchChrome(
    port?: number,
    browserPathOrType?: string,
    url?: string
  ): Promise<void>

  /**
   * Create new tab via HTTP API
   */
  createTabHTTP(port: number, url: string): Promise<boolean>
}

/**
 * Mock browser service for testing
 */
export class MockBrowserService implements IBrowserService {
  private mockBrowser: any
  private mockPage: any

  constructor(mockBrowser?: any, mockPage?: any) {
    this.mockBrowser = mockBrowser || {
      contexts: () => [],
      close: () => Promise.resolve(),
      newContext: () =>
        Promise.resolve({
          newPage: () => Promise.resolve(this.mockPage),
          setDefaultTimeout: () => {},
          pages: () => [],
        }),
    }

    this.mockPage = mockPage || {
      url: () => 'https://example.com',
      accessibility: {
        snapshot: () => Promise.resolve(null),
      },
      click: () => Promise.resolve(),
      type: () => Promise.resolve(),
      goto: () => Promise.resolve(),
    }
  }

  async getBrowser(port = 9222): Promise<Browser> {
    return this.mockBrowser
  }

  async withBrowser<T>(
    port: number,
    action: (browser: Browser) => Promise<T>
  ): Promise<T> {
    return action(this.mockBrowser)
  }

  async getPages(port = 9222): Promise<Page[]> {
    return [this.mockPage]
  }

  async getPage(index = 0, port = 9222): Promise<Page | null> {
    return index === 0 ? this.mockPage : null
  }

  async getActivePage(port = 9222): Promise<Page> {
    return this.mockPage
  }

  async withActivePage<T>(
    port: number,
    action: (page: Page) => Promise<T>
  ): Promise<T> {
    return action(this.mockPage)
  }

  async getContexts(port = 9222): Promise<BrowserContext[]> {
    return []
  }

  async isPortOpen(port: number): Promise<boolean> {
    return true
  }

  async launchChrome(
    port = 9222,
    browserPathOrType?: string,
    url?: string
  ): Promise<void> {
    // Mock implementation - does nothing
  }

  async createTabHTTP(port: number, url: string): Promise<boolean> {
    return true
  }
}
