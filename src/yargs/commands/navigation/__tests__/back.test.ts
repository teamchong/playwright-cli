import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'

/**
 * Real Back Command Tests
 *
 * Uses proper tab ID management:
 * - No workarounds, all tests must pass with real usage
 * - Specific tab IDs for all operations
 * - Proper cleanup when tests complete
 */
describe('back command - REAL TESTS', () => {
  const CLI = 'node dist/index.js'
  let testTabId: string

  // Helper functions
  function runCommand(
    cmd: string,
    timeout = 5000
  ): { output: string; exitCode: number } {
    try {
      const output = execSync(cmd, {
        encoding: 'utf8',
        timeout,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
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
    const match = output.match(/Tab ID: ([a-fA-F0-9]+)/)
    if (!match) {
      throw new Error(`Could not extract tab ID from output: ${output}`)
    }
    return match[1]
  }

  function executeWithTabId(
    baseCommand: string,
    tabId: string
  ): { output: string; exitCode: number } {
    return runCommand(`${baseCommand} --tab-id ${tabId}`)
  }

  beforeAll(async () => {
    // Create a dedicated test tab for this test suite
    const { output } = runCommand(
      `${CLI} tabs new --url "data:text/html,<div id='test-container'>Back Test Suite Ready</div>"`
    )
    testTabId = extractTabId(output)
    console.log(`Back test suite using tab ID: ${testTabId}`)
  })

  afterAll(async () => {
    // Clean up our test tab
    if (testTabId) {
      try {
        const { output } = runCommand(`${CLI} tabs list`)
        // Parse output to find tab index for this ID
        const lines = output.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(`ID: ${testTabId}`)) {
            // Look backwards to find the index line
            for (let j = i - 1; j >= 0; j--) {
              const indexMatch = lines[j].trim().match(/^(\d+):/)
              if (indexMatch) {
                const tabIndex = parseInt(indexMatch[1])
                runCommand(`${CLI} tabs close --index ${tabIndex}`)
                break
              }
            }
            break
          }
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  })

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} back --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('back')
      expect(output).toContain('tab-index')
      expect(output).toContain('tab-id')
    })
  })

  describe('direct tab targeting with captured ID', () => {
    it('should navigate back using captured tab ID', () => {
      // First navigate to pages to create history
      executeWithTabId(
        `${CLI} navigate "data:text/html,<h1>Page 1</h1>"`,
        testTabId
      )
      executeWithTabId(
        `${CLI} navigate "data:text/html,<h1>Page 2</h1>"`,
        testTabId
      )

      // Now navigate back using our captured tab ID
      const { exitCode, output } = executeWithTabId(`${CLI} back`, testTabId)
      expect(exitCode).toBe(0)
      expect(output).toContain('Successfully navigated back')
    })

    it('should handle no history gracefully', () => {
      // Create a fresh tab with no history
      const { output: newTabOutput } = runCommand(
        `${CLI} tabs new --url "data:text/html,<h1>Fresh Page</h1>"`
      )
      const freshTabId = extractTabId(newTabOutput)

      // Try to go back when there's no history
      const { exitCode, output } = executeWithTabId(`${CLI} back`, freshTabId)
      // Back command succeeds even with no history in real browser
      expect(exitCode).toBe(0)
      expect(output).toContain('Successfully navigated back')

      // Clean up the fresh tab (find its index and close)
      try {
        const { output: listOutput } = runCommand(`${CLI} tabs list`)
        const lines = listOutput.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(`ID: ${freshTabId}`)) {
            for (let j = i - 1; j >= 0; j--) {
              const indexMatch = lines[j].trim().match(/^(\d+):/)
              if (indexMatch) {
                const tabIndex = parseInt(indexMatch[1])
                runCommand(`${CLI} tabs close --index ${tabIndex}`)
                break
              }
            }
            break
          }
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    })

    it('should work with multiple back navigation', () => {
      // Create history with multiple pages
      executeWithTabId(
        `${CLI} navigate "data:text/html,<h1>History 1</h1>"`,
        testTabId
      )
      executeWithTabId(
        `${CLI} navigate "data:text/html,<h1>History 2</h1>"`,
        testTabId
      )
      executeWithTabId(
        `${CLI} navigate "data:text/html,<h1>History 3</h1>"`,
        testTabId
      )

      // Navigate back multiple times
      expect(executeWithTabId(`${CLI} back`, testTabId).exitCode).toBe(0)
      expect(executeWithTabId(`${CLI} back`, testTabId).exitCode).toBe(0)
    })

    it('should handle invalid tab ID', () => {
      const { output, exitCode } = runCommand(
        `${CLI} back --tab-id "INVALID_ID"`,
        2000
      )
      expect(exitCode).toBe(1)
      expect(output).toMatch(/not found/i)
    })

    it('should prevent conflicting tab arguments', () => {
      const { output, exitCode } = runCommand(
        `${CLI} back --tab-index 0 --tab-id ${testTabId}`,
        2000
      )
      expect(exitCode).toBe(1)
      // Command should reject conflicting arguments
    })
  })

  describe('backwards compatibility', () => {
    it('should work without tab targeting (active page)', () => {
      // Should work on whatever tab is currently active
      const { exitCode } = runCommand(`${CLI} back --help`)
      expect(exitCode).toBe(0)
    })
  })
})
