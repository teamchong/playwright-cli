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
 * LLM-Friendly Workflow Integration Tests
 * 
 * Tests that validate all the LLM enhancements work together
 * in realistic end-to-end scenarios that an LLM would perform.
 */
describe('LLM-friendly workflow integration', () => {
  const CLI = 'node dist/src/index.js'
  let testTabId: string

  function runCommand(
    cmd: string,
    timeout = 10000
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

  function extractRef(output: string, elementText: string): string {
    const pattern = new RegExp(`"${elementText}".*?\\[ref=([a-f0-9]+)\\]`)
    const match = output.match(pattern)
    if (!match) {
      throw new Error(`No ref found for "${elementText}" in output: ${output}`)
    }
    return match[1]
  }

  beforeAll(async () => {
    // Create a comprehensive test page with various form elements
    const html = `
      <html>
        <head><title>LLM Test Page</title></head>
        <body>
          <h1 id="page-title">Welcome to Test Page</h1>
          <div id="status">Ready</div>
          
          <form id="user-form">
            <h2>User Registration</h2>
            <input name="username" type="text" placeholder="Username" required>
            <input name="email" type="email" placeholder="Email Address" required>
            <input name="password" type="password" placeholder="Password" required>
            <select name="country" required>
              <option value="">Select Country</option>
              <option value="us">United States</option>
              <option value="uk">United Kingdom</option>
              <option value="ca">Canada</option>
            </select>
            <button type="submit" onclick="submitForm(event)">Register</button>
          </form>
          
          <div id="actions">
            <button id="clear-btn" onclick="clearForm()">Clear Form</button>
            <button id="status-btn" onclick="updateStatus()">Update Status</button>
            <a href="#info" onclick="showInfo()">Show Info</a>
          </div>
          
          <div id="info" style="display:none;">
            <h3>Information</h3>
            <p>This is additional information that appears when clicked.</p>
          </div>
          
          <script>
            function submitForm(e) {
              e.preventDefault();
              document.getElementById('status').textContent = 'Form Submitted';
              document.getElementById('page-title').textContent = 'Registration Complete';
            }
            
            function clearForm() {
              document.getElementById('user-form').reset();
              document.getElementById('status').textContent = 'Form Cleared';
            }
            
            function updateStatus() {
              document.getElementById('status').textContent = 'Status Updated: ' + new Date().toLocaleTimeString();
            }
            
            function showInfo() {
              document.getElementById('info').style.display = 'block';
              document.getElementById('status').textContent = 'Info Shown';
            }
          </script>
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

  beforeEach(async () => {
    // Reset page state before each test
    runCommand(
      `${CLI} eval "document.getElementById('user-form').reset(); document.getElementById('status').textContent = 'Ready'; document.getElementById('page-title').textContent = 'Welcome to Test Page'; document.getElementById('info').style.display = 'none';" --tab-id ${testTabId}`
    )
  })

  describe('Complete LLM workflow scenarios', () => {
    it('should perform complete form filling workflow using refs', async () => {
      // Step 1: Get context to understand the page
      const { output: contextOutput, exitCode: contextExitCode } = runCommand(
        `${CLI} context --tab-id ${testTabId}`
      )
      
      expect(contextExitCode).toBe(0)
      expect(contextOutput).toContain('LLM Test Page')
      expect(contextOutput).toContain('form')
      expect(contextOutput).toContain('input')
      
      // Step 2: Get snapshot with detailed form information
      const { output: snapshotOutput, exitCode: snapshotExitCode } = runCommand(
        `${CLI} snapshot --detailed --tab-id ${testTabId}`
      )
      
      expect(snapshotExitCode).toBe(0)
      expect(snapshotOutput).toContain('Interactive Elements')
      expect(snapshotOutput).toContain('Detailed Form Information')
      expect(snapshotOutput).toContain('Username')
      expect(snapshotOutput).toContain('required')
      
      // Step 3: Extract refs for form fields
      const usernameRef = extractRef(snapshotOutput, 'Username')
      const emailRef = extractRef(snapshotOutput, 'Email Address')
      const passwordRef = extractRef(snapshotOutput, 'Password')
      
      // Step 4: Fill form using refs
      const { output: fillUsernameOutput, exitCode: fillUsernameExitCode } = runCommand(
        `${CLI} fill --ref ${usernameRef} "testuser123" --tab-id ${testTabId}`
      )
      expect(fillUsernameExitCode).toBe(0)
      expect(fillUsernameOutput).toContain('Filled')
      
      const { output: fillEmailOutput, exitCode: fillEmailExitCode } = runCommand(
        `${CLI} fill --ref ${emailRef} "test@example.com" --tab-id ${testTabId}`
      )
      expect(fillEmailExitCode).toBe(0)
      
      const { output: fillPasswordOutput, exitCode: fillPasswordExitCode } = runCommand(
        `${CLI} fill --ref ${passwordRef} "securepass123" --tab-id ${testTabId}`
      )
      expect(fillPasswordExitCode).toBe(0)
      
      // Step 5: Fill select using text-based selector
      const { output: selectOutput, exitCode: selectExitCode } = runCommand(
        `${CLI} fill "country=us" --tab-id ${testTabId}`
      )
      expect(selectExitCode).toBe(0)
      
      // Step 6: Submit form using text-based selector
      const { output: clickOutput, exitCode: clickExitCode } = runCommand(
        `${CLI} click "Register" --tab-id ${testTabId}`
      )
      expect(clickExitCode).toBe(0)
      
      // Step 7: Verify form submission worked
      const { output: statusOutput } = runCommand(
        `${CLI} eval "document.getElementById('status').textContent" --tab-id ${testTabId}`
      )
      expect(statusOutput).toContain('Form Submitted')
      
      const { output: titleOutput } = runCommand(
        `${CLI} eval "document.getElementById('page-title').textContent" --tab-id ${testTabId}`
      )
      expect(titleOutput).toContain('Registration Complete')
    })

    it('should perform complex interaction workflow using simplified API', async () => {
      // Complex workflow using the simplified exec API
      const script = `
        // Get initial status
        const initialStatus = await text('#status');
        log('Initial status:', initialStatus);
        
        // Fill form fields using simplified helpers
        await fill('[name="username"]', 'apiuser');
        await fill('[name="email"]', 'api@example.com');
        await fill('[name="password"]', 'apipass123');
        await select('[name="country"]', 'ca');
        
        // Update status to show progress
        await click('#status-btn');
        await sleep(100);
        
        // Show additional info
        await click('a[href="#info"]');
        await sleep(100);
        
        // Verify info is visible
        const infoVisible = await isVisible('#info');
        log('Info visible:', infoVisible);
        
        // Submit the form
        await click('button[type="submit"]');
        await sleep(100);
        
        // Get final results
        const finalTitle = await text('#page-title');
        const finalStatus = await text('#status');
        
        return {
          initialStatus,
          infoVisible,
          finalTitle,
          finalStatus
        };
      `
      
      const { output: execOutput, exitCode: execExitCode } = runCommand(
        `${CLI} exec --inline "${script.replace(/"/g, '\\"')}" --simple --json --tab-id ${testTabId}`
      )
      
      expect(execExitCode).toBe(0)
      
      // Parse the JSON result
      const result = JSON.parse(execOutput)
      expect(result.result.initialStatus).toBe('Ready')
      expect(result.result.infoVisible).toBe(true)
      expect(result.result.finalTitle).toContain('Registration Complete')
      expect(result.result.finalStatus).toContain('Info Shown')
    })

    it('should handle multi-field fill enhancement', async () => {
      // Test the enhanced multi-field fill functionality
      const { output: multiFieldOutput, exitCode: multiFieldExitCode } = runCommand(
        `${CLI} fill "username=multiuser" "email=multi@test.com" "password=multipass" --tab-id ${testTabId}`
      )
      
      expect(multiFieldExitCode).toBe(0)
      expect(multiFieldOutput).toContain('Filled')
      
      // Verify all fields were filled
      const { output: usernameValue } = runCommand(
        `${CLI} eval "document.querySelector('[name=username]').value" --tab-id ${testTabId}`
      )
      expect(usernameValue).toContain('multiuser')
      
      const { output: emailValue } = runCommand(
        `${CLI} eval "document.querySelector('[name=email]').value" --tab-id ${testTabId}`
      )
      expect(emailValue).toContain('multi@test.com')
      
      const { output: passwordValue } = runCommand(
        `${CLI} eval "document.querySelector('[name=password]').value" --tab-id ${testTabId}`
      )
      expect(passwordValue).toContain('multipass')
    })

    it('should demonstrate text-based selector fallback capabilities', async () => {
      // Test that text-based selectors work for various element types
      
      // Click button by text
      const { output: clearOutput, exitCode: clearExitCode } = runCommand(
        `${CLI} click "Clear Form" --tab-id ${testTabId}`
      )
      expect(clearExitCode).toBe(0)
      
      // Verify button click worked
      const { output: statusAfterClear } = runCommand(
        `${CLI} eval "document.getElementById('status').textContent" --tab-id ${testTabId}`
      )
      expect(statusAfterClear).toContain('Form Cleared')
      
      // Click link by text
      const { output: linkOutput, exitCode: linkExitCode } = runCommand(
        `${CLI} click "Show Info" --tab-id ${testTabId}`
      )
      expect(linkExitCode).toBe(0)
      
      // Type into input by placeholder text
      const { output: typeOutput, exitCode: typeExitCode } = runCommand(
        `${CLI} type "Username" "textuser" --tab-id ${testTabId}`
      )
      expect(typeExitCode).toBe(0)
      
      // Verify typing worked
      const { output: typedValue } = runCommand(
        `${CLI} eval "document.querySelector('[name=username]').value" --tab-id ${testTabId}`
      )
      expect(typedValue).toContain('textuser')
    })

    it('should provide comprehensive context information', async () => {
      // Fill some form fields first to test form state detection
      runCommand(`${CLI} fill "username=contextuser" "email=context@test.com" --tab-id ${testTabId}`)
      
      // Get detailed context
      const { output: contextOutput, exitCode: contextExitCode } = runCommand(
        `${CLI} context --verbose --tab-id ${testTabId}`
      )
      
      expect(contextExitCode).toBe(0)
      
      // Should show current page info
      expect(contextOutput).toContain('Current Page Context')
      expect(contextOutput).toContain('data:text/html') // URL
      expect(contextOutput).toContain('LLM Test Page') // Title
      
      // Should show interactive elements
      expect(contextOutput).toContain('Interactive Elements')
      expect(contextOutput).toContain('button')
      expect(contextOutput).toContain('input')
      
      // Should show form status
      expect(contextOutput).toContain('Form Status')
      expect(contextOutput).toContain('filled') // Some fields are filled
      expect(contextOutput).toContain('empty')  // Some fields are empty
      
      // Should show navigation info
      expect(contextOutput).toContain('Navigation')
      
      // Verbose mode should show technical details
      expect(contextOutput).toContain('Technical Details')
      expect(contextOutput).toContain('Viewport')
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle invalid refs gracefully', async () => {
      const { output: invalidRefOutput, exitCode: invalidRefExitCode } = runCommand(
        `${CLI} click --ref invalid123 --tab-id ${testTabId}`
      )
      
      expect(invalidRefExitCode).toBe(1)
      expect(invalidRefOutput.toLowerCase()).toContain('ref not found')
    })

    it('should handle invalid selectors gracefully', async () => {
      const { output: invalidSelectorOutput, exitCode: invalidSelectorExitCode } = runCommand(
        `${CLI} click "Non-existent Button" --tab-id ${testTabId}`
      )
      
      expect(invalidSelectorExitCode).toBe(1)
      expect(invalidSelectorOutput.toLowerCase()).toContain('timeout')
    })

    it('should handle simplified API errors gracefully', async () => {
      const script = `
        try {
          await click('non-existent-element');
        } catch (error) {
          log('Caught error:', error.message);
          return { error: 'handled' };
        }
      `
      
      const { output: errorOutput, exitCode: errorExitCode } = runCommand(
        `${CLI} exec --inline "${script.replace(/"/g, '\\"')}" --simple --json --tab-id ${testTabId}`
      )
      
      expect(errorExitCode).toBe(0)
      const result = JSON.parse(errorOutput)
      expect(result.result.error).toBe('handled')
    })
  })

  describe('Performance and reliability', () => {
    it('should handle rapid successive commands', async () => {
      // Test that the CLI can handle multiple rapid commands without issues
      const commands = [
        `${CLI} eval "document.getElementById('status').textContent = 'Test 1'" --tab-id ${testTabId}`,
        `${CLI} eval "document.getElementById('status').textContent = 'Test 2'" --tab-id ${testTabId}`,
        `${CLI} eval "document.getElementById('status').textContent = 'Test 3'" --tab-id ${testTabId}`,
        `${CLI} eval "document.getElementById('status').textContent = 'Final'" --tab-id ${testTabId}`,
      ]
      
      // Execute all commands
      commands.forEach(cmd => {
        const { exitCode } = runCommand(cmd)
        expect(exitCode).toBe(0)
      })
      
      // Verify final state
      const { output: finalOutput } = runCommand(
        `${CLI} eval "document.getElementById('status').textContent" --tab-id ${testTabId}`
      )
      expect(finalOutput).toContain('Final')
    })

    it('should maintain ref consistency across multiple snapshots', async () => {
      // Take initial snapshot
      const { output: snapshot1 } = runCommand(
        `${CLI} snapshot --tab-id ${testTabId}`
      )
      const initialRef = extractRef(snapshot1, 'Username')
      
      // Modify page slightly
      runCommand(
        `${CLI} eval "document.getElementById('status').textContent = 'Modified'" --tab-id ${testTabId}`
      )
      
      // Take another snapshot
      const { output: snapshot2 } = runCommand(
        `${CLI} snapshot --tab-id ${testTabId}`
      )
      const laterRef = extractRef(snapshot2, 'Username')
      
      // Refs should be consistent for the same element
      expect(initialRef).toBe(laterRef)
      
      // Should be able to use the ref from the first snapshot
      const { output: useRefOutput, exitCode: useRefExitCode } = runCommand(
        `${CLI} fill --ref ${initialRef} "consistent" --tab-id ${testTabId}`
      )
      expect(useRefExitCode).toBe(0)
    })
  })
})