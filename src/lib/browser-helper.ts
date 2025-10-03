import { spawn } from 'child_process'
import * as fs from 'fs'
import os from 'os'

import {
  chromium,
  type Browser,
  type Page,
  type BrowserContext,
} from 'playwright'
import { withTimeout, TimeoutError, retryWithBackoff } from './timeout-utils'
import { BrowserTabRegistry } from './browser-tab-registry'
import { CDPConnectionPool } from './cdp-connection-pool'

/**
 * Helper class for managing Chrome browser connections and operations.
 * Provides stateless methods for browser automation via Chrome DevTools Protocol.
 *
 * @example
 * ```typescript
 * // Connect to browser and perform action
 * const browser = await BrowserHelper.getBrowser(9222);
 * const page = await BrowserHelper.getActivePage(9222);
 * await page.goto('https://example.com');
 * ```
 */
export class BrowserHelper {
  /**
   * Establishes a connection to a running Chrome browser via CDP.
   * Uses a connection pool to reuse connections and avoid the hanging process issue.
   * Sets default timeout to 5 seconds for all operations.
   *
   * @param port - The Chrome debugging port (default: 9222)
   * @returns Promise resolving to Browser instance
   * @throws {Error} When no browser is running on the specified port
   *
   * @example
   * ```typescript
   * const browser = await BrowserHelper.getBrowser(9222);
   * const contexts = browser.contexts();
   * ```
   */
  static async getBrowser(port: number = 9222): Promise<Browser> {
    try {
      return await withTimeout(
        (async () => {
          const pool = CDPConnectionPool.getInstance()
          return await pool.getConnection(port)
        })(),
        10000,
        `Getting browser connection on port ${port}`
      )
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw new Error(
          `Failed to get browser connection on port ${port}. ` +
            `The browser may be unresponsive or not running.`
        )
      }
      throw error
    }
  }

  /**
   * Executes an action with a browser connection and automatically releases it back to the pool.
   * Uses connection pooling to avoid the hanging process issue.
   *
   * @param port - The Chrome debugging port
   * @param action - Async function to execute with the browser instance
   * @returns Promise resolving to the action's return value
   *
   * @example
   * ```typescript
   * const pageCount = await BrowserHelper.withBrowser(9222, async (browser) => {
   *   return browser.contexts().reduce((total, ctx) => total + ctx.pages().length, 0);
   * });
   * ```
   */
  static async withBrowser<T>(
    port: number,
    action: (browser: Browser) => Promise<T>
  ): Promise<T> {
    const pool = CDPConnectionPool.getInstance()
    return await pool.withConnection(port, action)
  }

  /**
   * Retrieves all pages from all browser contexts.
   * Useful for listing available tabs or pages.
   *
   * @param port - The Chrome debugging port (default: 9222)
   * @returns Promise resolving to array of Page instances
   *
   * @example
   * ```typescript
   * const pages = await BrowserHelper.getPages(9222);
   * console.log(`Found ${pages.length} open pages`);
   * ```
   */
  static async getPages(port: number = 9222): Promise<Page[]> {
    return this.withBrowser(port, async browser => {
      const allPages: Page[] = []

      for (const context of browser.contexts()) {
        allPages.push(...context.pages())
      }

      return allPages
    })
  }

  /**
   * Retrieves a specific page by its index position.
   * Pages are indexed starting from 0 across all contexts.
   *
   * @param index - Zero-based index of the page to retrieve (default: 0)
   * @param port - The Chrome debugging port (default: 9222)
   * @returns Promise resolving to Page instance or null if index is out of bounds
   *
   * @example
   * ```typescript
   * const firstPage = await BrowserHelper.getPage(0, 9222);
   * const thirdPage = await BrowserHelper.getPage(2, 9222);
   * ```
   */
  static async getPage(
    index: number = 0,
    port: number = 9222
  ): Promise<Page | null> {
    const pages = await this.getPages(port)
    return pages[index] || null
  }

  /**
   * Retrieves the active page (first non-internal page).
   * Excludes chrome:// and about: pages, creates a new page if none found.
   *
   * ⚠️  WARNING: This method acquires but does not release browser connection!
   * Prefer withActivePage() for automatic cleanup to prevent connection leaks.
   * Only use this if you need the page reference without immediate cleanup.
   *
   * @param port - The Chrome debugging port (default: 9222)
   * @returns Promise resolving to the active Page instance
   *
   * @example
   * ```typescript
   * // ⚠️  NOT RECOMMENDED - Use withActivePage() instead
   * const page = await BrowserHelper.getActivePage(9222);
   * await page.goto('https://example.com');
   * // Connection leaked! Use withActivePage() for automatic cleanup.
   * ```
   */
  static async getActivePage(port: number = 9222): Promise<Page> {
    const browser = await this.getBrowser(port)

    // Find first non-internal page
    for (const context of browser.contexts()) {
      for (const page of context.pages()) {
        const url = page.url()
        if (!url.startsWith('chrome://') && !url.startsWith('about:')) {
          return page
        }
      }
    }

    // If no active page, create one
    const contexts = browser.contexts()
    if (contexts.length > 0) {
      return await contexts[0].newPage()
    }

    const context = await browser.newContext()
    return await context.newPage()
  }

  /**
   * Executes an action with the active page and automatically disconnects.
   * Finds the first non-internal page or creates one, then runs the action.
   * Provides automatic cleanup to prevent connection leaks.
   *
   * @param port - The Chrome debugging port
   * @param action - Async function to execute with the active page
   * @returns Promise resolving to the action's return value
   *
   * @example
   * ```typescript
   * const title = await BrowserHelper.withActivePage(9222, async (page) => {
   *   await page.goto('https://example.com');
   *   return await page.title();
   * });
   * ```
   */
  static async withActivePage<T>(
    port: number,
    action: (page: Page) => Promise<T>
  ): Promise<T> {
    return withTimeout(
      this.withBrowser(port, async browser => {
        // Find first non-internal page
        for (const context of browser.contexts()) {
          for (const page of context.pages()) {
            const url = page.url()
            if (!url.startsWith('chrome://') && !url.startsWith('about:')) {
              return await withTimeout(
                action(page),
                30000,
                'Executing action on active page'
              )
            }
          }
        }

        // If no active page, create one
        const contexts = browser.contexts()
        let page: Page
        if (contexts.length > 0) {
          page = await withTimeout(
            contexts[0].newPage(),
            5000,
            'Creating new page in existing context'
          )
        } else {
          const context = await withTimeout(
            browser.newContext(),
            5000,
            'Creating new browser context'
          )
          context.setDefaultTimeout(5000) // Set 5s timeout for new context
          page = await withTimeout(context.newPage(), 5000, 'Creating new page')
        }
        return await withTimeout(
          action(page),
          30000,
          'Executing action on new page'
        )
      }),
      35000,
      'Active page operation'
    )
  }

  /**
   * Gets the unique CDP target ID for a page.
   * Each browser tab has a unique, persistent ID from Chrome DevTools Protocol.
   *
   * @param page - The page to get the ID for
   * @returns Promise resolving to the unique tab ID
   *
   * @example
   * ```typescript
   * const pages = await BrowserHelper.getPages(9222);
   * const tabId = await BrowserHelper.getPageId(pages[0]);
   * console.log(`Tab ID: ${tabId}`); // "71A23E3014E274B134EB46BA2C2AA755"
   * ```
   */
  static async getPageId(page: Page): Promise<string> {
    // Add timeout protection for CDP operations with proper cleanup
    let timeoutId: NodeJS.Timeout | undefined
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('CDP operation timed out')), 2000)
    })

    let cdpSession = null
    try {
      cdpSession = await Promise.race([
        page.context().newCDPSession(page),
        timeoutPromise,
      ])

      clearTimeout(timeoutId) // Clear timeout on success
      timeoutId = undefined

      try {
        let innerTimeoutId: NodeJS.Timeout | undefined
        const innerTimeoutPromise = new Promise<never>((_, reject) => {
          innerTimeoutId = setTimeout(() => reject(new Error('CDP operation timed out')), 2000)
        })

        const targetInfo = await Promise.race([
          cdpSession.send('Target.getTargetInfo'),
          innerTimeoutPromise,
        ])

        clearTimeout(innerTimeoutId) // Clear timeout on success
        return targetInfo.targetInfo.targetId
      } finally {
        // Ensure CDP session is properly detached
        if (cdpSession) {
          await cdpSession.detach().catch(() => {}) // Ignore detach errors
        }
      }
    } catch (error) {
      // Clear timeout if still active
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }

      // Cleanup CDP session if it was created before the error
      if (cdpSession) {
        try {
          await cdpSession.detach().catch(() => {})
        } catch {}
      }

      // If CDP fails, fallback to page URL as ID (less reliable but won't hang)
      console.warn('CDP getPageId failed, using URL hash as fallback:', error)
      const url = page.url()
      // Generate a pseudo-ID from URL
      const crypto = require('crypto')
      return crypto.createHash('md5').update(url).digest('hex').toUpperCase()
    }
  }

  /**
   * Finds a page by its unique CDP target ID.
   * Searches through all pages in all contexts to find the matching ID.
   *
   * @param port - The Chrome debugging port
   * @param tabId - The unique tab ID to search for
   * @returns Promise resolving to the Page instance or null if not found
   *
   * @example
   * ```typescript
   * const page = await BrowserHelper.findPageById(9222, "71A23E3014E274B134EB46BA2C2AA755");
   * if (page) {
   *   await page.click("#button");
   * }
   * ```
   */
  static async findPageById(port: number, tabId: string): Promise<Page | null> {
    // Quick validation: CDP tab IDs are uppercase hex strings (32 chars)
    // If the format is clearly wrong, fail fast
    if (!/^[0-9A-F]{32}$/i.test(tabId)) {
      console.debug(`Tab ID "${tabId}" doesn't match CDP format, skipping search`)
      return null
    }

    return this.withBrowser(port, async browser => {
      // Try fast lookup using browser registry first
      try {
        const page = await BrowserTabRegistry.findPageById(browser, tabId)
        if (page) {
          return page
        }
      } catch (error) {
        console.debug('Browser registry lookup failed, falling back to CDP scan:', error)
      }

      // Fallback to original CDP scanning method
      const allPages: Page[] = []
      for (const context of browser.contexts()) {
        allPages.push(...context.pages())
      }

      // Check recent pages only - most lookups are for recent tabs
      const maxPagesToCheck = 10 // Reduced from 30 for faster failure
      const recentPages = allPages.slice(-maxPagesToCheck) // Get last N pages

      // Check pages in parallel for much faster lookup
      const checkPromises = recentPages.map(async (page, index) => {
        try {
          const pageId = await withTimeout(
            this.getPageId(page),
            100, // 100ms per page should be enough
            `Getting page ID for page ${index}`
          )
          return { page, pageId }
        } catch (error) {
          return { page: null, pageId: null }
        }
      })

      const results = await Promise.all(checkPromises)

      // Find matching page
      for (const result of results) {
        if (result.pageId === tabId && result.page) {
          return result.page
        }
      }

      return null
    })
  }

  /**
   * Executes an action with a specific page and automatically disconnects.
   * Supports targeting by either index or unique tab ID.
   * If neither is provided, uses the active page.
   *
   * @param port - The Chrome debugging port
   * @param tabIndex - Zero-based index of the tab (optional)
   * @param tabId - Unique tab ID from CDP (optional)
   * @param action - Async function to execute with the page
   * @returns Promise resolving to the action's return value
   * @throws {Error} When the specified tab doesn't exist or both tabIndex and tabId are provided
   *
   * @example
   * ```typescript
   * // Use by index
   * await BrowserHelper.withTargetPage(9222, 1, undefined, async (page) => {
   *   return await page.title();
   * });
   *
   * // Use by unique ID
   * await BrowserHelper.withTargetPage(9222, undefined, "71A23E3014E274B134EB46BA2C2AA755", async (page) => {
   *   return await page.title();
   * });
   *
   * // Use active page
   * await BrowserHelper.withTargetPage(9222, undefined, undefined, async (page) => {
   *   return await page.title();
   * });
   * ```
   */
  static async withTargetPage<T>(
    port: number,
    tabIndex: number | undefined,
    tabId: string | undefined,
    action: (page: Page) => Promise<T>
  ): Promise<T> {
    // Validate arguments
    if (tabIndex !== undefined && tabId !== undefined) {
      throw new Error(
        'Cannot specify both tabIndex and tabId. Use one or the other.'
      )
    }

    // If neither specified, use active page
    if (tabIndex === undefined && tabId === undefined) {
      return this.withActivePage(port, action)
    }

    // Wrap the entire operation with timeout protection
    const operation = async () => {
      return this.withBrowser(port, async (browser) => {
        let targetPage: Page | null = null

        if (tabId !== undefined) {
          // Find by unique ID with timeout
          try {
            targetPage = await withTimeout(
              this.findPageById(port, tabId),
              5000,
              `Finding tab with ID ${tabId}`
            )
            if (!targetPage) {
              // This is not a timeout but a legitimate "not found"
              throw new Error(`Tab with ID "${tabId}" not found`)
            }
          } catch (error) {
            if (error instanceof TimeoutError) {
              throw new Error(
                `Timeout finding tab with ID "${tabId}". The tab may not exist or the browser is unresponsive.`
              )
            }
            throw error
          }
        } else if (tabIndex !== undefined) {
          // Find by index with timeout
          const pages = await withTimeout(
            this.getPages(port),
            3000,
            'Getting page list'
          )
          if (tabIndex < 0 || tabIndex >= pages.length) {
            throw new Error(
              `Tab index ${tabIndex} is out of bounds. Available tabs: 0-${pages.length - 1}`
            )
          }
          targetPage = pages[tabIndex]
        }

        if (!targetPage) {
          throw new Error('Unable to find target page')
        }

        // Execute the action with timeout protection
        // Add a small delay to allow Chrome event loop to process
        await new Promise(resolve => setImmediate(resolve))
        const result = await withTimeout(
          action(targetPage),
          30000, // 30 second timeout for the actual action
          'Executing page action'
        )
        return result
      })
    }

    // Add overall timeout protection for the entire operation
    return withTimeout(
      operation(),
      35000, // 35 seconds total (slightly more than inner timeout)
      'Page operation'
    )
  }

  /**
   * Retrieves all browser contexts from the connected browser.
   * Each context represents an isolated browsing session.
   *
   * @param port - The Chrome debugging port (default: 9222)
   * @returns Promise resolving to array of BrowserContext instances
   *
   * @example
   * ```typescript
   * const contexts = await BrowserHelper.getContexts(9222);
   * console.log(`Found ${contexts.length} browser contexts`);
   * ```
   */
  static async getContexts(port: number = 9222): Promise<BrowserContext[]> {
    return this.withBrowser(port, async browser => {
      return browser.contexts()
    })
  }

  /**
   * Checks if a browser is running and accepting connections on the specified port.
   * Uses a TCP connection test with a 1-second timeout.
   *
   * @param port - The port number to check
   * @returns Promise resolving to true if port is open and accepting connections
   *
   * @example
   * ```typescript
   * const isRunning = await BrowserHelper.isPortOpen(9222);
   * if (!isRunning) {
   *   console.log('Browser is not running, starting it...');
   * }
   * ```
   */
  static async isPortOpen(port: number): Promise<boolean> {
    const net = require('net')
    return new Promise(resolve => {
      const socket = net.createConnection(port, 'localhost')
      socket.on('connect', () => {
        socket.end()
        resolve(true)
      })
      socket.on('error', () => {
        resolve(false)
      })
      socket.setTimeout(1000)
      socket.on('timeout', () => {
        socket.destroy()
        resolve(false)
      })
    })
  }

  /**
   * Launches Chrome browser with remote debugging enabled.
   * Supports multiple browser types (Chrome, Brave, Edge, Chromium) and custom paths.
   * Creates a temporary user data directory and runs the browser detached.
   *
   * @param port - The debugging port to use (default: 9222)
   * @param browserPathOrType - Browser type name ('chrome', 'brave', 'edge', 'chromium') or full path
   * @param url - Optional URL to open on startup
   * @throws {Error} When the specified browser is not found
   *
   * @example
   * ```typescript
   * // Launch default Chrome
   * await BrowserHelper.launchChrome(9222);
   *
   * // Launch Brave browser with URL
   * await BrowserHelper.launchChrome(9222, 'brave', 'https://example.com');
   *
   * // Launch with custom path
   * await BrowserHelper.launchChrome(9222, '/path/to/chrome');
   * ```
   */
  static async launchChrome(
    port: number = 9222,
    browserPathOrType?: string,
    url?: string
  ): Promise<void> {
    // Determine browser path
    let browserPath: string

    if (browserPathOrType && browserPathOrType.includes('/')) {
      // It's a full path
      browserPath = browserPathOrType
    } else {
      // It's a browser type name, use default paths
      const browserPaths: Record<string, string> = {
        chrome: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        brave: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
        edge: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        chromium: '/Applications/Chromium.app/Contents/MacOS/Chromium',
      }

      browserPath =
        browserPaths[browserPathOrType || 'chrome'] || browserPaths.chrome
    }

    // Check if browser exists
    try {
      await fs.promises.access(browserPath)
    } catch {
      throw new Error(`Browser not found at: ${browserPath}`)
    }

    const args = [
      `--remote-debugging-port=${port}`,
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${os.tmpdir()}/playwright-chrome-${port}`,
    ]

    // Add headless mode for tests
    if (process.env.PLAYWRIGHT_CLI_HEADLESS === 'true') {
      args.push('--headless=new')
    }

    if (url) {
      args.push(url)
    }

    const child = spawn(browserPath, args, {
      detached: true,
      stdio: 'ignore',
    })

    // Unref the child process so the parent can exit
    child.unref()

    // Wait for CDP server to be ready (with retries)
    const maxRetries = 20 // 20 retries = 10 seconds max
    const retryDelay = 500 // 500ms between retries

    for (let i = 0; i < maxRetries; i++) {
      await new Promise(resolve => setTimeout(resolve, retryDelay))

      // Check if CDP is ready by testing the port
      const isReady = await this.isPortOpen(port)
      if (isReady) {
        // Port is open, but give CDP server a moment to fully initialize
        await new Promise(resolve => setTimeout(resolve, 300))
        return
      }
    }

    // If we get here, browser didn't start in time
    throw new Error(
      `Browser launched but CDP server not ready on port ${port} after ${maxRetries * retryDelay}ms`
    )
  }

  /**
   * Creates a new browser tab via Chrome's HTTP API.
   * Used as a fallback when WebSocket connections fail.
   *
   * @param port - The Chrome debugging port
   * @param url - The URL to load in the new tab
   * @returns Promise resolving to true if tab creation succeeded
   *
   * @example
   * ```typescript
   * const success = await BrowserHelper.createTabHTTP(9222, 'https://example.com');
   * if (success) {
   *   console.log('New tab created successfully');
   * }
   * ```
   */
  static async createTabHTTP(port: number, url: string): Promise<boolean> {
    try {
      const response = await fetch(
        `http://localhost:${port}/json/new?${encodeURIComponent(url)}`,
        {
          method: 'PUT',
        }
      )
      return response.ok
    } catch {
      return false
    }
  }
}
