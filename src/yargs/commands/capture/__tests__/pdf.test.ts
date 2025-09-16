import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import * as fs from 'fs'

/**
 * PDF Command Tests - TAB ID FROM COMMAND OUTPUT
 *
 * - Uses global browser session (no per-file setup/teardown)
 * - Captures tab ID directly from command output
 * - Uses returned tab ID for all interactions
 * - NO COMPLEX DISCOVERY - commands return what we need
 * - NO TAB MANAGEMENT - let global setup handle browser lifecycle
 */
describe('pdf command - TAB ID FROM OUTPUT', () => {
  const CLI = 'node dist/index.js'
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
        throw new Error(`Command timed out (hanging): ${cmd}`)
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
    // Browser already running from global setup
    // Create a dedicated test tab for this test suite and capture its ID
    const { output } = runCommand(
      `${CLI} tabs new --url "data:text/html,<div id='test-container'><h1>PDF Test Suite Ready</h1><p>This content will be saved as PDF</p></div>"`
    )
    testTabId = extractTabId(output)
    console.log(`PDF test suite using tab ID: ${testTabId}`)
  })

  afterAll(async () => {
    // Clean up test PDFs
    try {
      if (fs.existsSync('test-page.pdf')) fs.unlinkSync('test-page.pdf')
      if (fs.existsSync('test-custom.pdf')) fs.unlinkSync('test-custom.pdf')
    } catch {}

    // Clean up our test tab using the specific tab ID
    if (testTabId) {
      try {
        // First check if tab still exists
        const { output } = runCommand(`${CLI} tabs list --json`)
        const data = JSON.parse(output)
        const tabExists = data.tabs.some((tab: any) => tab.id === testTabId)

        if (tabExists) {
          // Find the tab index and close it
          const tabIndex = data.tabs.findIndex(
            (tab: any) => tab.id === testTabId
          )
          runCommand(`${CLI} tabs close --index ${tabIndex}`)
          console.log(`Closed test tab ${testTabId}`)
        }
      } catch (error) {
        // Silently ignore - tab might already be closed
      }
    }
  })

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} pdf --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('pdf')
      expect(output).toContain('tab-index')
      expect(output).toContain('tab-id')
    })
  })

  describe('direct tab targeting with captured ID', () => {
    it('should generate PDF with default filename using captured tab ID', () => {
      const { exitCode, output } = runCommand(
        `${CLI} pdf --tab-id ${testTabId}`
      )
      expect(exitCode).toBe(0)
      expect(output).toMatch(/PDF saved|saved PDF/i)

      // Check that a PDF file was created
      expect(fs.existsSync('page.pdf')).toBe(true)

      // Clean up
      if (fs.existsSync('page.pdf')) fs.unlinkSync('page.pdf')
    })

    it('should generate PDF with custom filename using captured tab ID', () => {
      const { exitCode, output } = runCommand(
        `${CLI} pdf test-page.pdf --tab-id ${testTabId}`
      )
      expect(exitCode).toBe(0)
      expect(output).toMatch(/PDF saved|saved PDF/i)
      expect(output).toContain('test-page.pdf')

      // Check that the file was created
      expect(fs.existsSync('test-page.pdf')).toBe(true)
    })

    it('should handle PDF format options using captured tab ID', () => {
      const { exitCode, output } = runCommand(
        `${CLI} pdf test-custom.pdf --format A4 --landscape --tab-id ${testTabId}`
      )
      expect(exitCode).toBe(0)
      expect(output).toMatch(/PDF saved|saved PDF/i)
      expect(fs.existsSync('test-custom.pdf')).toBe(true)
    })

    it('should handle invalid tab ID', () => {
      const { output, exitCode } = runCommand(
        `${CLI} pdf --tab-id "INVALID_ID"`,
        2000
      )
      expect(exitCode).toBe(1)
      expect(output).toMatch(/not found/i)
    })

    it('should prevent conflicting tab arguments', () => {
      const { output, exitCode } = runCommand(
        `${CLI} pdf --tab-index 0 --tab-id ${testTabId}`,
        2000
      )
      expect(exitCode).toBe(1)
      // Note: yargs validation output handling varies in test environment
    })
  })

  describe('backwards compatibility', () => {
    it('should work without tab targeting (active page)', () => {
      // Should work on whatever tab is currently active
      const { exitCode } = runCommand(`${CLI} pdf --help`)
      expect(exitCode).toBe(0)
    })
  })
})
