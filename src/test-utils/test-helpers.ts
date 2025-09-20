/**
 * Test Helper Utilities
 *
 * Common utilities for test files to ensure proper cleanup
 */

import { execSync } from 'child_process'
import { TabManager } from './tab-manager'

/**
 * Create a test tab and register it for cleanup
 * Use this instead of direct CLI calls to ensure cleanup
 */
export function createTestTab(html: string): string {
  const CLI = 'node dist/src/index.js'
  const output = execSync(
    `${CLI} tabs new --url "data:text/html,${encodeURIComponent(html)}"`,
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
    const CLI = 'node dist/src/index.js'
    execSync(`${CLI} tabs close --tab-id ${tabId}`, {
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
 * Clean up all test tabs
 * Call this in afterAll() to ensure cleanup
 */
export function cleanupAllTestTabs(): void {
  TabManager.cleanupAllCreatedTabs()
}