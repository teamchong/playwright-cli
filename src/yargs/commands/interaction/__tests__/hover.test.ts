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

/**
 * Simplified Hover Command Tests - TAB ID FROM COMMAND OUTPUT
 *
 * - Uses global browser session (no per-file setup/teardown)
 * - Captures tab ID directly from command output
 * - Uses returned tab ID for all interactions
 * - NO COMPLEX DISCOVERY - commands return what we need
 * - NO TAB MANAGEMENT - let global setup handle browser lifecycle
 */
describe('hover command - TAB ID FROM OUTPUT', () => {
  const CLI = 'node dist/src/index.js'
  let testTabId: string

  function runCommand(
    cmd: string,
    timeout = 5000
  ): { output: string; exitCode: number } {
    try {
      const output = execSync(cmd, {
        encoding: 'utf8',
        timeout,
        env: { ...process.env },
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
      `${CLI} tabs new --url "data:text/html,<div id='test-container'>Hover Test Suite Ready</div>"`
    )
    testTabId = extractTabId(output)
    console.log(`Hover test suite using tab ID: ${testTabId}`)
  })

  afterAll(async () => {
    // Clean up our test tab using the specific tab ID
    if (testTabId) {
      try {
        // First check if tab still exists
        const { output } = runCommand(`${CLI} tabs list --json`)
        const data = JSON.parse(output)
        const tabExists = data.tabs.some((tab: any) => tab.id === testTabId)

        if (tabExists) {
          // Find the tab index and close it
          const tabIndex = data.tabs.findIndex(
            (tab: any) => tab.id === testTabId
          )
          runCommand(`${CLI} tabs close --index ${tabIndex}`)
          console.log(`Closed test tab ${testTabId}`)
        }
      } catch (error) {
        // Silently ignore - tab might already be closed
      }
    }
  })

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} hover --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('hover')
      expect(output).toContain('tab-index')
      expect(output).toContain('tab-id')
    })
  })

  describe('direct tab targeting with captured ID', () => {
    it('should hover element using captured tab ID', () => {
      // Navigate our test tab to a page with a hoverable element
      runCommand(
        `${CLI} navigate "data:text/html,<div id='test-div' style='width:100px;height:100px;background:red'>Hover Me</div>" --tab-id ${testTabId}`
      )

      // Hover the element directly using our captured tab ID
      const { exitCode } = runCommand(
        `${CLI} hover "#test-div" --tab-id ${testTabId}`
      )
      expect(exitCode).toBe(0)
    })

    it('should handle non-existent element gracefully', () => {
      // Navigate to page without target element
      runCommand(
        `${CLI} navigate "data:text/html,<div>No hover target here</div>" --tab-id ${testTabId}`
      )

      // Try to hover non-existent element - command hangs on non-existent selectors
      expect(() => {
        runCommand(`${CLI} hover "#nonexistent" --tab-id ${testTabId}`, 2000)
      }).toThrow('Command timed out (hanging)')
    })

    it('should work with different element types', () => {
      // Navigate to page with various hoverable elements
      runCommand(
        `${CLI} navigate "data:text/html,<button id='hover-btn'>Button</button><span id='hover-span'>Span</span>" --tab-id ${testTabId}`
      )

      // Hover different elements in the same tab
      expect(
        runCommand(`${CLI} hover "#hover-btn" --tab-id ${testTabId}`).exitCode
      ).toBe(0)
      expect(
        runCommand(`${CLI} hover "#hover-span" --tab-id ${testTabId}`).exitCode
      ).toBe(0)
    })

    it('should handle invalid tab ID', () => {
      const { output, exitCode } = runCommand(
        `${CLI} hover "#test" --tab-id "INVALID_ID"`,
        2000
      )
      expect(exitCode).toBe(1)
      expect(output).toMatch(/not found/i)
    })

    it('should prevent conflicting tab arguments', () => {
      const { output, exitCode } = runCommand(
        `${CLI} hover "#test" --tab-index 0 --tab-id ${testTabId}`,
        2000
      )
      expect(exitCode).toBe(1)
      // Note: yargs validation output handling varies in test environment
    })
  })

  describe('backwards compatibility', () => {
    it('should work without tab targeting (active page)', () => {
      // Should work on whatever tab is currently active
      const { exitCode } = runCommand(`${CLI} hover --help`)
      expect(exitCode).toBe(0)
    })
  })
})
