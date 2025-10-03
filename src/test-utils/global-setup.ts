/**
 * Global Test Setup
 *
 * Sets up browser session for all tests with proper tab management
 */

import { execSync } from 'child_process'
import { TabManager } from './tab-manager'
import { TEST_PORT } from './test-constants'

export default async function setup() {
  console.log('🚀 Setting up browser for all tests...')

  try {
    // Build TypeScript first (skip in CI where build is a separate step)
    if (!process.env.CI) {
      console.log('📦 Building TypeScript...')
      execSync('pnpm run build:ts', { stdio: 'inherit' })
    }

    // In CI, use Playwright's browser which is already available
    if (process.env.CI) {
      console.log('ℹ️  Running in CI - using Playwright browser')
      // Clear any existing tab tracking
      TabManager.clearTracking()
      return
    }

    // Launch browser session for local development
    console.log('🌐 Starting browser session in headless mode...')

    // Set environment variable for headless mode
    process.env.PLAYWRIGHT_CLI_HEADLESS = 'true'

    // USE A DIFFERENT PORT FOR TESTS TO AVOID CONFLICTS WITH USER'S BROWSER
    const { output, exitCode } = TabManager.runCommand(
      `PLAYWRIGHT_CLI_HEADLESS=true node dist/src/index.js open --port ${TEST_PORT}`,
      10000
    )

    if (exitCode !== 0) {
      throw new Error(`Failed to start browser: ${output}`)
    }

    console.log('✅ Browser session ready')

    // Clean up any accumulated test tabs from previous runs
    console.log('🧹 Cleaning up any leftover test tabs...')
    TabManager.cleanupTestTabs()

    // Clear any existing tab tracking
    TabManager.clearTracking()

    // IMPORTANT: Create a persistent anchor tab to keep browser alive
    // Without this, closing the last test tab will exit Chrome
    console.log('📌 Creating persistent anchor tab to keep browser alive...')
    const { output: anchorOutput } = TabManager.runCommand(
      `node dist/src/index.js tabs new --port ${TEST_PORT} --url "about:blank"`,
      10000
    )
    const anchorMatch = anchorOutput.match(/Tab ID: ([A-F0-9]+)/)
    if (anchorMatch) {
      const anchorTabId = anchorMatch[1]
      console.log(`📌 Anchor tab created: ${anchorTabId}`)
      // Mark as persistent so tests don't accidentally close it
      process.env.ANCHOR_TAB_ID = anchorTabId
    }
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  }
}
