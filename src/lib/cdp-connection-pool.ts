/**
 * CDP Connection Pool
 *
 * Manages a pool of Chrome DevTools Protocol connections to avoid
 * the Playwright limitation where connectOverCDP connections never close.
 *
 * Monitor tab feature was completely removed to fix timeout issues.
 */

import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from 'playwright'

interface PooledConnection {
  browser: Browser
  port: number
  lastUsed: number
  inUse: boolean
}


interface ManagedTab {
  tabId: string
  page: Page
  url: string
  inUse: boolean
  lastAccessed: number
  createdAt: number
  owner?: string // Test name or process that owns this tab
  persistent?: boolean // Don't auto-cleanup if true
}

export class CDPConnectionPool {
  private static instance: CDPConnectionPool | null = null
  private connections: Map<string, PooledConnection> = new Map()
  private readonly maxConnections = 10
  private readonly connectionTimeout = 60000 // 1 minute idle timeout
  private cleanupInterval: NodeJS.Timeout | null = null


  // Tab pool management
  private managedTabs: Map<string, ManagedTab> = new Map()
  private readonly MAX_TABS = 10 // Maximum tabs to prevent Chrome crashes (lowered from 50)
  private readonly TAB_IDLE_TIMEOUT = 2 * 60 * 1000 // 2 minutes idle before cleanup (reduced from 5)
  private tabCleanupInterval: NodeJS.Timeout | null = null

  private constructor() {
    // Start cleanup interval to remove stale connections
    this.startCleanupInterval()
    // Start tab cleanup interval
    this.startTabCleanup()
  }

  /**
   * Get singleton instance of the connection pool
   */
  static getInstance(): CDPConnectionPool {
    if (!CDPConnectionPool.instance) {
      CDPConnectionPool.instance = new CDPConnectionPool()
    }
    return CDPConnectionPool.instance
  }

  /**
   * Get a connection from the pool or create a new one
   */
  async getConnection(port: number = 9222): Promise<Browser> {
    const key = `port-${port}`

    // Check for existing available connection
    const existing = this.connections.get(key)
    if (existing && !existing.inUse) {
      // Verify connection is still alive
      try {
        // Quick health check - get contexts
        existing.browser.contexts()
        existing.inUse = true
        existing.lastUsed = Date.now()
        return existing.browser
      } catch {
        // Connection is dead, remove it
        this.connections.delete(key)
      }
    }

    // If already in use or doesn't exist, try to create new connection
    if (this.connections.size >= this.maxConnections) {
      // Try to find and close least recently used connection
      const lru = this.findLeastRecentlyUsed()
      if (lru) {
        try {
          // Note: We can't actually close the browser (it's external)
          // but we can remove it from our pool
          this.connections.delete(lru)
        } catch {}
      } else {
        throw new Error(
          `Connection pool exhausted (max: ${this.maxConnections})`
        )
      }
    }

    // Create new connection
    try {
      // Add timeout to CDP connection to prevent hanging
      const connectionPromise = chromium.connectOverCDP(`http://localhost:${port}`)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('CDP connection timeout')), 5000)
      })

      const browser = await Promise.race([connectionPromise, timeoutPromise])

      // Set default timeout for all contexts
      browser.contexts().forEach(context => {
        context.setDefaultTimeout(5000)
      })

      const connection: PooledConnection = {
        browser,
        port,
        lastUsed: Date.now(),
        inUse: true,
      }

      this.connections.set(key, connection)
      return browser
    } catch (error: any) {
      throw new Error(
        `No browser running on port ${port}. Use "pw open" first`
      )
    }
  }

  /**
   * Release a connection back to the pool for reuse
   */
  release(port: number): void {
    const key = `port-${port}`
    const connection = this.connections.get(key)

    if (connection) {
      connection.inUse = false
      connection.lastUsed = Date.now()

      // Clean up any empty contexts we may have created
      try {
        for (const context of connection.browser.contexts()) {
          if (context.pages().length === 0) {
            context.close().catch(() => {})
          }
        }
      } catch {
        // Connection might be dead
        this.connections.delete(key)
      }
    }
  }

  /**
   * Execute an action with a pooled connection and automatically release it
   */
  async withConnection<T>(
    port: number,
    action: (browser: Browser) => Promise<T>
  ): Promise<T> {
    const browser = await this.getConnection(port)
    try {
      return await action(browser)
    } finally {
      this.release(port)
    }
  }

  /**
   * Find least recently used connection that's not in use
   */
  private findLeastRecentlyUsed(): string | null {
    let lruKey: string | null = null
    let lruTime = Date.now()

    for (const [key, conn] of this.connections) {
      if (!conn.inUse && conn.lastUsed < lruTime) {
        lruKey = key
        lruTime = conn.lastUsed
      }
    }

    return lruKey
  }

  /**
   * Start cleanup interval for stale connections
   */
  private startCleanupInterval(): void {
    if (this.cleanupInterval) return

    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections()
    }, 30000) // Check every 30 seconds

    // Unref so it doesn't keep the process alive
    this.cleanupInterval.unref()
  }

  /**
   * Remove connections that have been idle too long
   */
  private cleanupStaleConnections(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, conn] of this.connections) {
      if (!conn.inUse && now - conn.lastUsed > this.connectionTimeout) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.connections.delete(key)
    }
  }

  /**
   * Clear all connections (for testing)
   */
  clearAll(): void {
    this.connections.clear()
  }


  /**
   * Tab Pool Management Methods
   */

  /**
   * Get or create a managed tab for testing
   * This provides tab reuse and automatic cleanup
   */
  async getOrCreateManagedTab(options: {
    owner?: string
    url?: string
    persistent?: boolean
  } = {}): Promise<{ page: Page; tabId: string }> {
    // First, enforce total Chrome tab limit (not just managed tabs)
    const browser = await this.getConnection()
    const totalTabs = await this.countAllTabs(browser)

    if (totalTabs >= this.MAX_TABS) {
      // Force cleanup of oldest idle tabs to stay under limit
      await this.cleanupOldestIdleTabs()

      // If still at limit after cleanup, close oldest non-persistent tab
      const remainingTabs = await this.countAllTabs(browser)
      if (remainingTabs >= this.MAX_TABS) {
        await this.forceCloseOldestTab(browser)
      }
    }

    // Try to find an idle tab to reuse
    const idleTab = this.findIdleTab()
    if (idleTab) {
      // Reset and reuse the idle tab
      idleTab.inUse = true
      idleTab.lastAccessed = Date.now()
      idleTab.owner = options.owner

      if (options.url) {
        await idleTab.page.goto(options.url)
      } else {
        // Navigate to blank page to reset
        await idleTab.page.goto('about:blank')
      }

      // Tab reused successfully
      return { page: idleTab.page, tabId: idleTab.tabId }
    }

    // Create a new managed tab (reuse browser from above)
    const context = browser.contexts()[0] || await browser.newContext()
    const page = await context.newPage()

    if (options.url) {
      await page.goto(options.url)
    }

    // Get the tab ID
    const tabId = await this.getPageId(page)

    // Store in managed tabs
    const managedTab: ManagedTab = {
      tabId,
      page,
      url: options.url || 'about:blank',
      inUse: true,
      lastAccessed: Date.now(),
      createdAt: Date.now(),
      owner: options.owner,
      persistent: options.persistent,
    }

    this.managedTabs.set(tabId, managedTab)

    return { page, tabId }
  }

  /**
   * Release a managed tab back to the pool
   */
  async releaseManagedTab(tabId: string): Promise<void> {
    const tab = this.managedTabs.get(tabId)
    if (tab) {
      tab.inUse = false
      tab.lastAccessed = Date.now()
      tab.owner = undefined

      // Tab released successfully
    }
  }

  /**
   * Find an idle tab in the pool
   */
  private findIdleTab(): ManagedTab | null {
    for (const tab of this.managedTabs.values()) {
      if (!tab.inUse && !tab.persistent) {
        return tab
      }
    }
    return null
  }

  /**
   * Cleanup oldest idle tabs when at limit
   */
  private async cleanupOldestIdleTabs(): Promise<void> {
    const idleTabs: ManagedTab[] = []

    for (const tab of this.managedTabs.values()) {
      if (!tab.inUse && !tab.persistent) {
        idleTabs.push(tab)
      }
    }

    // Sort by last accessed time (oldest first)
    idleTabs.sort((a, b) => a.lastAccessed - b.lastAccessed)

    // Remove oldest 25% of idle tabs
    const toRemove = Math.max(1, Math.floor(idleTabs.length * 0.25))

    for (let i = 0; i < toRemove && i < idleTabs.length; i++) {
      const tab = idleTabs[i]
      try {
        await tab.page.close()
      } catch {
        // Page might already be closed
      }
      this.managedTabs.delete(tab.tabId)
      // Tab cleaned up
    }
  }

  /**
   * Start periodic cleanup of idle tabs
   */
  startTabCleanup(): void {
    if (this.tabCleanupInterval) return

    this.tabCleanupInterval = setInterval(async () => {
      const now = Date.now()
      const toCleanup: string[] = []

      for (const [id, tab] of this.managedTabs) {
        if (!tab.inUse &&
            !tab.persistent &&
            now - tab.lastAccessed > this.TAB_IDLE_TIMEOUT) {
          toCleanup.push(id)
        }
      }

      for (const id of toCleanup) {
        const tab = this.managedTabs.get(id)
        if (tab) {
          try {
            await tab.page.close()
          } catch {
            // Page might already be closed
          }
          this.managedTabs.delete(id)
          // Auto-cleaned idle tab
        }
      }
    }, 30000) // Run every 30 seconds

    // Unref so it doesn't keep the process alive
    this.tabCleanupInterval.unref()
  }

  /**
   * Cleanup all managed tabs
   */
  async cleanupAllManagedTabs(): Promise<void> {
    const toCleanup = Array.from(this.managedTabs.entries())

    for (const [id, tab] of toCleanup) {
      try {
        await tab.page.close()
      } catch {
        // Page might already be closed
      }
      this.managedTabs.delete(id)
    }
  }

  /**
   * Get the page ID from a page object
   */
  private async getPageId(page: Page): Promise<string> {
    try {
      const cdpSession = await (page.context() as any)._browser._connection._transport._ws
      const targetId = (page as any)._guid ||
                      (page as any)._targetId ||
                      cdpSession?.targetId ||
                      'unknown'
      return targetId
    } catch {
      // Fallback to generating a unique ID
      return `tab-${Date.now()}-${Math.random().toString(36).substring(7)}`
    }
  }

  /**
   * Count all tabs currently open in Chrome (not just managed tabs)
   */
  private async countAllTabs(browser: Browser): Promise<number> {
    let count = 0
    for (const context of browser.contexts()) {
      count += context.pages().length
    }
    return count
  }

  /**
   * Force close the oldest non-persistent tab when at tab limit
   */
  private async forceCloseOldestTab(browser: Browser): Promise<void> {
    // Find oldest managed tab that's not persistent
    const tabs = Array.from(this.managedTabs.values())
      .filter(tab => !tab.persistent)
      .sort((a, b) => a.createdAt - b.createdAt)

    if (tabs.length > 0) {
      const oldest = tabs[0]
      try {
        await oldest.page.close()
        this.managedTabs.delete(oldest.tabId)
      } catch {
        // Ignore errors when closing tab
      }
    }
  }

  /**
   * Get tab pool statistics
   */
  getManagedTabStats() {
    let inUse = 0
    let idle = 0

    for (const tab of this.managedTabs.values()) {
      if (tab.inUse) {
        inUse++
      } else {
        idle++
      }
    }

    return {
      total: this.managedTabs.size,
      inUse,
      idle,
      maxTabs: this.MAX_TABS,
      idleTimeout: this.TAB_IDLE_TIMEOUT,
    }
  }

  /**
   * Shutdown the connection pool
   * NOTE: Preserves singleton instance for reuse across CLI commands
   */
  async shutdown(): Promise<void> {
    // Stop cleanup intervals
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    if (this.tabCleanupInterval) {
      clearInterval(this.tabCleanupInterval)
      this.tabCleanupInterval = null
    }

    // Close all browser connections with timeout
    // Note: browser.close() disconnects from CDP but doesn't close external browser
    const closePromises: Promise<void>[] = []

    for (const [key, connection] of this.connections) {
      const closePromise = (async () => {
        try {
          // Force close with timeout - Playwright CDP connections can hang
          await Promise.race([
            connection.browser.close(),
            new Promise<void>((resolve) => {
              const timer = setTimeout(resolve, 1000)
              timer.unref() // Don't keep process alive
            })
          ])
        } catch {
          // Ignore errors during shutdown
        }
      })()
      closePromises.push(closePromise)
    }

    // Wait for all connections to close (with timeout)
    await Promise.race([
      Promise.all(closePromises),
      new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 1500)
        timer.unref() // Don't keep process alive
      })
    ])

    // Clear the connections map
    this.connections.clear()

    // Cleanup all managed tabs with timeout
    await Promise.race([
      this.cleanupAllManagedTabs(),
      new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 500)
        timer.unref() // Don't keep process alive
      })
    ])
  }

  /**
   * Force shutdown - completely destroys the instance (for testing)
   */
  async forceShutdown(): Promise<void> {
    this.shutdown()
    CDPConnectionPool.instance = null
  }
}