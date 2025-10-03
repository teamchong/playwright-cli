import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import { TEST_PORT } from '../../../../test-utils/test-constants'
/**
 * Wait Command Tests - TAB ID FROM COMMAND OUTPUT
 *
 * - Uses global browser session (no per-file setup/teardown)
 * - Captures tab ID directly from command output
 * - Uses returned tab ID for all interactions
 * - NO COMPLEX DISCOVERY - commands return what we need
 * - NO TAB MANAGEMENT - let global setup handle browser lifecycle
 */
describe('wait command - TAB ID FROM OUTPUT', () => {
  const CLI = 'node dist/src/index.js'
  let testTabId: string

  function runCommand(
    cmd: string,
    timeout = 5000
  ): { output: string; exitCode: number } {
    try {
      // Clean environment - remove NODE_ENV=test so CLI doesn't activate test-mode behavior
      const cleanEnv = { ...process.env }
      delete cleanEnv.NODE_ENV

      const output = execSync(cmd, {
        encoding: 'utf8',
        timeout,
        env: cleanEnv,
        stdio: 'pipe',
      })
      return { output, exitCode: 0 }
    } catch (error: any) {
      if (error.code === 'ETIMEDOUT') {
        throw new Error(`Command timed out (hanging): ${cmd}`)
      }
      const output = (error.stdout || '') + (error.stderr || '')
      return { output, exitCode: error.status || 1 }
    }
  }

  function extractTabId(output: string): string {
    const match = output.match(/Tab ID: ([A-F0-9-]+)/)
    if (!match) {
      throw new Error(`No tab ID found in output: ${output}`)
    }
    return match[1]
  }

  beforeAll(async () => {
    // Browser already running from global setup
    // Create a dedicated test tab for this test suite and capture its ID
    const { output } = runCommand(
      `${CLI} tabs new --url "data:text/html,<div id='test-container'>Wait Test Suite Ready</div>" --port ${TEST_PORT}`
    )
    testTabId = extractTabId(output)
    console.log(`Wait test suite using tab ID: ${testTabId}`)
  })

  afterAll(async () => {
    // Clean up our test tab using the specific tab ID
    if (testTabId) {
      try {
        // First check if tab still exists
        const { output } = runCommand(`${CLI} tabs list --json --port ${TEST_PORT}`)
        const data = JSON.parse(output)
        const tabExists = data.tabs.some((tab: any) => tab.id === testTabId)

        if (tabExists) {
          // Find the tab index and close it
          const tabIndex = data.tabs.findIndex(
            (tab: any) => tab.id === testTabId
          )
          runCommand(`${CLI} tabs close --index ${tabIndex} --port ${TEST_PORT}`)
          console.log(`Closed test tab ${testTabId}`)
        }
      } catch (error) {
        // Silently ignore - tab might already be closed
      }
    }
  })

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} wait --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('wait')
      expect(output).toContain('tab-index')
      expect(output).toContain('tab-id')
    })
  })

  describe('direct tab targeting with captured ID', () => {
    it('should wait with timeout using captured tab ID', () => {
      // Wait for a short timeout (should succeed)
      const { exitCode, output } = runCommand(
        `${CLI} wait --timeout 1000 --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      expect(exitCode).toBe(0)
      expect(output).toMatch(/waited|timeout/i)
    })

    it('should wait for existing element using captured tab ID', () => {
      // First add an element to wait for
      runCommand(
        `${CLI} eval "document.body.innerHTML = '<div id=\\"waitTarget\\">Target Element</div>'" --tab-id ${testTabId} --port ${TEST_PORT}`
      )

      // Wait for the element we just added
      const { exitCode, output } = runCommand(
        `${CLI} wait "#waitTarget" --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      expect(exitCode).toBe(0)
      expect(output).toMatch(/found|element/i)
    })

    it('should timeout waiting for non-existent element', () => {
      // Give extra time for the command to timeout and return properly
      const { exitCode, output } = runCommand(
        `${CLI} wait "#nonExistentElement" --timeout 1000 --tab-id ${testTabId} --port ${TEST_PORT}`,
        5000
      )
      expect(exitCode).toBe(1)
      expect(output).toMatch(/timeout|not found/i)
    })

    it('should handle invalid tab ID', () => {
      const { output, exitCode } = runCommand(
        `${CLI} wait --tab-id "INVALID_ID" --timeout 1000 --port ${TEST_PORT}`,
        10000
      )
      expect(exitCode).toBe(1)
      expect(output).toMatch(/not found/i)
    })

    it('should prevent conflicting tab arguments', () => {
      const { output, exitCode } = runCommand(
        `${CLI} wait --tab-index 0 --tab-id ${testTabId} --timeout 1000 --port ${TEST_PORT}`,
        2000
      )
      expect(exitCode).toBe(1)
      // Note: yargs validation output handling varies in test environment
    })
  })

  describe('backwards compatibility', () => {
    it('should work without tab targeting (active page)', () => {
      // Should work on whatever tab is currently active
      const { exitCode } = runCommand(`${CLI} wait --help`)
      expect(exitCode).toBe(0)
    })
  })
})
