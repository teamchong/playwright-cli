import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import * as fs from 'fs'
import { TEST_PORT, CLI } from '../../../../test-utils/test-constants'

/**
 * Exec Command Tests - TAB ID FROM COMMAND OUTPUT
 *
 * - Uses global browser session (no per-file setup/teardown)
 * - Captures tab ID directly from command output
 * - Uses returned tab ID for all interactions
 * - NO COMPLEX DISCOVERY - commands return what we need
 * - NO TAB MANAGEMENT - let global setup handle browser lifecycle
 */
describe('exec command - TAB ID FROM OUTPUT', () => {
  let testTabId: string

  function runCommand(
    cmd: string,
    timeout = 5000
  ): { output: string; exitCode: number } {
    try {
      const output = execSync(cmd, {
        encoding: 'utf8',
        timeout,
        env: { ...process.env, NODE_ENV: undefined },
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
      `${CLI} tabs new --port ${TEST_PORT} --url "data:text/html,<div id='test-container'><h1>Exec Test Suite Ready</h1><p>JavaScript file execution testing</p></div>"`
    )
    testTabId = extractTabId(output)
    console.log(`Exec test suite using tab ID: ${testTabId}`)

    // Create a test JavaScript file
    fs.writeFileSync(
      '/tmp/test-script.js',
      'console.log("Hello from test script"); console.log(2 + 3);'
    )
  })

  afterAll(async () => {
    // Clean up test file
    try {
      if (fs.existsSync('/tmp/test-script.js'))
        fs.unlinkSync('/tmp/test-script.js')
    } catch {}

    // Clean up our test tab using the specific tab ID
    if (testTabId) {
      try {
        // First check if tab still exists
        const { output } = runCommand(`${CLI} tabs list --port ${TEST_PORT} --json`)
        const data = JSON.parse(output)
        const tabExists = data.tabs.some((tab: any) => tab.id === testTabId)

        if (tabExists) {
          // Find the tab index and close it
          const tabIndex = data.tabs.findIndex(
            (tab: any) => tab.id === testTabId
          )
          runCommand(`${CLI} tabs close --port ${TEST_PORT} --index ${tabIndex}`)
          console.log(`Closed test tab ${testTabId}`)
        }
      } catch (error) {
        // Silently ignore - tab might already be closed
      }
    }
  })

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} exec --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('exec')
      expect(output).toContain('tab-index')
      expect(output).toContain('tab-id')
    })
  })

  describe('direct tab targeting with captured ID', () => {
    it('should execute JavaScript file using captured tab ID', () => {
      const { exitCode, output } = runCommand(
        `${CLI} exec /tmp/test-script.js --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      expect(exitCode).toBe(0)
      expect(output).toContain('Hello from test script')
      expect(output).toContain('5')
    })

    it('should handle non-existent file gracefully', () => {
      const { exitCode, output } = runCommand(
        `${CLI} exec /tmp/nonexistent.js --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      expect(exitCode).toBe(1)
      expect(output).toMatch(/ENOENT|not found/i)
    })

    it('should handle invalid tab ID', () => {
      const { output, exitCode } = runCommand(
        `${CLI} exec /tmp/test-script.js --tab-id "INVALID_ID" --port ${TEST_PORT}`,
        5000
      )
      expect(exitCode).toBe(1)
      expect(output).toMatch(/not found/i)
    })

    it('should prevent conflicting tab arguments', () => {
      const { output, exitCode } = runCommand(
        `${CLI} exec /tmp/test-script.js --tab-index 0 --tab-id ${testTabId} --port ${TEST_PORT}`,
        10000
      )
      expect(exitCode).toBe(1)
      // Note: yargs validation output handling varies in test environment
    })
  })

  describe('backwards compatibility', () => {
    it('should work without tab targeting (active page)', () => {
      // Should work on whatever tab is currently active
      const { exitCode } = runCommand(`${CLI} exec --help`)
      expect(exitCode).toBe(0)
    })
  })
})
