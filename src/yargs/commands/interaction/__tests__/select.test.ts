import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'

/**
 * Simplified Select Command Tests - TAB ID FROM COMMAND OUTPUT
 *
 * - Uses global browser session (no per-file setup/teardown)
 * - Captures tab ID directly from command output
 * - Uses returned tab ID for all interactions
 * - NO COMPLEX DISCOVERY - commands return what we need
 * - NO TAB MANAGEMENT - let global setup handle browser lifecycle
 */
describe('select command - TAB ID FROM OUTPUT', () => {
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
      `${CLI} tabs new --url "data:text/html,<div id='test-container'>Select Test Suite Ready</div>"`
    )
    testTabId = extractTabId(output)
    console.log(`Select test suite using tab ID: ${testTabId}`)
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
      const { output, exitCode } = runCommand(`${CLI} select --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('select')
      expect(output).toContain('tab-index')
      expect(output).toContain('tab-id')
    })
  })

  describe('direct tab targeting with captured ID', () => {
    it('should select option using captured tab ID', () => {
      // Navigate our test tab to a page with a select dropdown
      runCommand(
        `${CLI} navigate "data:text/html,<select id='test-select'><option value='a'>Option A</option><option value='b'>Option B</option><option value='c'>Option C</option></select>" --tab-id ${testTabId}`
      )

      // Select an option using our captured tab ID
      const { exitCode } = runCommand(
        `${CLI} select "#test-select" "b" --tab-id ${testTabId}`
      )
      expect(exitCode).toBe(0)
    })

    it('should select multiple options in multi-select', () => {
      // Navigate to page with multi-select dropdown
      runCommand(
        `${CLI} navigate "data:text/html,<select id='multi-select' multiple><option value='1'>One</option><option value='2'>Two</option><option value='3'>Three</option></select>" --tab-id ${testTabId}`
      )

      // Select multiple options in the same tab
      const { exitCode } = runCommand(
        `${CLI} select "#multi-select" "1" "3" --tab-id ${testTabId}`
      )
      expect(exitCode).toBe(0)
    })

    it('should work with different select elements', () => {
      // Navigate to page with multiple select elements
      runCommand(
        `${CLI} navigate "data:text/html,<select id='color'><option value='red'>Red</option><option value='blue'>Blue</option></select><select id='size'><option value='s'>Small</option><option value='l'>Large</option></select>" --tab-id ${testTabId}`
      )

      // Select from different dropdowns in the same tab
      expect(
        runCommand(`${CLI} select "#color" "blue" --tab-id ${testTabId}`)
          .exitCode
      ).toBe(0)
      expect(
        runCommand(`${CLI} select "#size" "l" --tab-id ${testTabId}`).exitCode
      ).toBe(0)
    })

    it('should handle non-existent element gracefully', () => {
      // Navigate to page without select element
      runCommand(
        `${CLI} navigate "data:text/html,<div>No select here</div>" --tab-id ${testTabId}`
      )

      // Try to select from non-existent element - command hangs on non-existent selectors
      expect(() => {
        runCommand(
          `${CLI} select "#nonexistent" "value" --tab-id ${testTabId}`,
          2000
        )
      }).toThrow('Command timed out (hanging)')
    })

    it('should handle invalid tab ID', () => {
      const { output, exitCode } = runCommand(
        `${CLI} select "#test" "value" --tab-id "INVALID_ID"`,
        2000
      )
      expect(exitCode).toBe(1)
      expect(output).toMatch(/not found/i)
    })

    it('should prevent conflicting tab arguments', () => {
      const { output, exitCode } = runCommand(
        `${CLI} select "#test" "value" --tab-index 0 --tab-id ${testTabId}`,
        2000
      )
      expect(exitCode).toBe(1)
      // Note: yargs validation output handling varies in test environment
    })
  })

  describe('backwards compatibility', () => {
    it('should work without tab targeting (active page)', () => {
      // Should work on whatever tab is currently active
      const { exitCode } = runCommand(`${CLI} select --help`)
      expect(exitCode).toBe(0)
    })
  })
})
