/**
 * Browser Tab Registry
 *
 * Maintains a persistent tab registry inside the browser using a dedicated page.
 * The browser tracks all tabs via CDP and provides instant lookups.
 */

import { Browser, Page, BrowserContext } from 'playwright'
import { BrowserHelper } from './browser-helper'
import { withTimeout } from './timeout-utils'

interface TabInfo {
  id: string
  url: string
  title: string
  contextId: string
  pageIndex: number
}

export class BrowserTabRegistry {
  private static readonly REGISTRY_URL = 'data:text/html,<title>Tab Registry</title><body>Tab Registry Active</body>'
  private static registryPage: Page | null = null
  private static lastRebuildTime = 0
  private static readonly REBUILD_THROTTLE_MS = 100 // Only rebuild every 100ms max

  /**
   * Initialize or get the registry page
   * This page lives in the browser and maintains the tab index
   */
  static async getRegistryPage(browser: Browser): Promise<Page> {
    // Check if registry page already exists
    for (const context of browser.contexts()) {
      for (const page of context.pages()) {
        try {
          // Wrap page.title() with timeout to prevent indefinite hangs on unresponsive tabs
          // Short timeout (100ms) since we may need to check many tabs
          const title = await withTimeout(
            page.title(),
            100,
            'Page title retrieval in getRegistryPage'
          )
          if (title === 'Tab Registry') {
            this.registryPage = page

          // Throttled rebuild: only rebuild if enough time has passed
          // CDP events are async and may not have completed between CLI invocations
          const now = Date.now()
          const shouldRebuild = now - this.lastRebuildTime > this.REBUILD_THROTTLE_MS

          if (shouldRebuild) {
            await page.evaluate(() => {
              ;(globalThis as any).__tabRegistry = new Map()
            })

            // Use a temporary CDP client for rebuilding
            const tempCdpClient = await browser.newBrowserCDPSession()
            try {
              await tempCdpClient.send('Target.setDiscoverTargets', { discover: true })
              const { targetInfos } = await tempCdpClient.send('Target.getTargets')

              await page.evaluate((targets) => {
                const registry = (globalThis as any).__tabRegistry
                for (const target of targets) {
                  if (target.type === 'page') {
                    registry.set(target.targetId, {
                      id: target.targetId,
                      url: target.url,
                      title: target.title || '',
                      browserContextId: target.browserContextId
                    })
                  }
                }
              }, targetInfos)
            } finally {
              await tempCdpClient.detach()
            }

            this.lastRebuildTime = now
          }

          // Check if monitoring is already set up
          const isMonitoring = await page.evaluate(() => {
            return (globalThis as any).__registryMonitoring === true
          })

          if (!isMonitoring) {
            await page.evaluate(() => {
              ;(globalThis as any).__registryMonitoring = true
            })

            // Create persistent CDP client for monitoring
            const cdpClient = await browser.newBrowserCDPSession()
            await cdpClient.send('Target.setDiscoverTargets', { discover: true })

            // Set up monitoring with error handling
            cdpClient.on('Target.targetCreated', async (event) => {
              if (event.targetInfo.type === 'page') {
                try {
                  await page.evaluate((info) => {
                    (globalThis as any).__tabRegistry.set(info.targetId, {
                      id: info.targetId,
                      url: info.url,
                      title: info.title || '',
                      browserContextId: info.browserContextId
                    })
                  }, event.targetInfo)
                } catch (error) {
                  // Ignore errors if registry page is closed or unavailable
                }
              }
            })

            cdpClient.on('Target.targetDestroyed', async (event) => {
              try {
                await page.evaluate((targetId) => {
                  (globalThis as any).__tabRegistry.delete(targetId)
                }, event.targetId)
              } catch (error) {
                // Ignore errors if registry page is closed or unavailable
              }
            })

            cdpClient.on('Target.targetInfoChanged', async (event) => {
              if (event.targetInfo.type === 'page') {
                try {
                  await page.evaluate((info) => {
                    const existing = (globalThis as any).__tabRegistry.get(info.targetId)
                    if (existing) {
                      (globalThis as any).__tabRegistry.set(info.targetId, {
                        ...existing,
                        url: info.url,
                        title: info.title || existing.title
                      })
                    }
                  }, event.targetInfo)
                } catch (error) {
                  // Ignore errors if registry page is closed or unavailable
                }
              }
            })
          }

          return page
          }
        } catch (error) {
          // Ignore timeout or errors for individual pages and continue checking others
          // This prevents one unresponsive tab from hanging the entire registry lookup
          continue
        }
      }
    }

    // Create registry page
    const context = browser.contexts()[0] || await browser.newContext()
    const page = await context.newPage()
    await page.goto(this.REGISTRY_URL)

    // Initialize the registry map
    await page.evaluate(() => {
      (globalThis as any).__tabRegistry = new Map()
    })

    // Get browser-level CDP client to monitor ALL targets across contexts
    const cdpClient = await browser.newBrowserCDPSession()

    // Enable Target discovery at browser level
    await cdpClient.send('Target.setDiscoverTargets', { discover: true })

    // Build initial registry from existing targets
    const { targetInfos } = await cdpClient.send('Target.getTargets')

    await page.evaluate((targets) => {
      const registry = (globalThis as any).__tabRegistry
      console.log('Initializing registry with targets:', targets.length)

      for (const target of targets) {
        if (target.type === 'page') {
          registry.set(target.targetId, {
            id: target.targetId,
            url: target.url,
            title: target.title || '',
            browserContextId: target.browserContextId
          })
          console.log(`Added tab ${target.targetId} - ${target.url}`)
        }
      }

      console.log(`Registry initialized with ${registry.size} tabs`)
    }, targetInfos)

    // Set up live CDP monitoring at browser level with error handling
    cdpClient.on('Target.targetCreated', async (event) => {
      if (event.targetInfo.type === 'page') {
        try {
          await page.evaluate((info) => {
            (globalThis as any).__tabRegistry.set(info.targetId, {
              id: info.targetId,
              url: info.url,
              title: info.title || '',
              browserContextId: info.browserContextId
            })
          }, event.targetInfo)
        } catch (error) {
          // Ignore errors if registry page is closed or unavailable
        }
      }
    })

    cdpClient.on('Target.targetDestroyed', async (event) => {
      try {
        await page.evaluate((targetId) => {
          (globalThis as any).__tabRegistry.delete(targetId)
        }, event.targetId)
      } catch (error) {
        // Ignore errors if registry page is closed or unavailable
      }
    })

    cdpClient.on('Target.targetInfoChanged', async (event) => {
      if (event.targetInfo.type === 'page') {
        try {
          await page.evaluate((info) => {
            const existing = (globalThis as any).__tabRegistry.get(info.targetId)
            if (existing) {
              (globalThis as any).__tabRegistry.set(info.targetId, {
                ...existing,
                url: info.url,
                title: info.title || existing.title
              })
            }
          }, event.targetInfo)
        } catch (error) {
          // Ignore errors if registry page is closed or unavailable
        }
      }
    })

    // Mark monitoring as active in browser
    await page.evaluate(() => {
      ;(globalThis as any).__registryMonitoring = true
    })

    this.registryPage = page
    return page
  }

  /**
   * Find page by ID using browser's registry (O(1))
   */
  static async findPageById(browser: Browser, tabId: string): Promise<Page | null> {
    const registry = await this.getRegistryPage(browser)

    // Query the browser's registry
    const tabInfo = await registry.evaluate((id) => {
      const registry = (globalThis as any).__tabRegistry
      console.log(`Looking for tab ${id} in registry with ${registry.size} entries`)
      const info = registry.get(id)
      if (info) {
        console.log(`Found tab info:`, info)
      } else {
        console.log(`Tab ${id} not found in registry`)
        console.log(`Registry has tabs:`, Array.from(registry.keys()))
      }
      return info
    }, tabId) as TabInfo | undefined

    if (!tabInfo) {
      console.log(`Tab ${tabId} not found in registry`)
      return null
    }

    // Find the actual page object by context and URL
    for (const context of browser.contexts()) {
      // Match by context ID if available
      const contextId = (context as any)._guid || (context as any)._browserContext?.guid

      for (const page of context.pages()) {
        // Fast match by URL first
        if (page.url() === tabInfo.url) {
          // Verify with single CDP call
          const actualId = await BrowserHelper.getPageId(page).catch(() => null)
          if (actualId === tabId) {
            return page
          }
        }
      }
    }

    // Fallback: URL might have changed, search by CDP
    for (const context of browser.contexts()) {
      for (const page of context.pages()) {
        const actualId = await BrowserHelper.getPageId(page).catch(() => null)
        if (actualId === tabId) {
          // Update registry with new URL
          await registry.evaluate((args: { id: string; url: string }) => {
            const entry = (globalThis as any).__tabRegistry.get(args.id)
            if (entry) {
              entry.url = args.url
            }
          }, { id: tabId, url: page.url() })
          return page
        }
      }
    }

    return null
  }

  /**
   * Get registry statistics
   */
  static async getStats(browser: Browser): Promise<{
    tabCount: number
    tabs: string[]
  }> {
    const registry = await this.getRegistryPage(browser)

    return registry.evaluate(() => {
      const entries = Array.from((globalThis as any).__tabRegistry.entries())
      return {
        tabCount: entries.length,
        tabs: entries.map((entry: any) => entry[0])
      }
    })
  }

  /**
   * Clear and rebuild registry
   */
  static async rebuild(browser: Browser): Promise<void> {
    const registry = await this.getRegistryPage(browser)

    await registry.evaluate(() => {
      (globalThis as any).__tabRegistry.clear()
    })

    // Rebuild from browser-level CDP
    const cdpClient = await browser.newBrowserCDPSession()
    const { targetInfos } = await cdpClient.send('Target.getTargets')

    await registry.evaluate((targets) => {
      for (const target of targets) {
        if (target.type === 'page') {
          (globalThis as any).__tabRegistry.set(target.targetId, {
            id: target.targetId,
            url: target.url,
            title: target.title || '',
            browserContextId: target.browserContextId
          })
        }
      }
    }, targetInfos)

    await cdpClient.detach()
  }
}

// Add TypeScript declarations for the browser context
declare global {
  interface Window {
    __tabRegistry: Map<string, TabInfo>
  }
}