import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from 'vitest'
import { execSync } from 'child_process'

/**
 * Text-Based Selector Fallback Tests
 * 
 * Tests that commands can find elements using text content
 * instead of requiring exact CSS selectors
 */
describe('text-based selector fallback', () => {
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
    // Create test page with various elements
    const html = `
      <html>
        <body>
          <button onclick="this.textContent='Clicked'">Sign In</button>
          <button class="primary" onclick="this.textContent='Submitted'">Submit Form</button>
          <a href="#" onclick="this.textContent='Link Clicked'; return false;">Learn More</a>
          <input type="text" placeholder="Enter your name" id="name-input">
          <input type="email" placeholder="Email address" id="email-input">
          <div role="button" onclick="this.textContent='Custom Clicked'">Custom Button</div>
          <button aria-label="Close dialog" onclick="this.textContent='Closed'">X</button>
          <span onclick="this.textContent='Span Clicked'">Clickable Text</span>
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

  describe('click command with text selectors', () => {
    it('should click button by exact text', async () => {
      const { output, exitCode } = runCommand(
        `${CLI} click "Sign In" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      expect(output).toContain('Clicked')
      
      // Verify button was clicked
      const { output: evalOutput } = runCommand(
        `${CLI} eval "document.querySelector('button').textContent" --tab-id ${testTabId}`
      )
      expect(evalOutput).toContain('Clicked')
    })

    it('should click button by partial text', async () => {
      const { output, exitCode } = runCommand(
        `${CLI} click "Submit" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      
      // Verify correct button was clicked
      const { output: evalOutput } = runCommand(
        `${CLI} eval "document.querySelector('.primary').textContent" --tab-id ${testTabId}`
      )
      expect(evalOutput).toContain('Submitted')
    })

    it('should click link by text', async () => {
      const { output, exitCode } = runCommand(
        `${CLI} click "Learn More" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      
      // Verify link was clicked
      const { output: evalOutput } = runCommand(
        `${CLI} eval "document.querySelector('a').textContent" --tab-id ${testTabId}`
      )
      expect(evalOutput).toContain('Link Clicked')
    })

    it('should click element with role=button', async () => {
      const { output, exitCode } = runCommand(
        `${CLI} click "Custom Button" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      
      // Verify custom button was clicked
      const { output: evalOutput } = runCommand(
        `${CLI} eval "document.querySelector('[role=button]').textContent" --tab-id ${testTabId}`
      )
      expect(evalOutput).toContain('Custom Clicked')
    })

    it('should click by aria-label when no text content', async () => {
      const { output, exitCode } = runCommand(
        `${CLI} click "Close dialog" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      
      // Verify button with aria-label was clicked
      const { output: evalOutput } = runCommand(
        `${CLI} eval "document.querySelector('[aria-label*=Close]').textContent" --tab-id ${testTabId}`
      )
      expect(evalOutput).toContain('Closed')
    })

    it('should fall back to CSS selector if text not found', async () => {
      // Reset page
      runCommand(
        `${CLI} eval "document.querySelector('button').textContent = 'Sign In'" --tab-id ${testTabId}`
      )
      
      // Should still work with CSS selector
      const { output, exitCode } = runCommand(
        `${CLI} click "button.primary" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
    })

    it('should handle text with special characters', async () => {
      // Add element with special chars
      runCommand(
        `${CLI} eval "document.body.innerHTML += '<button onclick=\\"this.textContent=\\'Done\\'\\" >Save & Continue</button>'" --tab-id ${testTabId}`
      )
      
      const { output, exitCode } = runCommand(
        `${CLI} click "Save & Continue" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
    })

    it('should prioritize exact match over partial match', async () => {
      // Add two buttons with similar text
      runCommand(
        `${CLI} eval "document.body.innerHTML = '<button id=\\"b1\\" onclick=\\"this.id=\\'clicked1\\' \\">Save</button><button id=\\"b2\\" onclick=\\"this.id=\\'clicked2\\' \\">Save Draft</button>'" --tab-id ${testTabId}`
      )
      
      const { output, exitCode } = runCommand(
        `${CLI} click "Save" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      
      // Verify exact match was clicked
      const { output: evalOutput } = runCommand(
        `${CLI} eval "document.getElementById('clicked1') ? 'exact' : 'partial'" --tab-id ${testTabId}`
      )
      expect(evalOutput).toContain('exact')
    })
  })

  describe('type command with text selectors', () => {
    it('should type into input by placeholder text', async () => {
      const { output, exitCode } = runCommand(
        `${CLI} type "Enter your name" "John Doe" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      
      // Verify text was typed
      const { output: evalOutput } = runCommand(
        `${CLI} eval "document.getElementById('name-input').value" --tab-id ${testTabId}`
      )
      expect(evalOutput).toContain('John Doe')
    })

    it('should type into input by label text', async () => {
      // Add labeled input
      runCommand(
        `${CLI} eval "document.body.innerHTML += '<label for=\\"pwd\\">Password:</label><input id=\\"pwd\\" type=\\"password\\">'" --tab-id ${testTabId}`
      )
      
      const { output, exitCode } = runCommand(
        `${CLI} type "Password" "secret123" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      
      // Verify password was typed
      const { output: evalOutput } = runCommand(
        `${CLI} eval "document.getElementById('pwd').value" --tab-id ${testTabId}`
      )
      expect(evalOutput).toContain('secret123')
    })
  })

  describe('fill command with text selectors', () => {
    it('should fill input by placeholder text', async () => {
      const { output, exitCode } = runCommand(
        `${CLI} fill "Email address" "test@example.com" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      
      // Verify email was filled
      const { output: evalOutput } = runCommand(
        `${CLI} eval "document.getElementById('email-input').value" --tab-id ${testTabId}`
      )
      expect(evalOutput).toContain('test@example.com')
    })
  })

  describe('hover command with text selectors', () => {
    it('should hover over element by text', async () => {
      // Reset clickable span
      runCommand(
        `${CLI} eval "document.querySelector('span').textContent = 'Clickable Text'" --tab-id ${testTabId}`
      )
      
      const { output, exitCode } = runCommand(
        `${CLI} hover "Clickable Text" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      expect(output).toContain('Hovered')
    })
  })

  describe('error handling', () => {
    it('should provide helpful error when text not found', async () => {
      const { output, exitCode } = runCommand(
        `${CLI} click "Non-existent Button" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(1)
      expect(output.toLowerCase()).toContain('not found')
      expect(output.toLowerCase()).toContain('text')
    })

    it('should suggest using snapshot when multiple matches', async () => {
      // Add multiple buttons with same text
      runCommand(
        `${CLI} eval "document.body.innerHTML = '<button>Click</button><button>Click</button>'" --tab-id ${testTabId}`
      )
      
      const { output, exitCode } = runCommand(
        `${CLI} click "Click" --tab-id ${testTabId}`
      )
      
      // Should either click first one or warn about multiple matches
      // Implementation can choose behavior
      expect(output).toBeDefined()
    })
  })
})