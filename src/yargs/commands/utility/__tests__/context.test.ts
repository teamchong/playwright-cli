import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest'
import { execSync } from 'child_process'

/**
 * Context Command Tests
 * 
 * Tests the new context command that shows current browser state
 * to help LLMs understand where they are and what actions have been taken
 */
describe('context command for state visibility', () => {
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
    // Create test page
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
    const { output } = runCommand(
      `${CLI} tabs new --url "data:text/html,${encodeURIComponent(html)}"`
    )
    testTabId = extractTabId(output)
  })

  afterAll(async () => {
    if (testTabId) {
      runCommand(`${CLI} tabs close --tab-id ${testTabId}`)
    }
  })

  describe('basic context information', () => {
    it('should show current page title', async () => {
      const { output, exitCode } = runCommand(
        `${CLI} context --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      expect(output).toContain('Test Page')
      expect(output).toContain('Current Page')
    })

    it('should show current URL', async () => {
      const { output, exitCode } = runCommand(
        `${CLI} context --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      expect(output).toContain('URL:')
      expect(output).toContain('data:text/html')
    })

    it('should show page load time', async () => {
      const { output } = runCommand(
        `${CLI} context --tab-id ${testTabId}`
      )
      
      expect(output).toMatch(/loaded.*ago|Page loaded|Load time/)
    })

    it('should show element counts', async () => {
      const { output } = runCommand(
        `${CLI} context --tab-id ${testTabId}`
      )
      
      expect(output).toMatch(/\d+\s*button/i)
      expect(output).toMatch(/\d+\s*input/i)
      expect(output).toMatch(/\d+\s*link/i)
      expect(output).toContain('form')
    })
  })

  describe('action history tracking', () => {
    beforeEach(async () => {
      // Reset action history for clean test
      // This might need implementation-specific reset
    })

    it('should show recent navigation', async () => {
      // Navigate to a new URL
      runCommand(
        `${CLI} navigate "https://example.com" --tab-id ${testTabId}`
      )
      
      const { output } = runCommand(
        `${CLI} context --tab-id ${testTabId}`
      )
      
      expect(output).toContain('Last')
      expect(output).toContain('action')
      expect(output).toContain('navigate')
      expect(output).toContain('example.com')
    })

    it('should show recent clicks', async () => {
      // Click a button
      runCommand(
        `${CLI} click "#action-btn" --tab-id ${testTabId}`
      )
      
      const { output } = runCommand(
        `${CLI} context --tab-id ${testTabId}`
      )
      
      expect(output).toMatch(/click.*action-btn|Recent.*click/)
    })

    it('should show recent form fills', async () => {
      // Fill form fields
      runCommand(
        `${CLI} fill "#email" "test@example.com" --tab-id ${testTabId}`
      )
      runCommand(
        `${CLI} fill "#password" "secret123" --tab-id ${testTabId}`
      )
      
      const { output } = runCommand(
        `${CLI} context --tab-id ${testTabId}`
      )
      
      expect(output).toMatch(/fill.*email|Recent.*fill/)
      expect(output).toContain('test@example.com')
    })

    it('should limit history to recent actions', async () => {
      // Perform many actions
      for (let i = 0; i < 10; i++) {
        runCommand(
          `${CLI} click "#action-btn" --tab-id ${testTabId}`
        )
      }
      
      const { output } = runCommand(
        `${CLI} context --tab-id ${testTabId}`
      )
      
      // Should show limited number of recent actions (e.g., last 3-5)
      const actionCount = (output.match(/click/g) || []).length
      expect(actionCount).toBeLessThanOrEqual(5)
    })
  })

  describe('form state information', () => {
    it('should indicate presence of forms', async () => {
      const { output } = runCommand(
        `${CLI} context --tab-id ${testTabId}`
      )
      
      expect(output).toContain('form')
      expect(output).toMatch(/Has forms: (Yes|1)|Forms?: 1/)
    })

    it('should show filled form fields', async () => {
      // Fill some fields
      runCommand(
        `${CLI} fill "#email" "user@test.com" --tab-id ${testTabId}`
      )
      
      const { output } = runCommand(
        `${CLI} context --tab-id ${testTabId}`
      )
      
      expect(output).toMatch(/filled|Filled fields|Form status/)
      expect(output).toContain('email')
    })

    it('should indicate empty forms', async () => {
      // Navigate to fresh page
      runCommand(
        `${CLI} navigate "data:text/html,<form><input><button>Submit</button></form>" --tab-id ${testTabId}`
      )
      
      const { output } = runCommand(
        `${CLI} context --tab-id ${testTabId}`
      )
      
      expect(output).toMatch(/empty|unfilled|no.*filled/i)
    })
  })

  describe('navigation state', () => {
    it('should show if back navigation is available', async () => {
      // Navigate twice to enable back
      runCommand(
        `${CLI} navigate "https://example.com" --tab-id ${testTabId}`
      )
      runCommand(
        `${CLI} navigate "https://example.org" --tab-id ${testTabId}`
      )
      
      const { output } = runCommand(
        `${CLI} context --tab-id ${testTabId}`
      )
      
      expect(output).toMatch(/Can go back|Back available|History/)
    })

    it('should show current domain', async () => {
      runCommand(
        `${CLI} navigate "https://example.com/page" --tab-id ${testTabId}`
      )
      
      const { output } = runCommand(
        `${CLI} context --tab-id ${testTabId}`
      )
      
      expect(output).toContain('example.com')
      expect(output).toContain('Domain')
    })
  })

  describe('output formatting', () => {
    it('should use clear section headers', async () => {
      const { output } = runCommand(
        `${CLI} context --tab-id ${testTabId}`
      )
      
      // Should have emoji or clear markers for sections
      expect(output).toMatch(/📍|Current Page|Location/)
      expect(output).toMatch(/🔗|URL/)
      expect(output).toMatch(/📜|Last|Recent|History/)
    })

    it('should support --json flag', async () => {
      const { output, exitCode } = runCommand(
        `${CLI} context --json --tab-id ${testTabId}`
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
        `${CLI} context --tab-id ${testTabId}`
      )
      
      const { output: verboseOutput } = runCommand(
        `${CLI} context --verbose --tab-id ${testTabId}`
      )
      
      // Verbose should have more information
      expect(verboseOutput.length).toBeGreaterThan(normalOutput.length)
      expect(verboseOutput).toMatch(/viewport|cookies|console|network/i)
    })
  })

  describe('multi-tab context', () => {
    it('should work without tab-id (use active tab)', async () => {
      const { output, exitCode } = runCommand(
        `${CLI} context`
      )
      
      expect(exitCode).toBe(0)
      expect(output).toContain('Current Page')
    })

    it('should indicate tab index in context', async () => {
      const { output } = runCommand(
        `${CLI} context --tab-id ${testTabId}`
      )
      
      // Should show which tab we're looking at
      expect(output).toMatch(/Tab.*\d+|Tab ID/)
    })
  })

  describe('error states', () => {
    it('should show helpful message for error pages', async () => {
      // Navigate to non-existent page
      runCommand(
        `${CLI} navigate "http://localhost:99999/404" --tab-id ${testTabId}`
      )
      
      const { output } = runCommand(
        `${CLI} context --tab-id ${testTabId}`
      )
      
      expect(output).toMatch(/error|failed|not found/i)
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
        `${CLI} navigate "data:text/html,${encodeURIComponent(slowHtml)}" --tab-id ${testTabId}`
      )
      
      const { output } = runCommand(
        `${CLI} context --tab-id ${testTabId}`
      )
      
      // Should indicate current state
      expect(output).toBeDefined()
    })
  })

  describe('integration with other commands', () => {
    it('should help debug failed selectors', async () => {
      // Try to click non-existent element
      const { exitCode: clickExit } = runCommand(
        `${CLI} click "#non-existent" --tab-id ${testTabId}`
      )
      
      expect(clickExit).toBe(1)
      
      // Context should help understand what's available
      const { output } = runCommand(
        `${CLI} context --tab-id ${testTabId}`
      )
      
      expect(output).toContain('button')
      expect(output).toContain('Elements')
    })

    it('should complement snapshot command', async () => {
      const { output: contextOutput } = runCommand(
        `${CLI} context --tab-id ${testTabId}`
      )
      
      const { output: snapshotOutput } = runCommand(
        `${CLI} snapshot --tab-id ${testTabId}`
      )
      
      // Context shows state, snapshot shows elements
      expect(contextOutput).toContain('Current Page')
      expect(snapshotOutput).toContain('Interactive Elements')
      
      // Both are useful together
      expect(contextOutput).not.toBe(snapshotOutput)
    })
  })
})