/**
 * Test Helper Utilities
 *
 * Common utilities for test files to ensure proper cleanup
 */

import { execSync } from 'child_process'
import { TabManager } from './tab-manager'
import { CDPConnectionPool } from '../lib/cdp-connection-pool'
import { TEST_PORT, CLI } from './test-constants'

/**
 * Create a test tab and register it for cleanup
 * Use this instead of direct CLI calls to ensure cleanup
 */
export function createTestTab(html: string): string {
  const output = execSync(
    `${CLI} tabs new --url "data:text/html,${encodeURIComponent(html)}" --port ${TEST_PORT}`,
    {
      encoding: 'utf8',
      timeout: 5000,
    }
  )

  // Extract and register the tab ID for cleanup
  const tabId = TabManager.extractAndRegisterTabId(output)
  return tabId
}

/**
 * Close a test tab safely
 */
export function closeTestTab(tabId: string): void {
  if (!tabId) return

  try {
    execSync(`${CLI} tabs close --tab-id ${tabId} --port ${TEST_PORT}`, {
      encoding: 'utf8',
      timeout: 3000,
    })
    // Remove from tracking since we closed it
    TabManager.unregisterTab(tabId)
  } catch (error) {
    // Tab might already be closed
  }
}

/**
 * Extract tab ID from CLI output and register it for cleanup
 * Use this instead of local extractTabId functions
 */
export function extractAndRegisterTabId(output: string): string {
  return TabManager.extractAndRegisterTabId(output)
}

/**
 * Run command helper with timeout
 */
export function runCommand(
  cmd: string,
  timeout = 5000
): { output: string; exitCode: number } {
  return TabManager.runCommand(cmd, timeout)
}

/**
 * Clean up all test tabs
 * Call this in afterAll() to ensure cleanup
 */
export function cleanupAllTestTabs(): void {
  TabManager.cleanupAllCreatedTabs()
}

/**
 * Enforce tab limit to prevent browser crashes
 * Call this in afterAll() of test suites that create many tabs
 */
export function enforceTabLimit(): void {
  TabManager.enforceTabLimit()
}

/**
 * Get a unique port for testing
 * Uses a base port + random offset to avoid conflicts
 */
export function getUniqueTestPort(): number {
  // Use base port 18000 + random offset up to 1000
  const basePort = 18000
  const offset = Math.floor(Math.random() * 1000)
  return basePort + offset
}

/**
 * Create a managed test tab using the tab pool
 * This provides automatic cleanup and tab reuse
 */
export async function createManagedTestTab(options: {
  html?: string
  url?: string
  testName?: string
}): Promise<{ tabId: string; cleanup: () => Promise<void> }> {
  const pool = CDPConnectionPool.getInstance()

  // Create the URL if HTML is provided
  let url = options.url
  if (options.html && !url) {
    url = `data:text/html,${encodeURIComponent(options.html)}`
  }

  // Get or create a managed tab
  const { page, tabId } = await pool.getOrCreateManagedTab({
    owner: options.testName || 'test',
    url: url || 'about:blank'
  })

  // Return tab info with cleanup function
  return {
    tabId,
    cleanup: async () => {
      await pool.releaseManagedTab(tabId)
    }
  }
}

/**
 * Clean up all managed test tabs
 * Call this in afterAll hooks
 */
export async function cleanupAllManagedTabs(): Promise<void> {
  const pool = CDPConnectionPool.getInstance()
  await pool.cleanupAllManagedTabs()
}

/**
 * Get tab pool statistics
 */
export function getTabPoolStats() {
  const pool = CDPConnectionPool.getInstance()
  return pool.getManagedTabStats()
}
