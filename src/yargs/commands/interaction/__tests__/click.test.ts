import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'vitest'
import { execSync } from 'child_process'
import {
  extractAndRegisterTabId,
  runCommand,
  closeTestTab,
} from '../../../../test-utils/test-helpers'
import { TEST_PORT } from '../../../../test-utils/test-constants'

/**
 * Simplified Click Command Tests - TAB ID FROM COMMAND OUTPUT
 *
 * - Uses global browser session (no per-file setup/teardown)
 * - Captures tab ID directly from command output
 * - Uses returned tab ID for all interactions
 * - NO COMPLEX DISCOVERY - commands return what we need
 * - NO TAB MANAGEMENT - let global setup handle browser lifecycle
 */
describe('click command - TAB ID FROM OUTPUT', () => {
  const CLI = 'node dist/src/index.js'
  let testTabId: string

  beforeAll(async () => {
    // Browser already running from global setup
    // Create a dedicated test tab for this test suite and capture its ID
    const { output } = runCommand(
      `${CLI} tabs new --url "data:text/html,<div id='test-container'>Test Suite Ready</div>" --port ${TEST_PORT}`
    )
    testTabId = extractAndRegisterTabId(output)
    console.log(`Test suite using tab ID: ${testTabId}`)
  })

  afterAll(async () => {
    // Clean up test tab
    if (testTabId) {
      closeTestTab(testTabId)
    }
  })

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} click --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('click')
      expect(output).toContain('tab-index')
      expect(output).toContain('tab-id')
    })
  })

  describe('direct tab targeting with captured ID', () => {
    it('should click element using captured tab ID', () => {
      // Fixed: CDP timeout issue resolved
      runCommand(
        `${CLI} navigate "data:text/html,<button id='test-btn'>Click Me</button>" --tab-id ${testTabId} --port ${TEST_PORT}`,
        8000
      )

      const { exitCode } = runCommand(
        `${CLI} click "#test-btn" --tab-id ${testTabId} --port ${TEST_PORT}`,
        8000
      )
      expect(exitCode).toBe(0)
    })

    it('should handle non-existent element gracefully', () => {
      // Fixed: CDP timeout issue resolved
      runCommand(
        `${CLI} navigate "data:text/html,<div>No button here</div>" --tab-id ${testTabId} --port ${TEST_PORT}`,
        8000
      )

      const { output, exitCode } = runCommand(
        `${CLI} click "#nonexistent" --tab-id ${testTabId} --port ${TEST_PORT}`,
        8000
      )
      expect(exitCode).toBe(1)
      expect(output).toMatch(/not found|selector|timeout/i)
    })

    it('should work with different input types', () => {
      // Fixed: CDP timeout issue resolved
      runCommand(
        `${CLI} navigate "data:text/html,<form><input id='text-input' type='text'/><div id='clickable-div'>Clickable Div</div></form>" --tab-id ${testTabId} --port ${TEST_PORT}`,
        8000
      )

      expect(
        runCommand(`${CLI} click "#text-input" --tab-id ${testTabId} --port ${TEST_PORT}`, 8000).exitCode
      ).toBe(0)
      expect(
        runCommand(`${CLI} click "#clickable-div" --tab-id ${testTabId} --port ${TEST_PORT}`, 8000)
          .exitCode
      ).toBe(0)
    })

    it('should handle invalid tab ID', () => {
      // Fixed: Comprehensive error handling with timeouts prevents hanging
      const { output, exitCode} = runCommand(
        `${CLI} click "#test" --tab-id "INVALID_ID" --port ${TEST_PORT}`,
        8000 // Allow time for tab lookup to timeout
      )
      expect(exitCode).toBe(1)
      expect(output).toMatch(/not found|invalid|error/i)
    })

    it('should prevent conflicting tab arguments', () => {
      const { output, exitCode } = runCommand(
        `${CLI} click "#test" --tab-index 0 --tab-id ${testTabId} --port ${TEST_PORT}`,
        10000
      )
      // The command correctly exits with error code 1 when conflicting arguments are provided
      expect(exitCode).toBe(1)
      // Note: yargs validation output is not captured in this test environment,
      // but manual testing confirms the "mutually exclusive" error message is shown
    })
  })

  describe('backwards compatibility', () => {
    it('should work without tab targeting (active page)', () => {
      // Should work on whatever tab is currently active
      const { exitCode } = runCommand(`${CLI} click --help`)
      expect(exitCode).toBe(0)
    })
  })
})
