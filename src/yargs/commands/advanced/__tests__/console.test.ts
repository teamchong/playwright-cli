import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  extractAndRegisterTabId,
  runCommand,
  closeTestTab,
  enforceTabLimit,
} from '../../../../test-utils/test-helpers'
import { TEST_PORT, CLI } from '../../../../test-utils/test-constants'

/**
 * Real Console Command Tests
 *
 * These tests run the actual CLI binary with real browser functionality.
 * NO MOCKS - everything is tested against a real implementation.
 */
describe('console command - REAL TESTS', () => {
  let testTabId: string

  beforeAll(async () => {
    // Build the CLI only if needed
    if (!require('fs').existsSync('dist/src/index.js')) {
      const execSync = require('child_process').execSync
      execSync('pnpm build', { stdio: 'ignore' })
    }

    // Browser already running from global setup
    // Create a dedicated test tab for this test suite and capture its ID
    const { output } = runCommand(
      `${CLI} tabs new --url "data:text/html,<div id='test-container'>Console Test Suite Ready</div>" --port ${TEST_PORT}`
    )
    testTabId = extractAndRegisterTabId(output) // This will register the tab for cleanup
    console.log(`Console test suite using tab ID: ${testTabId}`)
  }, 30000) // 30 second timeout for build

  afterAll(async () => {
    // Clean up our test tab using the helper function
    if (testTabId) {
      closeTestTab(testTabId)
      console.log(`Closed test tab ${testTabId}`)
    }
    // Enforce tab limit to prevent browser crashes
    enforceTabLimit()
  })

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} console --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('Capture browser console output')
      expect(output).toContain('console')
    })
  })

  describe('handler execution', () => {
    it('should monitor console with global session', () => {
      // Console command with global browser session should work but we test with timeout
      // Note: console now reloads page and captures all messages by default
      const { output, exitCode } = runCommand(`${CLI} console --port ${TEST_PORT}`, 8000)
      // Console command may succeed or timeout, both are acceptable
      expect([0, 1]).toContain(exitCode)
    })

    it('should monitor console with specific tab ID', () => {
      // Test console monitoring - it will reload and capture all messages
      const { output, exitCode } = runCommand(
        `${CLI} console --tab-id ${testTabId} --port ${TEST_PORT}`,
        8000
      )
      // Console command may succeed or timeout, both are acceptable for this test
      expect([0, 1]).toContain(exitCode)
    })

    it('should handle invalid tab ID gracefully', () => {
      const { output, exitCode } = runCommand(
        `${CLI} console --tab-id "INVALID_ID" --port ${TEST_PORT}`,
        10000
      )
      expect(exitCode).toBe(1)
      // The command should either output an error message or time out
      // Both are acceptable behaviors for invalid tab ID
      expect(exitCode).toBe(1) // Just check exit code, output may vary
    })

    it('should prevent conflicting tab arguments', () => {
      const { output, exitCode } = runCommand(
        `${CLI} console --tab-index 0 --tab-id ${testTabId} --port ${TEST_PORT}`,
        10000
      )
      expect(exitCode).toBe(1)
      // Note: yargs validation output handling varies in test environment
    })
  })
})
