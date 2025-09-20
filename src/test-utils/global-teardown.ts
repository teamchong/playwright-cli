/**
 * Global Test Teardown
 *
 * Cleans up browser session and all tabs after tests complete
 */

import { TabManager } from './tab-manager'

export default function teardown() {
  console.log('🧹 Cleaning up after all tests...')

  try {
    // Clean up ONLY tabs created during tests
    console.log('🗂️  Closing test tabs...')
    TabManager.cleanupAllCreatedTabs()

    // Skip browser close in CI (Playwright handles it)
    if (process.env.CI) {
      console.log('ℹ️  Running in CI - Playwright handles browser cleanup')
      console.log('✅ Cleanup complete')
      return
    }

    // Close browser if it's still running (local only)
    console.log('🌐 Closing browser session...')
    try {
      TabManager.runCommand('node dist/src/index.js close', 5000)
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
