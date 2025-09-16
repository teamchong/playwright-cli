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
    // Build the CLI first
    console.log('📦 Building CLI...')
    execSync('pnpm build', { stdio: 'inherit' })

    // Launch browser session
    console.log('🌐 Starting browser session...')
    const { output, exitCode } = TabManager.runCommand(
      'node dist/index.js open',
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
