/**
 * Global Test Setup
 *
 * Sets up browser session for all tests with proper tab management
 */

import { execSync } from 'child_process'
import { TabManager } from './tab-manager'

export default function setup() {
  console.log('🚀 Setting up browser for all tests...')

  try {
    // Build TypeScript first (skip in CI where build is a separate step)
    if (!process.env.CI) {
      console.log('📦 Building TypeScript...')
      execSync('pnpm run build:ts', { stdio: 'inherit' })
    }

    // Launch browser session
    console.log('🌐 Starting browser session...')
    const { output, exitCode } = TabManager.runCommand(
      'node dist/src/index.js open',
      10000
    )

    if (exitCode !== 0) {
      throw new Error(`Failed to start browser: ${output}`)
    }

    console.log('✅ Browser session ready')

    // Clear any existing tab tracking
    TabManager.clearTracking()
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  }
}
