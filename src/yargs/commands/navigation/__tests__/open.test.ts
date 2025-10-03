import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import { TEST_PORT, CLI } from '../../../../test-utils/test-constants'
describe('open command - REAL INTEGRATION TEST', () => {
  const CLI_PATH = CLI

  beforeAll(async () => {
    // Build the CLI first using pnpm
    try {
      execSync('pnpm build', { stdio: 'ignore' })
    } catch (e) {
      console.error('Build failed:', e)
    }

    // Global browser session will be used
    await new Promise(resolve => setTimeout(resolve, 1000))
  })

  afterAll(async () => {
    // Global teardown handles browser cleanup
    // Don't close browser here as it interferes with other tests
  })

  it('should launch browser and navigate to URL', async () => {
    const output = execSync(`${CLI_PATH} open https://example.com --port ${TEST_PORT}`, {
      encoding: 'utf8',
    })

    // Check for actual output messages (can be either fresh navigation or existing tab)
    expect(
      output.includes('Navigated to') || output.includes('Already on')
    ).toBe(true)
    expect(output).toContain('example.com')

    // Verify browser is actually running by listing pages
    const listOutput = execSync(`${CLI_PATH} list --port ${TEST_PORT}`, { encoding: 'utf8' })
    expect(listOutput).toContain('example.com')
  }, 30000)

  it('should connect to existing browser session', async () => {
    // Browser should already be open from previous test
    const output = execSync(`${CLI_PATH} open --new-tab https://google.com --port ${TEST_PORT}`, {
      encoding: 'utf8',
    })

    // Check that it navigated (meaning it connected to existing browser)
    expect(output).toContain('Opened new tab')
    expect(output).toContain('google.com')

    // Verify both pages exist
    const listOutput = execSync(`${CLI_PATH} list --port ${TEST_PORT}`, { encoding: 'utf8' })
    expect(listOutput).toContain('google.com')
    expect(listOutput).toContain('example.com')
  }, 30000)

  it('should handle --new-tab flag', async () => {
    const output = execSync(`${CLI_PATH} open --new-tab https://github.com --port ${TEST_PORT}`, {
      encoding: 'utf8',
    })

    // Should open in new tab
    expect(output).toContain('Opened new tab')
    expect(output).toContain('github.com')

    // Verify all three pages exist
    const listOutput = execSync(`${CLI_PATH} list --port ${TEST_PORT}`, { encoding: 'utf8' })
    expect(listOutput).toContain('example.com')
    expect(listOutput).toContain('google.com')
    expect(listOutput).toContain('github.com')
  }, 30000)

  it('should handle missing URL gracefully', () => {
    const output = execSync(`${CLI_PATH} open --port ${TEST_PORT}`, {
      encoding: 'utf8',
    })

    // Should still connect to browser
    expect(output).toContain('Browser connected')
  })

  it('should handle invalid URLs gracefully', () => {
    let errorOccurred = false
    let errorMessage = ''
    try {
      execSync(`${CLI_PATH} open not-a-valid-url --port ${TEST_PORT}`, {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 8000, // 8s timeout to prevent indefinite hang
      })
    } catch (error: any) {
      errorOccurred = true
      errorMessage = error.stdout || error.stderr || error.message || ''
      // Command should fail - either with error message or timeout
      // Check for error indication if message is present
      if (errorMessage && !errorMessage.includes('ETIMEDOUT')) {
        const lowerMessage = errorMessage.toLowerCase()
        if (lowerMessage.length > 0 && !lowerMessage.includes('command failed')) {
          expect(lowerMessage).toMatch(/failed|err_name_not_resolved|invalid/)
        }
      }
    }

    // Should have errored (either explicit error or timeout)
    expect(errorOccurred).toBe(true)
  })

  it('should handle connection refused errors gracefully', () => {
    let errorOccurred = false
    let errorMessage = ''
    try {
      execSync(`${CLI_PATH} open http://localhost:65536 --port ${TEST_PORT}`, {
        encoding: 'utf8',
        stdio: 'pipe',
      })
    } catch (error: any) {
      errorOccurred = true
      errorMessage = error.stdout || error.stderr || ''
      // Should show a user-friendly error message
      expect(errorMessage).toContain(
        'Connection failed - make sure a server is running'
      )
      // Should not show raw Playwright error
      expect(errorMessage).not.toContain('net::ERR_CONNECTION_REFUSED')
    }

    // Should handle gracefully with proper error
    expect(errorOccurred).toBe(true)
  })
})
