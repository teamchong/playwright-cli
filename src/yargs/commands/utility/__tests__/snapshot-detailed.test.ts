import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from 'vitest'
import { execSync } from 'child_process'

/**
 * Snapshot --detailed Tests
 * 
 * Tests enhanced snapshot output that provides more detailed
 * information about form fields, labels, and element attributes
 */
describe('snapshot --detailed command enhancement', () => {
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
    // Create test page with complex form
    const html = `
      <html>
        <body>
          <h1>Registration Form</h1>
          
          <form id="registration" action="/signup" method="POST">
            <div>
              <label for="username">Username:</label>
              <input type="text" id="username" name="username" required placeholder="Choose a username">
            </div>
            
            <div>
              <label for="email">Email Address:</label>
              <input type="email" id="email" name="email" required placeholder="your@email.com">
            </div>
            
            <div>
              <label for="password">Password:</label>
              <input type="password" id="password" name="password" required minlength="8">
            </div>
            
            <div>
              <label for="country">Country:</label>
              <select id="country" name="country">
                <option value="">Select...</option>
                <option value="us">United States</option>
                <option value="uk">United Kingdom</option>
                <option value="ca">Canada</option>
              </select>
            </div>
            
            <div>
              <label>
                <input type="checkbox" name="newsletter" value="yes">
                Subscribe to newsletter
              </label>
            </div>
            
            <div>
              <label>Gender:</label>
              <label><input type="radio" name="gender" value="male"> Male</label>
              <label><input type="radio" name="gender" value="female"> Female</label>
              <label><input type="radio" name="gender" value="other"> Other</label>
            </div>
            
            <div>
              <label for="bio">Bio:</label>
              <textarea id="bio" name="bio" rows="4" placeholder="Tell us about yourself"></textarea>
            </div>
            
            <button type="submit">Sign Up</button>
            <button type="reset">Clear Form</button>
          </form>
          
          <div>
            <a href="/login">Already have an account? Sign in</a>
            <a href="/help" target="_blank">Need help?</a>
          </div>
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

  describe('basic snapshot vs detailed snapshot', () => {
    it('should show basic info without --detailed flag', async () => {
      const { output, exitCode } = runCommand(
        `${CLI} snapshot --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      expect(output).toContain('Interactive Elements')
      expect(output).toContain('[ref=')
      
      // Basic output should not include detailed form info
      expect(output).not.toContain('[required]')
      expect(output).not.toContain('[type=')
      expect(output).not.toContain('Form Fields:')
    })

    it('should show enhanced info with --detailed flag', async () => {
      const { output, exitCode } = runCommand(
        `${CLI} snapshot --detailed --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      expect(output).toContain('Form Fields:')
      expect(output).toContain('[required]')
      expect(output).toContain('[type=')
    })
  })

  describe('form field details', () => {
    it('should show input types', async () => {
      const { output } = runCommand(
        `${CLI} snapshot --detailed --tab-id ${testTabId}`
      )
      
      expect(output).toContain('[type=text]')
      expect(output).toContain('[type=email]')
      expect(output).toContain('[type=password]')
      expect(output).toContain('[type=checkbox]')
      expect(output).toContain('[type=radio]')
    })

    it('should show field labels', async () => {
      const { output } = runCommand(
        `${CLI} snapshot --detailed --tab-id ${testTabId}`
      )
      
      expect(output).toContain('Username')
      expect(output).toContain('Email Address')
      expect(output).toContain('Password')
      expect(output).toContain('Country')
      expect(output).toContain('Bio')
    })

    it('should show field names and ids', async () => {
      const { output } = runCommand(
        `${CLI} snapshot --detailed --tab-id ${testTabId}`
      )
      
      expect(output).toContain('[name=username]')
      expect(output).toContain('[id=email]')
      expect(output).toContain('[name=password]')
    })

    it('should show placeholder text', async () => {
      const { output } = runCommand(
        `${CLI} snapshot --detailed --tab-id ${testTabId}`
      )
      
      expect(output).toContain('Choose a username')
      expect(output).toContain('your@email.com')
      expect(output).toContain('Tell us about yourself')
    })

    it('should indicate required fields', async () => {
      const { output } = runCommand(
        `${CLI} snapshot --detailed --tab-id ${testTabId}`
      )
      
      // Required fields should be marked
      expect(output).toMatch(/username.*\[required\]|Email.*\[required\]/)
      expect(output).toMatch(/password.*\[required\]/)
      
      // Optional fields should not be marked as required
      expect(output).not.toMatch(/newsletter.*\[required\]/)
      expect(output).not.toMatch(/bio.*\[required\]/)
    })

    it('should show select options', async () => {
      const { output } = runCommand(
        `${CLI} snapshot --detailed --tab-id ${testTabId}`
      )
      
      expect(output).toContain('select')
      expect(output).toContain('Country')
      // Could show option count or values
      expect(output).toMatch(/options|select/i)
    })

    it('should group form elements by form', async () => {
      const { output } = runCommand(
        `${CLI} snapshot --detailed --tab-id ${testTabId}`
      )
      
      expect(output).toContain('Form')
      expect(output).toContain('registration')
      // Form action and method could be shown
      expect(output).toMatch(/POST|\/signup/)
    })
  })

  describe('button details', () => {
    it('should differentiate button types', async () => {
      const { output } = runCommand(
        `${CLI} snapshot --detailed --tab-id ${testTabId}`
      )
      
      expect(output).toContain('Sign Up')
      expect(output).toContain('[type=submit]')
      expect(output).toContain('Clear Form')
      expect(output).toContain('[type=reset]')
    })
  })

  describe('link details', () => {
    it('should show link destinations', async () => {
      const { output } = runCommand(
        `${CLI} snapshot --detailed --tab-id ${testTabId}`
      )
      
      expect(output).toContain('/login')
      expect(output).toContain('/help')
      expect(output).toContain('[target=_blank]')
    })
  })

  describe('output format', () => {
    it('should organize output by categories', async () => {
      const { output } = runCommand(
        `${CLI} snapshot --detailed --tab-id ${testTabId}`
      )
      
      // Should have clear sections
      expect(output).toContain('Form Fields')
      expect(output).toContain('Buttons')
      expect(output).toContain('Links')
    })

    it('should maintain refs for all elements', async () => {
      const { output } = runCommand(
        `${CLI} snapshot --detailed --tab-id ${testTabId}`
      )
      
      // Count refs - should have one for each interactive element
      const refCount = (output.match(/\[ref=[a-f0-9]+\]/g) || []).length
      expect(refCount).toBeGreaterThan(10) // We have many form fields
    })

    it('should show field fill status when fields have values', async () => {
      // Fill some fields
      runCommand(
        `${CLI} fill "#username" "testuser" --tab-id ${testTabId}`
      )
      runCommand(
        `${CLI} fill "#email" "test@example.com" --tab-id ${testTabId}`
      )
      
      const { output } = runCommand(
        `${CLI} snapshot --detailed --tab-id ${testTabId}`
      )
      
      // Should indicate which fields are filled
      expect(output).toMatch(/username.*\[filled\]|username.*has value/)
      expect(output).toMatch(/email.*\[filled\]|email.*has value/)
    })
  })

  describe('JSON output', () => {
    it('should support --json flag with --detailed', async () => {
      const { output, exitCode } = runCommand(
        `${CLI} snapshot --detailed --json --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      
      // Should be valid JSON
      const parsed = JSON.parse(output)
      expect(parsed).toBeDefined()
      expect(parsed.forms).toBeDefined()
      expect(parsed.fields).toBeDefined()
      expect(Array.isArray(parsed.fields)).toBe(true)
      
      // Should have detailed field info
      const emailField = parsed.fields.find((f: any) => f.name === 'email')
      expect(emailField).toBeDefined()
      expect(emailField.type).toBe('email')
      expect(emailField.required).toBe(true)
      expect(emailField.label).toContain('Email')
    })
  })

  describe('edge cases', () => {
    it('should handle pages with no forms', async () => {
      // Create page without forms
      const { output: newTabOutput } = runCommand(
        `${CLI} tabs new --url "data:text/html,<h1>No Forms Here</h1><button>Click</button>"`
      )
      const noFormTabId = extractTabId(newTabOutput)
      
      const { output, exitCode } = runCommand(
        `${CLI} snapshot --detailed --tab-id ${noFormTabId}`
      )
      
      expect(exitCode).toBe(0)
      expect(output).not.toContain('Form Fields')
      expect(output).toContain('button')
      
      // Clean up
      runCommand(`${CLI} tabs close --tab-id ${noFormTabId}`)
    })

    it('should handle unlabeled inputs', async () => {
      // Add unlabeled input
      runCommand(
        `${CLI} eval "document.body.innerHTML += '<input type=\\"text\\" placeholder=\\"Unlabeled\\">'" --tab-id ${testTabId}`
      )
      
      const { output } = runCommand(
        `${CLI} snapshot --detailed --tab-id ${testTabId}`
      )
      
      // Should still show the input with placeholder as identifier
      expect(output).toContain('Unlabeled')
    })
  })
})