import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from 'vitest'
import { execSync } from 'child_process'

/**
 * Backward Compatibility Tests
 * 
 * Ensures that all existing command functionality continues to work
 * exactly as before, despite the new LLM-friendly enhancements.
 */
describe('backward compatibility', () => {
  const CLI = 'node dist/src/index.js'
  let testTabId: string

  function runCommand(
    cmd: string,
    timeout = 8000
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
    // Create a test page similar to what would have been used before enhancements
    const html = `
      <html>
        <head><title>Compatibility Test</title></head>
        <body>
          <button id="test-btn" onclick="this.textContent='Clicked'">Click Me</button>
          <input id="test-input" type="text" placeholder="Test input">
          <a id="test-link" href="#" onclick="this.textContent='Link clicked'; return false;">Test Link</a>
          <form id="test-form">
            <input name="username" type="text">
            <input name="email" type="email">
            <button type="submit" onclick="event.preventDefault(); document.getElementById('form-status').textContent = 'Submitted'">Submit</button>
          </form>
          <div id="form-status"></div>
          <select id="test-select">
            <option value="option1">Option 1</option>
            <option value="option2">Option 2</option>
          </select>
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

  describe('core command functionality remains unchanged', () => {
    it('should handle click command with CSS selectors as before', async () => {
      const { output: clickOutput, exitCode: clickExitCode } = runCommand(
        `${CLI} click "#test-btn" --tab-id ${testTabId}`
      )
      
      expect(clickExitCode).toBe(0)
      expect(clickOutput).toContain('Clicked')
      
      // Verify button was clicked
      const { output: buttonText } = runCommand(
        `${CLI} eval "document.getElementById('test-btn').textContent" --tab-id ${testTabId}`
      )
      expect(buttonText).toContain('Clicked')
    })

    it('should handle type command with CSS selectors as before', async () => {
      const { output: typeOutput, exitCode: typeExitCode } = runCommand(
        `${CLI} type "#test-input" "Hello World" --tab-id ${testTabId}`
      )
      
      expect(typeExitCode).toBe(0)
      expect(typeOutput).toContain('Typed')
      
      // Verify text was typed
      const { output: inputValue } = runCommand(
        `${CLI} eval "document.getElementById('test-input').value" --tab-id ${testTabId}`
      )
      expect(inputValue).toContain('Hello World')
    })

    it('should handle hover command with CSS selectors as before', async () => {
      const { output: hoverOutput, exitCode: hoverExitCode } = runCommand(
        `${CLI} hover "#test-link" --tab-id ${testTabId}`
      )
      
      expect(hoverExitCode).toBe(0)
      expect(hoverOutput).toContain('Hovered')
    })

    it('should handle fill command with CSS selectors as before', async () => {
      const { output: fillOutput, exitCode: fillExitCode } = runCommand(
        `${CLI} fill "#test-input" "Filled text" --tab-id ${testTabId}`
      )
      
      expect(fillExitCode).toBe(0)
      expect(fillOutput).toContain('Filled')
      
      // Verify fill worked
      const { output: inputValue } = runCommand(
        `${CLI} eval "document.getElementById('test-input').value" --tab-id ${testTabId}`
      )
      expect(inputValue).toContain('Filled text')
    })

    it('should handle multi-field fill with CSS selectors as before', async () => {
      const { output: multiOutput, exitCode: multiExitCode } = runCommand(
        `${CLI} fill "[name=username]=testuser" "[name=email]=test@example.com" --tab-id ${testTabId}`
      )
      
      expect(multiExitCode).toBe(0)
      expect(multiOutput).toContain('Filled')
      
      // Verify both fields were filled
      const { output: usernameValue } = runCommand(
        `${CLI} eval "document.querySelector('[name=username]').value" --tab-id ${testTabId}`
      )
      expect(usernameValue).toContain('testuser')
      
      const { output: emailValue } = runCommand(
        `${CLI} eval "document.querySelector('[name=email]').value" --tab-id ${testTabId}`
      )
      expect(emailValue).toContain('test@example.com')
    })

    it('should handle select command with CSS selectors as before', async () => {
      const { output: selectOutput, exitCode: selectExitCode } = runCommand(
        `${CLI} select "#test-select" "option2" --tab-id ${testTabId}`
      )
      
      expect(selectExitCode).toBe(0)
      expect(selectOutput).toContain('Selected')
      
      // Verify selection worked
      const { output: selectedValue } = runCommand(
        `${CLI} eval "document.getElementById('test-select').value" --tab-id ${testTabId}`
      )
      expect(selectedValue).toContain('option2')
    })
  })

  describe('snapshot command backward compatibility', () => {
    it('should maintain default snapshot behavior', async () => {
      const { output: snapshotOutput, exitCode: snapshotExitCode } = runCommand(
        `${CLI} snapshot --tab-id ${testTabId}`
      )
      
      expect(snapshotExitCode).toBe(0)
      expect(snapshotOutput).toContain('Interactive Elements')
      expect(snapshotOutput).toContain('[ref=')
      expect(snapshotOutput).toContain('Found')
      expect(snapshotOutput).toContain('interactive elements')
    })

    it('should maintain --full flag behavior', async () => {
      const { output: fullOutput, exitCode: fullExitCode } = runCommand(
        `${CLI} snapshot --full --tab-id ${testTabId}`
      )
      
      expect(fullExitCode).toBe(0)
      expect(fullOutput).toContain('Full Accessibility Tree')
    })

    it('should maintain --json flag behavior', async () => {
      const { output: jsonOutput, exitCode: jsonExitCode } = runCommand(
        `${CLI} snapshot --json --tab-id ${testTabId}`
      )
      
      expect(jsonExitCode).toBe(0)
      
      // Should be valid JSON
      expect(() => JSON.parse(jsonOutput)).not.toThrow()
      
      const parsed = JSON.parse(jsonOutput)
      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed.length).toBeGreaterThan(0)
      expect(parsed[0]).toHaveProperty('ref')
      expect(parsed[0]).toHaveProperty('role')
    })
  })

  describe('exec command backward compatibility', () => {
    it('should maintain file execution behavior', async () => {
      // Create a temporary script file
      const tempScript = '/tmp/test-script.js'
      require('fs').writeFileSync(tempScript, `
        const title = await page.title();
        console.log('Page title:', title);
        return { success: true, title };
      `)
      
      const { output: execOutput, exitCode: execExitCode } = runCommand(
        `${CLI} exec ${tempScript} --json --tab-id ${testTabId}`
      )
      
      expect(execExitCode).toBe(0)
      expect(execOutput).toContain('Page title:')
      expect(execOutput).toContain('Compatibility Test')
      
      // Should be valid JSON with result
      const result = JSON.parse(execOutput)
      expect(result.result.success).toBe(true)
      expect(result.result.title).toContain('Compatibility Test')
      
      // Clean up
      require('fs').unlinkSync(tempScript)
    })

    it('should maintain standard Playwright API access', async () => {
      const script = `
        // Standard Playwright API should still work
        await page.click('#test-btn');
        const element = await page.locator('#test-btn');
        const text = await element.textContent();
        return { buttonText: text };
      `
      
      // Reset button first
      runCommand(`${CLI} eval "document.getElementById('test-btn').textContent = 'Click Me'" --tab-id ${testTabId}`)
      
      const { output: execOutput, exitCode: execExitCode } = runCommand(
        `${CLI} exec --inline "${script.replace(/"/g, '\\"')}" --json --tab-id ${testTabId}`
      )
      
      expect(execExitCode).toBe(0)
      
      const result = JSON.parse(execOutput)
      expect(result.result.buttonText).toBe('Clicked')
    })
  })

  describe('navigation commands backward compatibility', () => {
    it('should maintain navigate command behavior', async () => {
      const { output: navOutput, exitCode: navExitCode } = runCommand(
        `${CLI} navigate "data:text/html,<h1>Navigated</h1>" --tab-id ${testTabId}`
      )
      
      expect(navExitCode).toBe(0)
      expect(navOutput).toContain('Navigated')
      
      // Verify navigation worked
      const { output: titleOutput } = runCommand(
        `${CLI} eval "document.querySelector('h1').textContent" --tab-id ${testTabId}`
      )
      expect(titleOutput).toContain('Navigated')
      
      // Navigate back to test page
      const testHtml = `<html><head><title>Compatibility Test</title></head><body><button id="test-btn">Click Me</button></body></html>`
      runCommand(`${CLI} navigate "data:text/html,${encodeURIComponent(testHtml)}" --tab-id ${testTabId}`)
    })

    it('should maintain back command behavior', async () => {
      // Navigate to a new page first
      runCommand(`${CLI} navigate "data:text/html,<h1>New Page</h1>" --tab-id ${testTabId}`)
      
      const { output: backOutput, exitCode: backExitCode } = runCommand(
        `${CLI} back --tab-id ${testTabId}`
      )
      
      expect(backExitCode).toBe(0)
      expect(backOutput).toContain('Navigated back')
    })
  })

  describe('tab management backward compatibility', () => {
    it('should maintain tabs command behavior', async () => {
      const { output: tabsOutput, exitCode: tabsExitCode } = runCommand(
        `${CLI} tabs list`
      )
      
      expect(tabsExitCode).toBe(0)
      expect(tabsOutput).toContain('tab')
      expect(tabsOutput).toContain(testTabId.slice(0, 8)) // Should show partial tab ID
    })

    it('should maintain tab creation and closing', async () => {
      // Create new tab
      const { output: newTabOutput, exitCode: newTabExitCode } = runCommand(
        `${CLI} tabs new --url "data:text/html,<h1>New Tab</h1>"`
      )
      
      expect(newTabExitCode).toBe(0)
      const newTabId = extractTabId(newTabOutput)
      
      // Verify tab was created
      const { output: listOutput } = runCommand(`${CLI} tabs list`)
      expect(listOutput).toContain(newTabId.slice(0, 8))
      
      // Close the new tab
      const { output: closeOutput, exitCode: closeExitCode } = runCommand(
        `${CLI} tabs close --tab-id ${newTabId}`
      )
      
      expect(closeExitCode).toBe(0)
      expect(closeOutput).toContain('Closed')
    })
  })

  describe('evaluation commands backward compatibility', () => {
    it('should maintain eval command behavior', async () => {
      const { output: evalOutput, exitCode: evalExitCode } = runCommand(
        `${CLI} eval "document.title" --tab-id ${testTabId}`
      )
      
      expect(evalExitCode).toBe(0)
      expect(evalOutput).toContain('Compatibility Test')
    })

    it('should maintain eval command with complex expressions', async () => {
      const { output: evalOutput, exitCode: evalExitCode } = runCommand(
        `${CLI} eval "Array.from(document.querySelectorAll('button')).length" --tab-id ${testTabId}`
      )
      
      expect(evalExitCode).toBe(0)
      expect(evalOutput).toMatch(/\d+/) // Should contain a number
    })
  })

  describe('command line flag compatibility', () => {
    it('should maintain all existing flags and options', async () => {
      // Test timeout flag
      const { output: timeoutOutput, exitCode: timeoutExitCode } = runCommand(
        `${CLI} click "#test-btn" --timeout 3000 --tab-id ${testTabId}`
      )
      
      expect(timeoutExitCode).toBe(0)
      
      // Test port flag (even though we use default)
      const { output: portOutput, exitCode: portExitCode } = runCommand(
        `${CLI} click "#test-btn" --port 9222 --tab-id ${testTabId}`
      )
      
      expect(portExitCode).toBe(0)
      
      // Test force flag
      const { output: forceOutput, exitCode: forceExitCode } = runCommand(
        `${CLI} click "#test-btn" --force --tab-id ${testTabId}`
      )
      
      expect(forceExitCode).toBe(0)
    })

    it('should maintain tab targeting options', async () => {
      // Test that tab-id still works as before
      const { output: tabIdOutput, exitCode: tabIdExitCode } = runCommand(
        `${CLI} eval "document.title" --tab-id ${testTabId}`
      )
      
      expect(tabIdExitCode).toBe(0)
      expect(tabIdOutput).toContain('Compatibility Test')
    })
  })

  describe('error handling remains consistent', () => {
    it('should maintain existing error message formats', async () => {
      // Test invalid selector error
      const { output: errorOutput, exitCode: errorExitCode } = runCommand(
        `${CLI} click "#non-existent-element" --tab-id ${testTabId}`
      )
      
      expect(errorExitCode).toBe(1)
      expect(errorOutput.toLowerCase()).toContain('timeout')
    })

    it('should maintain invalid command handling', async () => {
      const { output: invalidOutput, exitCode: invalidExitCode } = runCommand(
        `${CLI} invalid-command --tab-id ${testTabId}`
      )
      
      expect(invalidExitCode).toBe(1)
      expect(invalidOutput.toLowerCase()).toContain('unknown')
    })
  })

  describe('output format consistency', () => {
    it('should maintain existing success message formats', async () => {
      const { output: clickOutput } = runCommand(
        `${CLI} click "#test-btn" --tab-id ${testTabId}`
      )
      
      // Should still have recognizable success indicators
      expect(clickOutput).toMatch(/clicked|success|✓/i)
    })

    it('should maintain JSON output format when requested', async () => {
      const { output: jsonOutput } = runCommand(
        `${CLI} snapshot --json --tab-id ${testTabId}`
      )
      
      // Should be parseable JSON array
      const parsed = JSON.parse(jsonOutput)
      expect(Array.isArray(parsed)).toBe(true)
      
      // Should have expected structure
      if (parsed.length > 0) {
        expect(parsed[0]).toHaveProperty('role')
        expect(parsed[0]).toHaveProperty('ref')
      }
    })
  })
})