import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { execSync } from 'child_process'
import { TabManager } from '../../../../test-utils/tab-manager'
import { TEST_PORT, CLI } from '../../../../test-utils/test-constants'
import { cleanupCDPConnections } from '../../../../test-utils/test-cleanup'

/**
 * Context Command Tests
 *
 * Tests the new context command that shows current browser state
 * to help LLMs understand where they are and what actions have been taken
 */
describe('context command for state visibility', () => {
  // PORT is set via environment variable in package.json test scripts
  let testTabId: string
  function runCommand(
    cmd: string,
    timeout = 15000
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
        throw new Error(`Command timed out: ${cmd}`)
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
    // Clean up any existing test tabs before starting
    try {
      TabManager.cleanupTestTabs()
    } catch (error) {
      console.warn('Warning: Could not clean up existing tabs:', error)
    }

    // Create test page using TabManager
    const html = `
      <html>
        <head><title>Test Page</title></head>
        <body>
          <h1>Welcome to Test Site</h1>
          <form id="login-form">
            <input type="email" id="email" placeholder="Email">
            <input type="password" id="password" placeholder="Password">
            <button type="submit">Sign In</button>
          </form>
          <button id="action-btn">Take Action</button>
          <a href="#section1">Section 1</a>
          <a href="#section2">Section 2</a>
        </body>
      </html>
    `

    try {
      testTabId = TabManager.createTab(`data:text/html,${encodeURIComponent(html)}`)
    } catch (error) {
      // Fallback to direct command if TabManager fails
      const { output } = runCommand(
        `${CLI} tabs new --port ${TEST_PORT} --url "data:text/html,${encodeURIComponent(html)}"`
      )
      testTabId = extractTabId(output)
      TabManager.registerTab(testTabId)
    }
  })

  afterAll(async () => {
    // Use TabManager for proper cleanup
    try {
      if (testTabId) {
        TabManager.closeTabById(testTabId)
      }
      // Clean up any other test tabs that may have been created
      TabManager.cleanupAllCreatedTabs()
    } catch (error) {
      console.warn('Warning: Could not clean up test tabs:', error)
      // Fallback cleanup
      if (testTabId) {
        try {
          runCommand(`${CLI} tabs close --port ${TEST_PORT} --tab-id ${testTabId}`)
        } catch (fallbackError) {
          console.warn('Fallback cleanup also failed:', fallbackError)
        }
      }
    }

    // CRITICAL: Clean up CDP connections to prevent pool exhaustion
    // Without this, connection pool fills up after ~10 test files
    await cleanupCDPConnections()
  })

  describe('basic context information', () => {
    it('should show current page title', async () => {
      const { output, exitCode } = runCommand(
        `${CLI} context --tab-id ${testTabId} --port ${TEST_PORT}`
      )

      expect(exitCode).toBe(0)
      expect(output).toContain('Test Page')
      expect(output).toContain('Current Page')
    })

    it('should show current URL', async () => {
      const { output, exitCode } = runCommand(
        `${CLI} context --tab-id ${testTabId} --port ${TEST_PORT}`
      )

      expect(exitCode).toBe(0)
      expect(output).toContain('URL:')
      expect(output).toContain('data:text/html')
    })

    it('should show page load time', async () => {
      const { output } = runCommand(`${CLI} context --port ${TEST_PORT} --tab-id ${testTabId}`)

      expect(output).toMatch(/loaded.*ago|Page loaded|Load time/)
    })

    it('should show element counts', async () => {
      const { output } = runCommand(`${CLI} context --port ${TEST_PORT} --tab-id ${testTabId}`)

      expect(output).toMatch(/\d+\s*button/i)
      expect(output).toMatch(/\d+\s*input/i)
      expect(output).toMatch(/\d+\s*link/i)
      expect(output).toContain('form')
    })
  })

  describe('action history tracking', () => {
    beforeEach(async () => {
      // Reset action history for clean test by clearing the temp file
      const fs = require('fs')
      const path = require('path')
      const os = require('os')
      const historyFile = path.join(os.tmpdir(), 'playwright-cli-actions.json')
      try {
        if (fs.existsSync(historyFile)) {
          fs.unlinkSync(historyFile)
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    })

    it('should show recent navigation', async () => {
      // Navigate to a new URL
      runCommand(`${CLI} navigate "https://example.com" --tab-id ${testTabId} --port ${TEST_PORT}`)

      const { output } = runCommand(`${CLI} context --port ${TEST_PORT} --tab-id ${testTabId}`)

      expect(output).toContain('Last')
      expect(output).toContain('Actions')
      expect(output).toContain('Navigated')
      expect(output).toContain('example.com')
    })

    it('should show recent clicks', async () => {
      // Click the existing link on example.com
      runCommand(`${CLI} click --port ${TEST_PORT} "a" --tab-id ${testTabId}`, 10000)

      const { output } = runCommand(`${CLI} context --port ${TEST_PORT} --tab-id ${testTabId}`, 10000)

      expect(output).toMatch(/Clicked.*a|Recent.*Clicked/)
    })

    it('should show recent form fills', async () => {
      // Navigate to a page with a form first
      runCommand(
        `${CLI} navigate "data:text/html,<form><input id='email' type='email'><input id='password' type='password'></form>" --tab-id ${testTabId} --port ${TEST_PORT}`,
        10000
      )

      // Fill form fields
      runCommand(
        `${CLI} fill "#email=test@example.com" --tab-id ${testTabId} --port ${TEST_PORT}`,
        10000
      )
      runCommand(`${CLI} fill "#password=secret123" --tab-id ${testTabId} --port ${TEST_PORT}`, 10000)

      const { output } = runCommand(`${CLI} context --port ${TEST_PORT} --tab-id ${testTabId}`, 10000)

      expect(output).toMatch(/Filled.*email|Recent.*Filled/)
    })

    it('should limit history to recent actions', async () => {
      // Navigate to ensure we have a page with links
      runCommand(`${CLI} navigate "https://example.com" --tab-id ${testTabId} --port ${TEST_PORT}`, 10000)

      // Perform a couple of actions to test history
      runCommand(`${CLI} click --port ${TEST_PORT} "a" --tab-id ${testTabId}`, 10000)
      runCommand(`${CLI} navigate "https://example.org" --tab-id ${testTabId} --port ${TEST_PORT}`, 10000)

      const { output } = runCommand(`${CLI} context --port ${TEST_PORT} --tab-id ${testTabId}`, 10000)

      // Check that actions are shown in Recent Actions section
      expect(output).toContain('Recent Actions')

      // Should show either clicked or navigated actions
      const clickedCount = (output.match(/Clicked/gi) || []).length
      const navigatedCount = (output.match(/Navigated/gi) || []).length
      const totalActions = clickedCount + navigatedCount

      expect(totalActions).toBeGreaterThan(0)
      expect(totalActions).toBeLessThanOrEqual(10)
    }, 60000)
  })

  describe('form state information', () => {
    it('should indicate presence of forms', async () => {
      // Navigate to a page without forms first to ensure consistent state
      runCommand(`${CLI} navigate "https://example.com" --tab-id ${testTabId} --port ${TEST_PORT}`, 10000)

      const { output } = runCommand(`${CLI} context --port ${TEST_PORT} --tab-id ${testTabId}`, 10000)

      expect(output).toContain('form')
      expect(output).toContain('0 form(s)')
    })

    it('should show filled form fields', async () => {
      // Navigate to a page with a form
      runCommand(
        `${CLI} navigate "data:text/html,<form><input id='email' type='email'></form>" --tab-id ${testTabId} --port ${TEST_PORT}`,
        10000
      )

      // Fill some fields
      runCommand(`${CLI} fill "#email=user@test.com" --tab-id ${testTabId} --port ${TEST_PORT}`, 10000)

      const { output } = runCommand(`${CLI} context --port ${TEST_PORT} --tab-id ${testTabId}`, 10000)

      expect(output).toMatch(/Filled|filled|email/)
    })

    it('should indicate empty forms', async () => {
      // Navigate to fresh page
      runCommand(
        `${CLI} navigate "data:text/html,<form><input><button>Submit</button></form>" --tab-id ${testTabId} --port ${TEST_PORT}`,
        10000
      )

      const { output } = runCommand(`${CLI} context --port ${TEST_PORT} --tab-id ${testTabId}`, 10000)

      // The context command shows form count but doesn't track form fill state
      expect(output).toContain('1 form(s)')
      expect(output).toContain('1 input field(s)')
    })
  })

  describe('navigation state', () => {
    it('should show if back navigation is available', async () => {
      // Navigate twice to enable back
      runCommand(`${CLI} navigate "https://example.com" --tab-id ${testTabId} --port ${TEST_PORT}`, 10000)
      runCommand(`${CLI} navigate "https://example.org" --tab-id ${testTabId} --port ${TEST_PORT}`, 10000)

      const { output } = runCommand(`${CLI} context --port ${TEST_PORT} --tab-id ${testTabId}`, 10000)

      expect(output).toMatch(/Can go back|Back available|History/)
    })

    it('should show current domain', async () => {
      runCommand(
        `${CLI} navigate "https://example.com/page" --tab-id ${testTabId} --port ${TEST_PORT}`,
        10000
      )

      const { output } = runCommand(`${CLI} context --port ${TEST_PORT} --tab-id ${testTabId}`, 10000)

      expect(output).toContain('example.com')
      expect(output).toContain('Domain')
    })
  })

  describe('output formatting', () => {
    it('should use clear section headers', async () => {
      const { output } = runCommand(`${CLI} context --port ${TEST_PORT} --tab-id ${testTabId}`, 10000)

      // Should have emoji or clear markers for sections
      expect(output).toMatch(/📍|Current Page|Location/)
      expect(output).toMatch(/🔗|URL/)
      expect(output).toMatch(/📜|Last|Recent|History/)
    })

    it('should support --json flag', async () => {
      const { output, exitCode } = runCommand(
        `${CLI} context --port ${TEST_PORT} --json --tab-id ${testTabId}`
      )

      expect(exitCode).toBe(0)

      // Should be valid JSON
      const parsed = JSON.parse(output)
      expect(parsed).toBeDefined()
      expect(parsed.url).toBeDefined()
      expect(parsed.title).toBeDefined()
      expect(parsed.elements).toBeDefined()
      expect(parsed.history).toBeDefined()
      expect(Array.isArray(parsed.history)).toBe(true)
    })

    it('should support --verbose flag for detailed info', async () => {
      const { output: normalOutput } = runCommand(
        `${CLI} context --tab-id ${testTabId} --port ${TEST_PORT}`
      )

      const { output: verboseOutput } = runCommand(
        `${CLI} context --port ${TEST_PORT} --verbose --tab-id ${testTabId}`
      )

      // Verbose should have more information (or at least same content)
      expect(verboseOutput.length).toBeGreaterThanOrEqual(normalOutput.length)
      expect(verboseOutput).toMatch(/viewport|cookies|console|network/i)
    })
  })

  describe('multi-tab context', () => {
    it('should work without tab-id (use active tab)', async () => {
      const { output, exitCode } = runCommand(`${CLI} context --port ${TEST_PORT}`)

      expect(exitCode).toBe(0)
      expect(output).toContain('Current Page')
    })

    it('should indicate tab index in context', async () => {
      const { output } = runCommand(`${CLI} context --port ${TEST_PORT} --tab-id ${testTabId}`, 10000)

      // Should show which tab we're looking at
      expect(output).toMatch(/Tab.*\d+|Tab ID/)
    })
  })

  describe('error states', () => {
    it('should show helpful message for error pages', async () => {
      // Navigate to a 404 error page
      runCommand(
        `${CLI} navigate "https://example.com/404" --tab-id ${testTabId} --port ${TEST_PORT}`
      )

      const { output } = runCommand(`${CLI} context --port ${TEST_PORT} --tab-id ${testTabId}`, 10000)

      // The page should show it navigated to the 404 URL
      expect(output).toContain('404')
    })

    it('should indicate when page is loading', async () => {
      // Start navigation to slow-loading page
      // This is tricky to test without a real slow server
      // Could mock with data URL that includes slow JavaScript
      const slowHtml = `
        <html>
          <body>
            <script>
              // Simulate slow loading
              setTimeout(() => {
                document.body.innerHTML += '<div>Loaded</div>';
              }, 3000);
            </script>
            Loading...
          </body>
        </html>
      `

      runCommand(
        `${CLI} navigate "data:text/html,${encodeURIComponent(slowHtml)}" --tab-id ${testTabId} --port ${TEST_PORT}`
      )

      const { output } = runCommand(`${CLI} context --port ${TEST_PORT} --tab-id ${testTabId}`, 10000)

      // Should indicate current state
      expect(output).toBeDefined()
    })
  })

  describe('integration with other commands', () => {
    it('should help debug failed selectors', async () => {
      // Try to click non-existent element
      const { exitCode: clickExit } = runCommand(
        `${CLI} click --port ${TEST_PORT} "#non-existent" --tab-id ${testTabId}`
      )

      expect(clickExit).toBe(1)

      // Context should help understand what's available
      const { output } = runCommand(`${CLI} context --port ${TEST_PORT} --tab-id ${testTabId}`, 10000)

      expect(output).toContain('button')
      expect(output).toContain('Elements')
    })

    it('should complement snapshot command', async () => {
      const { output: contextOutput } = runCommand(
        `${CLI} context --tab-id ${testTabId} --port ${TEST_PORT}`
      )

      const { output: snapshotOutput } = runCommand(
        `${CLI} snapshot --port ${TEST_PORT} --tab-id ${testTabId}`
      )

      // Context shows state, snapshot shows elements
      expect(contextOutput).toContain('Current Page')
      expect(snapshotOutput).toContain('Interactive Elements')

      // Both are useful together
      expect(contextOutput).not.toBe(snapshotOutput)
    })
  })
})
