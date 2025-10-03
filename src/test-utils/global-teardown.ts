/**
 * Global Test Teardown
 *
 * Cleans up browser session and all tabs after tests complete
 */

import { TabManager } from './tab-manager'
import { TEST_PORT } from './test-constants'

export default function teardown() {
  console.log('🧹 Cleaning up after all tests...')

  try {
    // Clean up all test-related tabs (created during tests + accumulated test tabs)
    console.log('🗂️  Closing created test tabs...')
    TabManager.cleanupAllCreatedTabs()

    console.log('🧹 Cleaning up accumulated test tabs...')
    TabManager.cleanupTestTabs()

    // Skip browser close in CI (Playwright handles it)
    if (process.env.CI) {
      console.log('ℹ️  Running in CI - Playwright handles browser cleanup')
      console.log('✅ Cleanup complete')
      return
    }

    // Close the anchor tab (this will exit Chrome since it's the last tab)
    const anchorTabId = process.env.ANCHOR_TAB_ID
    if (anchorTabId) {
      console.log(`📌 Closing anchor tab: ${anchorTabId}`)
      try {
        TabManager.runCommand(
          `node dist/src/index.js tabs close --tab-id ${anchorTabId} --port ${TEST_PORT}`,
          3000
        )
      } catch (error) {
        console.log('ℹ️  Anchor tab already closed or browser exited')
      }
    }

    // Try to close browser explicitly (may already be closed from anchor tab)
    console.log('🌐 Closing browser session...')
    try {
      TabManager.runCommand(`node dist/src/index.js close --port ${TEST_PORT}`, 3000)
    } catch (error) {
      // Browser might already be closed, which is fine
      console.log('ℹ️  Browser was already closed')
    }

    console.log('✅ Cleanup complete')
  } catch (error) {
    console.error('❌ Global teardown error:', error)
    // Don't throw - we want tests to complete even if cleanup fails
  }
}
