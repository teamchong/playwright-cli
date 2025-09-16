import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'

describe('open command - REAL INTEGRATION TEST', () => {
  const CLI_PATH = path.join(process.cwd(), 'playwright')

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
    const output = execSync(`${CLI_PATH} open https://example.com`, {
      encoding: 'utf8',
    })

    // Check for actual output messages
    expect(output).toContain('Navigated to')
    expect(output).toContain('example.com')

    // Verify browser is actually running by listing pages
    const listOutput = execSync(`${CLI_PATH} list`, { encoding: 'utf8' })
    expect(listOutput).toContain('example.com')
  }, 30000)

  it('should connect to existing browser session', async () => {
    // Browser should already be open from previous test
    const output = execSync(`${CLI_PATH} open --new-tab https://google.com`, {
      encoding: 'utf8',
    })

    // Check that it navigated (meaning it connected to existing browser)
    expect(output).toContain('Opened new tab')
    expect(output).toContain('google.com')

    // Verify both pages exist
    const listOutput = execSync(`${CLI_PATH} list`, { encoding: 'utf8' })
    expect(listOutput).toContain('google.com')
    expect(listOutput).toContain('example.com')
  }, 30000)

  it('should handle --new-tab flag', async () => {
    const output = execSync(`${CLI_PATH} open --new-tab https://github.com`, {
      encoding: 'utf8',
    })

    // Should open in new tab
    expect(output).toContain('Opened new tab')
    expect(output).toContain('github.com')

    // Verify all three pages exist
    const listOutput = execSync(`${CLI_PATH} list`, { encoding: 'utf8' })
    expect(listOutput).toContain('example.com')
    expect(listOutput).toContain('google.com')
    expect(listOutput).toContain('github.com')
  }, 30000)

  it('should handle missing URL gracefully', () => {
    const output = execSync(`${CLI_PATH} open`, {
      encoding: 'utf8',
    })

    // Should still connect to browser
    expect(output).toContain('Browser connected')
  })

  it('should handle invalid URLs gracefully', () => {
    let errorOccurred = false
    let errorMessage = ''
    try {
      execSync(`${CLI_PATH} open not-a-valid-url`, {
        encoding: 'utf8',
        stdio: 'pipe',
      })
    } catch (error: any) {
      errorOccurred = true
      errorMessage = error.stdout || error.stderr || ''
      // Check for error indication
      expect(errorMessage).toContain('Failed to open')
    }

    // Should have errored
    expect(errorOccurred).toBe(true)
  })

  it('should handle connection refused errors gracefully', () => {
    let errorOccurred = false
    let errorMessage = ''
    try {
      execSync(`${CLI_PATH} open http://localhost:32838`, {
        encoding: 'utf8',
        stdio: 'pipe',
      })
    } catch (error: any) {
      errorOccurred = true
      errorMessage = error.stdout || error.stderr || ''
      // Should show a user-friendly error message instead of throwing
      expect(errorMessage).toContain('Connection failed')
      expect(errorMessage).not.toContain('Error: Browser connection failed')
    }

    // Should handle gracefully, not throw unhandled errors
    expect(errorOccurred).toBe(true)
  })
})
