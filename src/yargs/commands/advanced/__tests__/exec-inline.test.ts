import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

/**
 * Inline Script Execution Tests
 * 
 * Tests the enhanced exec command that can run scripts
 * directly without requiring file creation
 */
describe('inline script execution enhancement', () => {
  const CLI = 'node dist/src/index.js'
  let testTabId: string
  let tempDir: string

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

  beforeAll(async () => {
    // Create temp directory for any file operations
    tempDir = path.join(os.tmpdir(), `playwright-test-${Date.now()}`)
    fs.mkdirSync(tempDir, { recursive: true })

    // Create test page
    const html = `
      <html>
        <head><title>Script Test Page</title></head>
        <body>
          <h1 id="title">Test Page</h1>
          <div id="output"></div>
          <button id="btn" onclick="document.getElementById('output').textContent='Button clicked'">Click Me</button>
          <input id="input" type="text" placeholder="Type here">
          <div id="counter">0</div>
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
    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  beforeEach(async () => {
    // Reset page state
    runCommand(
      `${CLI} eval "document.getElementById('output').textContent = ''; document.getElementById('counter').textContent = '0'; document.getElementById('input').value = ''" --tab-id ${testTabId}`
    )
  })

  describe('basic inline execution', () => {
    it('should execute inline JavaScript with --inline flag', async () => {
      const script = `
        const title = await page.title();
        console.log('Title:', title);
        return title;
      `
      
      const { output, exitCode } = runCommand(
        `${CLI} exec --inline "${script}" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      expect(output).toContain('Title:')
      expect(output).toContain('Script Test Page')
    })

    it('should execute single-line scripts', async () => {
      const { output, exitCode } = runCommand(
        `${CLI} exec --inline "await page.evaluate(() => document.getElementById('title').textContent)" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      expect(output).toContain('Test Page')
    })

    it('should execute multi-line scripts', async () => {
      const script = `
        await page.click('#btn');
        const result = await page.evaluate(() => document.getElementById('output').textContent);
        console.log('Result:', result);
        return result;
      `
      
      const { output, exitCode } = runCommand(
        `${CLI} exec --inline "${script}" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      expect(output).toContain('Result:')
      expect(output).toContain('Button clicked')
    })
  })

  describe('script context and APIs', () => {
    it('should have access to page object', async () => {
      const script = `
        const url = page.url();
        const title = await page.title();
        return { url, title };
      `
      
      const { output, exitCode } = runCommand(
        `${CLI} exec --inline "${script}" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      expect(output).toContain('data:text/html')
      expect(output).toContain('Script Test Page')
    })

    it('should have access to context object', async () => {
      const script = `
        const pages = context.pages();
        return pages.length;
      `
      
      const { output, exitCode } = runCommand(
        `${CLI} exec --inline "${script}" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      expect(output).toMatch(/\d+/)
    })

    it('should support async/await', async () => {
      const script = `
        await page.fill('#input', 'Hello');
        await page.waitForTimeout(100);
        const value = await page.evaluate(() => document.getElementById('input').value);
        return value;
      `
      
      const { output, exitCode } = runCommand(
        `${CLI} exec --inline "${script}" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      expect(output).toContain('Hello')
    })

    it('should support console.log output', async () => {
      const script = `
        console.log('Starting script');
        await page.click('#btn');
        console.log('Button clicked');
        console.log('Script complete');
      `
      
      const { output, exitCode } = runCommand(
        `${CLI} exec --inline "${script}" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      expect(output).toContain('Starting script')
      expect(output).toContain('Button clicked')
      expect(output).toContain('Script complete')
    })
  })

  describe('complex scripts', () => {
    it('should handle loops and control flow', async () => {
      const script = `
        for (let i = 0; i < 3; i++) {
          await page.click('#btn');
          await page.evaluate((count) => {
            document.getElementById('counter').textContent = count;
          }, i + 1);
        }
        const final = await page.evaluate(() => document.getElementById('counter').textContent);
        return final;
      `
      
      const { output, exitCode } = runCommand(
        `${CLI} exec --inline "${script}" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      expect(output).toContain('3')
    })

    it('should handle error handling in scripts', async () => {
      const script = `
        try {
          await page.click('#nonexistent');
        } catch (error) {
          console.log('Expected error:', error.message);
          await page.click('#btn');
          return 'Handled error gracefully';
        }
      `
      
      const { output, exitCode } = runCommand(
        `${CLI} exec --inline "${script}" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      expect(output).toContain('Expected error')
      expect(output).toContain('Handled error gracefully')
    })

    it('should support data manipulation', async () => {
      const script = `
        const elements = await page.$$eval('button, input', els => 
          els.map(el => ({ tag: el.tagName, id: el.id }))
        );
        console.log('Found elements:', JSON.stringify(elements));
        return elements.length;
      `
      
      const { output, exitCode } = runCommand(
        `${CLI} exec --inline "${script}" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      expect(output).toContain('Found elements')
      expect(output).toContain('BUTTON')
      expect(output).toContain('INPUT')
    })
  })

  describe('script input methods', () => {
    it('should accept script via stdin', async () => {
      const script = `
        const title = await page.title();
        console.log('Title from stdin:', title);
      `
      
      const { output, exitCode } = runCommand(
        `echo "${script}" | ${CLI} exec --inline - --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      expect(output).toContain('Title from stdin')
    })

    it('should support heredoc syntax', async () => {
      // This tests that multi-line strings work properly
      const command = `${CLI} exec --inline "
        const result = await page.evaluate(() => {
          return {
            title: document.title,
            elementCount: document.querySelectorAll('*').length
          };
        });
        console.log('Page info:', JSON.stringify(result));
        return result;
      " --tab-id ${testTabId}`
      
      const { output, exitCode } = runCommand(command)
      
      expect(exitCode).toBe(0)
      expect(output).toContain('Page info')
      expect(output).toContain('Script Test Page')
    })
  })

  describe('comparison with file-based execution', () => {
    it('should work the same as file-based exec', async () => {
      const script = `
        const title = await page.title();
        return title;
      `
      
      // Write to file
      const scriptFile = path.join(tempDir, 'test-script.js')
      fs.writeFileSync(scriptFile, script)
      
      // Execute via file
      const { output: fileOutput } = runCommand(
        `${CLI} exec "${scriptFile}" --tab-id ${testTabId}`
      )
      
      // Execute inline
      const { output: inlineOutput } = runCommand(
        `${CLI} exec --inline "${script}" --tab-id ${testTabId}`
      )
      
      // Should produce similar results
      expect(fileOutput).toContain('Script Test Page')
      expect(inlineOutput).toContain('Script Test Page')
    })

    it('should prefer inline over file if both provided', async () => {
      const scriptFile = path.join(tempDir, 'file-script.js')
      fs.writeFileSync(scriptFile, 'return "from file";')
      
      const { output } = runCommand(
        `${CLI} exec "${scriptFile}" --inline "return 'from inline';" --tab-id ${testTabId}`
      )
      
      // Should use inline script
      expect(output).toContain('from inline')
      expect(output).not.toContain('from file')
    })
  })

  describe('error handling', () => {
    it('should report syntax errors clearly', async () => {
      const script = `
        await page.click('#btn'  // Missing closing parenthesis
        return 'done';
      `
      
      const { output, exitCode } = runCommand(
        `${CLI} exec --inline "${script}" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(1)
      expect(output.toLowerCase()).toContain('syntax')
    })

    it('should report runtime errors with context', async () => {
      const script = `
        await page.click('#definitely-does-not-exist');
      `
      
      const { output, exitCode } = runCommand(
        `${CLI} exec --inline "${script}" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(1)
      expect(output).toContain('not')
      expect(output).toContain('exist')
    })

    it('should handle timeout gracefully', async () => {
      const script = `
        await page.waitForSelector('#never-appears', { timeout: 1000 });
      `
      
      const { output, exitCode } = runCommand(
        `${CLI} exec --inline "${script}" --tab-id ${testTabId}`,
        5000
      )
      
      expect(exitCode).toBe(1)
      expect(output.toLowerCase()).toContain('timeout')
    })
  })

  describe('output formatting', () => {
    it('should format returned values nicely', async () => {
      const script = `
        return {
          string: 'hello',
          number: 42,
          array: [1, 2, 3],
          object: { key: 'value' }
        };
      `
      
      const { output, exitCode } = runCommand(
        `${CLI} exec --inline "${script}" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      expect(output).toContain('hello')
      expect(output).toContain('42')
      expect(output).toContain('[1, 2, 3]')
      expect(output).toContain('key')
      expect(output).toContain('value')
    })

    it('should support --json output flag', async () => {
      const script = `
        return { success: true, data: 'test' };
      `
      
      const { output, exitCode } = runCommand(
        `${CLI} exec --inline "${script}" --json --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      const parsed = JSON.parse(output)
      expect(parsed.result).toBeDefined()
      expect(parsed.result.success).toBe(true)
      expect(parsed.result.data).toBe('test')
    })

    it('should support --quiet flag', async () => {
      const script = `
        console.log('This is verbose output');
        return 'result';
      `
      
      const { output } = runCommand(
        `${CLI} exec --inline "${script}" --quiet --tab-id ${testTabId}`
      )
      
      // Should only show result, not console logs
      expect(output).toContain('result')
      expect(output).not.toContain('verbose output')
    })
  })

  describe('practical LLM scenarios', () => {
    it('should enable multi-step automation without files', async () => {
      const script = `
        // Navigate to a form
        await page.evaluate(() => {
          document.body.innerHTML = \`
            <form id="test-form">
              <input name="username" placeholder="Username">
              <input name="email" placeholder="Email">
              <button type="submit">Submit</button>
            </form>
          \`;
        });
        
        // Fill the form
        await page.fill('[name="username"]', 'testuser');
        await page.fill('[name="email"]', 'test@example.com');
        
        // Get form data
        const formData = await page.evaluate(() => {
          const form = document.getElementById('test-form');
          const data = {};
          form.querySelectorAll('input').forEach(input => {
            data[input.name] = input.value;
          });
          return data;
        });
        
        console.log('Form filled with:', JSON.stringify(formData));
        return formData;
      `
      
      const { output, exitCode } = runCommand(
        `${CLI} exec --inline "${script}" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      expect(output).toContain('testuser')
      expect(output).toContain('test@example.com')
      expect(output).toContain('Form filled with')
    })

    it('should allow data extraction and processing', async () => {
      const script = `
        // Add some data to page
        await page.evaluate(() => {
          document.body.innerHTML = \`
            <table>
              <tr><td>Item 1</td><td>$10.00</td></tr>
              <tr><td>Item 2</td><td>$20.00</td></tr>
              <tr><td>Item 3</td><td>$30.00</td></tr>
            </table>
          \`;
        });
        
        // Extract and process data
        const prices = await page.$$eval('td:nth-child(2)', cells => 
          cells.map(cell => parseFloat(cell.textContent.replace('$', '')))
        );
        
        const total = prices.reduce((sum, price) => sum + price, 0);
        
        console.log('Prices:', prices);
        console.log('Total:', total);
        
        return { prices, total };
      `
      
      const { output, exitCode } = runCommand(
        `${CLI} exec --inline "${script}" --tab-id ${testTabId}`
      )
      
      expect(exitCode).toBe(0)
      expect(output).toContain('[10, 20, 30]')
      expect(output).toContain('60')
    })
  })
})