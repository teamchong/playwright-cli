import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { execSync } from 'child_process'

/**
 * Multi-Field Fill Tests
 *
 * Tests the enhanced fill command that can fill multiple
 * form fields in a single command
 */
describe('multi-field fill command enhancement', () => {
  const CLI = 'node dist/src/index.js'
  const TEST_PORT = 19222
  let testTabId: string

  // Helper to run commands with the correct port
  function runCommandWithPort(
    baseCmd: string,
    timeout = 15000
  ): { output: string; exitCode: number } {
    // Add port to command if it doesn't already have it
    const cmd = baseCmd.includes('--port')
      ? baseCmd
      : `${baseCmd} --port ${TEST_PORT}`
    return runCommand(cmd, timeout)
  }

  function runCommand(
    cmd: string,
    timeout = 10000
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
    // Create test page with various form types
    const html = `
      <html>
        <body>
          <h1>Multi-Form Test Page</h1>
          
          <!-- Login form -->
          <form id="login-form">
            <h2>Login Form</h2>
            <input type="email" name="email" id="email" placeholder="Email">
            <input type="password" name="password" id="password" placeholder="Password">
            <button type="submit">Login</button>
          </form>
          
          <!-- Registration form -->
          <form id="registration-form">
            <h2>Registration Form</h2>
            <label for="username">Username:</label>
            <input type="text" name="username" id="username">
            
            <label for="reg-email">Email:</label>
            <input type="email" name="email" id="reg-email">
            
            <label for="reg-password">Password:</label>
            <input type="password" name="password" id="reg-password">
            
            <label for="confirm-password">Confirm Password:</label>
            <input type="password" name="confirm" id="confirm-password">
            
            <label for="fullname">Full Name:</label>
            <input type="text" name="fullname" id="fullname">
            
            <label for="phone">Phone:</label>
            <input type="tel" name="phone" id="phone">
            
            <button type="submit">Register</button>
          </form>
          
          <!-- Contact form -->
          <form id="contact-form">
            <h2>Contact Form</h2>
            <input type="text" name="name" placeholder="Your Name">
            <input type="email" name="email" placeholder="Your Email">
            <input type="text" name="subject" placeholder="Subject">
            <textarea name="message" placeholder="Your Message"></textarea>
            <button type="submit">Send</button>
          </form>
        </body>
      </html>
    `
    const { output } = runCommandWithPort(
      `${CLI} tabs new --url "data:text/html,${encodeURIComponent(html)}"`,
      15000
    )
    testTabId = extractTabId(output)
  })

  afterAll(async () => {
    if (testTabId) {
      runCommandWithPort(`${CLI} tabs close --tab-id ${testTabId}`, 10000)
    }
  })

  beforeEach(async () => {
    // Clear all form fields before each test
    const result = runCommandWithPort(
      `${CLI} eval "document.querySelectorAll('input, textarea').forEach(el => el.value = '')" --tab-id ${testTabId} --timeout 8000`,
      12000
    )

    // If tab doesn't exist, recreate it
    if (result.exitCode !== 0) {
      const html = `
        <!DOCTYPE html>
        <html>
        <body>
          <!-- Main form -->
          <form id="main-form">
            <input type="email" name="email" placeholder="Enter email">
            <input type="password" name="password" placeholder="Enter password">
            <input type="text" id="username" placeholder="Username">
            <input type="text" id="fullname" placeholder="Full Name">
            <input type="tel" id="phone" name="phone">
            <textarea name="message" placeholder="Your message"></textarea>
            <button type="submit">Submit</button>
          </form>

          <!-- Dual forms for testing form scoping -->
          <form id="login-form">
            <h2>Login</h2>
            <input type="email" name="email" placeholder="Login Email">
            <input type="password" name="password" placeholder="Login Password">
            <button type="submit">Login</button>
          </form>

          <form id="registration-form">
            <h2>Register</h2>
            <input type="email" name="email" placeholder="Registration Email">
            <input type="password" name="password" placeholder="Registration Password">
            <input type="text" name="username" placeholder="Choose Username">
            <button type="submit">Register</button>
          </form>

          <!-- Contact form -->
          <form id="contact-form">
            <h2>Contact Form</h2>
            <input type="text" name="name" placeholder="Your Name">
            <input type="email" name="email" placeholder="Your Email">
            <input type="text" name="subject" placeholder="Subject">
            <textarea name="message" placeholder="Your Message"></textarea>
            <button type="submit">Send</button>
          </form>
        </body>
        </html>
      `
      const { output } = runCommandWithPort(
        `${CLI} tabs new --url "data:text/html,${encodeURIComponent(html)}"`,
        15000
      )
      testTabId = extractTabId(output)
    }
  })

  describe('basic multi-field fill', () => {
    it('should fill multiple fields by name=value pairs', async () => {
      const { output, exitCode } = runCommandWithPort(
        `${CLI} fill "email=test@example.com" "password=secret123" --tab-id ${testTabId}`
      )

      expect(exitCode).toBe(0)
      expect(output).toContain('Filled')

      // Verify both fields were filled
      const { output: emailValue } = runCommandWithPort(
        `${CLI} eval "document.querySelector('[name=email]').value" --tab-id ${testTabId}`,
        12000
      )
      expect(emailValue).toContain('test@example.com')

      const { output: passwordValue } = runCommandWithPort(
        `${CLI} eval "document.querySelector('[name=password]').value" --tab-id ${testTabId}`,
        12000
      )
      expect(passwordValue).toContain('secret123')
    })

    it('should fill fields by id=value pairs', async () => {
      const { output, exitCode } = runCommandWithPort(
        `${CLI} fill "username=johndoe" "fullname=John Doe" --tab-id ${testTabId}`
      )

      expect(exitCode).toBe(0)

      // Verify fields filled by id
      const { output: usernameValue } = runCommandWithPort(
        `${CLI} eval "document.getElementById('username').value" --tab-id ${testTabId}`
      )
      expect(usernameValue).toContain('johndoe')

      const { output: fullnameValue } = runCommandWithPort(
        `${CLI} eval "document.getElementById('fullname').value" --tab-id ${testTabId}`
      )
      expect(fullnameValue).toContain('John Doe')
    })

    it('should fill fields by placeholder=value pairs', async () => {
      const { output, exitCode } = runCommandWithPort(
        `${CLI} fill "Your Name=Alice Smith" "Subject=Hello" --tab-id ${testTabId}`
      )

      expect(exitCode).toBe(0)

      // Verify fields filled by placeholder
      const { output: nameValue } = runCommandWithPort(
        `${CLI} eval "document.querySelector('[placeholder=\\"Your Name\\"]').value" --tab-id ${testTabId}`
      )
      expect(nameValue).toContain('Alice Smith')

      const { output: subjectValue } = runCommandWithPort(
        `${CLI} eval "document.querySelector('[placeholder=Subject]').value" --tab-id ${testTabId}`
      )
      expect(subjectValue).toContain('Hello')
    })

    it('should fill fields by label=value pairs', async () => {
      const { output, exitCode } = runCommandWithPort(
        `${CLI} fill "Username=testuser" "Full Name=Test User" "Phone=123-456-7890" --tab-id ${testTabId}`
      )

      expect(exitCode).toBe(0)

      // Verify fields filled by label
      const { output: usernameValue } = runCommandWithPort(
        `${CLI} eval "document.getElementById('username').value" --tab-id ${testTabId}`
      )
      expect(usernameValue).toContain('testuser')

      const { output: phoneValue } = runCommandWithPort(
        `${CLI} eval "document.getElementById('phone').value" --tab-id ${testTabId}`
      )
      expect(phoneValue).toContain('123-456-7890')
    })
  })

  describe('mixed identifier types', () => {
    it('should handle mix of name, id, and placeholder', async () => {
      const { output, exitCode } = runCommandWithPort(
        `${CLI} fill "email=mixed@test.com" "username=mixeduser" "Subject=Mixed Test" --tab-id ${testTabId}`
      )

      expect(exitCode).toBe(0)

      // All three should be filled
      const values = runCommandWithPort(
        `${CLI} eval "JSON.stringify({email: document.querySelector('[name=email]').value, username: document.getElementById('username').value, subject: document.querySelector('[name=subject]').value})" --tab-id ${testTabId}`
      )

      expect(values.output).toContain('mixed@test.com')
      expect(values.output).toContain('mixeduser')
      expect(values.output).toContain('Mixed Test')
    })
  })

  describe('form disambiguation', () => {
    it('should fill fields in specific form when multiple forms have same field names', async () => {
      // Both login and registration forms have 'email' field
      const { output, exitCode } = runCommandWithPort(
        `${CLI} fill "#registration-form email=reg@example.com" "#registration-form password=regpass123" --tab-id ${testTabId}`
      )

      expect(exitCode).toBe(0)

      // Verify registration form email was filled, not login form
      const { output: regEmail } = runCommandWithPort(
        `${CLI} eval "document.querySelector('#registration-form [name=email]').value" --tab-id ${testTabId}`
      )
      expect(regEmail).toContain('reg@example.com')

      // Login form email should be empty
      const { output: loginEmail } = runCommandWithPort(
        `${CLI} eval "document.querySelector('#login-form [name=email]').value" --tab-id ${testTabId}`
      )
      expect(loginEmail).not.toContain('reg@example.com')
    })

    it('should support --form flag to scope fills', async () => {
      const { output, exitCode } = runCommandWithPort(
        `${CLI} fill "email=scoped@test.com" --form "registration-form" --tab-id ${testTabId}`
      )

      expect(exitCode).toBe(0)

      // Should only fill in registration form
      const { output: regEmail } = runCommandWithPort(
        `${CLI} eval "document.querySelector('#registration-form [name=email]').value" --tab-id ${testTabId}`
      )
      expect(regEmail).toContain('scoped@test.com')
    })
  })

  describe('value types', () => {
    it('should handle values with spaces', async () => {
      const { output, exitCode } = runCommandWithPort(
        `${CLI} fill "fullname=John William Doe" "message=This is a test message with spaces" --tab-id ${testTabId}`
      )

      expect(exitCode).toBe(0)

      const { output: fullnameValue } = runCommandWithPort(
        `${CLI} eval "document.getElementById('fullname').value" --tab-id ${testTabId}`
      )
      expect(fullnameValue).toContain('John William Doe')

      const { output: messageValue } = runCommandWithPort(
        `${CLI} eval "document.querySelector('[name=message]').value" --tab-id ${testTabId}`
      )
      expect(messageValue).toContain('This is a test message with spaces')
    })

    it('should handle special characters in values', async () => {
      const { output, exitCode } = runCommandWithPort(
        `${CLI} fill "email=test+special@example.com" "password=P@ssw0rd!" --tab-id ${testTabId}`
      )

      expect(exitCode).toBe(0)

      const { output: emailValue } = runCommandWithPort(
        `${CLI} eval "document.querySelector('[name=email]').value" --tab-id ${testTabId}`
      )
      expect(emailValue).toContain('test+special@example.com')

      const { output: passwordValue } = runCommandWithPort(
        `${CLI} eval "document.querySelector('[name=password]').value" --tab-id ${testTabId}`
      )
      expect(passwordValue).toContain('P@ssw0rd!')
    })

    it('should handle empty values to clear fields', async () => {
      // First fill some fields
      runCommandWithPort(
        `${CLI} fill "email=initial@test.com" --tab-id ${testTabId}`
      )

      // Then clear them with empty value
      const { output, exitCode } = runCommandWithPort(
        `${CLI} fill "email=" --tab-id ${testTabId}`
      )

      expect(exitCode).toBe(0)

      const { output: emailValue } = runCommandWithPort(
        `${CLI} eval "document.querySelector('[name=email]').value" --tab-id ${testTabId} --quiet`
      )
      expect(emailValue.trim()).toBe('')
    })
  })

  describe('error handling', () => {
    it('should report which fields could not be filled', async () => {
      const { output, exitCode } = runCommandWithPort(
        `${CLI} fill "nonexistent=value" "email=test@test.com" "alsobad=value" --tab-id ${testTabId}`
      )

      // Should succeed partially
      expect(exitCode).toBe(0)

      // Should report unfilled fields
      expect(output).toContain('not found')
      expect(output).toContain('nonexistent')
      expect(output).toContain('alsobad')

      // But should fill the valid field
      const { output: emailValue } = runCommandWithPort(
        `${CLI} eval "document.querySelector('[name=email]').value" --tab-id ${testTabId}`
      )
      expect(emailValue).toContain('test@test.com')
    })

    it('should provide suggestions when field not found', async () => {
      const { output } = runCommandWithPort(
        `${CLI} fill "emial=typo@test.com" --tab-id ${testTabId}`
      )

      // Should suggest similar field names
      expect(output.toLowerCase()).toMatch(/did you mean|similar|email/)
    })

    it('should handle malformed input gracefully', async () => {
      const { output, exitCode } = runCommandWithPort(
        `${CLI} fill "noequals" "email=valid@test.com" --tab-id ${testTabId}`
      )

      // Should skip malformed and process valid ones
      expect(output).toContain('invalid format')
      expect(output).toContain('noequals')

      // Valid field should still be filled
      const { output: emailValue } = runCommandWithPort(
        `${CLI} eval "document.querySelector('[name=email]').value" --tab-id ${testTabId}`
      )
      expect(emailValue).toContain('valid@test.com')
    })
  })

  describe('output feedback', () => {
    it('should report summary of filled fields', async () => {
      const { output } = runCommandWithPort(
        `${CLI} fill "email=test@test.com" "password=pass" "username=user" --tab-id ${testTabId}`
      )

      expect(output).toMatch(/filled.*3.*field|3.*fields.*filled/)
      expect(output).toContain('email')
      expect(output).toContain('password')
      expect(output).toContain('username')
    })

    it('should support --quiet flag for minimal output', async () => {
      const { output } = runCommandWithPort(
        `${CLI} fill "email=test@test.com" "password=pass" --quiet --tab-id ${testTabId}`
      )

      // Minimal output
      expect(output.length).toBeLessThan(50)
    })

    it('should support --json flag for structured output', async () => {
      const { output, exitCode } = runCommandWithPort(
        `${CLI} fill "email=test@test.com" "username=testuser" --json --tab-id ${testTabId}`
      )

      expect(exitCode).toBe(0)

      const parsed = JSON.parse(output)
      expect(parsed.filled).toBeDefined()
      expect(parsed.filled).toContain('email')
      expect(parsed.filled).toContain('username')
      expect(parsed.failed).toBeDefined()
    })
  })

  describe('integration with other commands', () => {
    it('should work with snapshot to discover field names', async () => {
      // Get field info from snapshot
      const { output: snapshotOutput } = runCommandWithPort(
        `${CLI} snapshot --detailed --tab-id ${testTabId}`
      )

      // Extract field names from snapshot output
      expect(snapshotOutput).toContain('email')
      expect(snapshotOutput).toContain('password')

      // Use those names to fill
      const { exitCode } = runCommandWithPort(
        `${CLI} fill "email=discovered@test.com" --tab-id ${testTabId}`
      )

      expect(exitCode).toBe(0)
    })

    it('should work after navigation', async () => {
      // Navigate and immediately fill
      runCommandWithPort(
        `${CLI} navigate "data:text/html,<form><input name='field1'><input name='field2'></form>" --tab-id ${testTabId}`
      )

      const { output, exitCode } = runCommandWithPort(
        `${CLI} fill "field1=value1" "field2=value2" --tab-id ${testTabId}`
      )

      expect(exitCode).toBe(0)
      expect(output).toContain('field1')
      expect(output).toContain('field2')
    })
  })
})
