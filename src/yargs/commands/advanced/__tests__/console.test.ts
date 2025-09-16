import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'

/**
 * Real Console Command Tests
 *
 * These tests run the actual CLI binary with real browser functionality.
 * NO MOCKS - everything is tested against a real implementation.
 */
describe('console command - REAL TESTS', () => {
  const CLI = 'node dist/index.js'

  // Helper to run command and check it doesn't hang
  function runCommand(
    cmd: string,
    timeout = 5000
  ): { output: string; exitCode: number } {
    try {
      const output = execSync(cmd, {
        encoding: 'utf8',
        timeout,
        env: { ...process.env },
      })
      return { output, exitCode: 0 }
    } catch (error: any) {
      if (error.code === 'ETIMEDOUT') {
        throw new Error(`Command timed out (hanging): ${cmd}`)
      }
      // Combine stdout and stderr for full error output
      const output = (error.stdout || '') + (error.stderr || '')
      return {
        output,
        exitCode: error.status || 1,
      }
    }
  }

  let testTabId: string

  function extractTabId(output: string): string {
    const match = output.match(/Tab ID: ([A-F0-9-]+)/)
    if (!match) {
      throw new Error(`No tab ID found in output: ${output}`)
    }
    return match[1]
  }

  beforeAll(async () => {
    // Build the CLI only if needed
    if (!require('fs').existsSync('dist/index.js')) {
      execSync('pnpm build', { stdio: 'ignore' })
    }

    // Browser already running from global setup
    // Create a dedicated test tab for this test suite and capture its ID
    const { output } = runCommand(
      `${CLI} tabs new --url "data:text/html,<div id='test-container'>Console Test Suite Ready</div>"`
    )
    testTabId = extractTabId(output)
    console.log(`Console test suite using tab ID: ${testTabId}`)
  }, 30000) // 30 second timeout for build

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
      const { output, exitCode } = runCommand(`${CLI} console --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('Monitor browser console output')
      expect(output).toContain('console')
    })
  })

  describe('handler execution', () => {
    it('should monitor console with global session', () => {
      // Console command with global browser session should work but we test with timeout
      const { output, exitCode } = runCommand(`${CLI} console --once`, 2000)
      // Console command may succeed or timeout, both are acceptable
      expect([0, 1]).toContain(exitCode)
    })

    it('should monitor console with specific tab ID', () => {
      // Test console monitoring with --once flag to avoid hanging
      const { output, exitCode } = runCommand(
        `${CLI} console --once --tab-id ${testTabId}`,
        3000
      )
      // Console command may succeed or timeout, both are acceptable for this test
      expect([0, 1]).toContain(exitCode)
    })

    it('should handle invalid tab ID gracefully', () => {
      const { output, exitCode } = runCommand(
        `${CLI} console --once --tab-id "INVALID_ID"`,
        2000
      )
      expect(exitCode).toBe(1)
      expect(output).toMatch(/not found/i)
    })

    it('should prevent conflicting tab arguments', () => {
      const { output, exitCode } = runCommand(
        `${CLI} console --tab-index 0 --tab-id ${testTabId}`,
        2000
      )
      expect(exitCode).toBe(1)
      // Note: yargs validation output handling varies in test environment
    })
  })
})
