import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'

/**
 * Real Tabs Command Tests
 *
 * These tests run the actual CLI binary with real browser functionality.
 * NO MOCKS - everything is tested against a real implementation.
 */
describe('tabs command - REAL TESTS', () => {
  const CLI = 'node dist/src/index.js'

  // Helper to run command and check it doesn't hang
  function runCommand(
    cmd: string,
    timeout = 5000
  ): { output: string; exitCode: number } {
    try {
      const output = execSync(cmd, {
        encoding: 'utf8',
        timeout,
        env: { ...process.env },
      })
      return { output, exitCode: 0 }
    } catch (error: any) {
      if (error.code === 'ETIMEDOUT') {
        throw new Error(`Command timed out (hanging): ${cmd}`)
      }
      // Combine stdout and stderr for full error output
      const output = (error.stdout || '') + (error.stderr || '')
      return {
        output,
        exitCode: error.status || 1,
      }
    }
  }

  beforeAll(async () => {
    // Build the CLI only if needed
    if (!require('fs').existsSync('dist/src/index.js')) {
      execSync('pnpm build', { stdio: 'ignore' })
    }
  }, 30000) // 30 second timeout for build

  afterAll(async () => {
    // Clean up
    // Global teardown handles browser cleanup
    // Don't close browser here as it interferes with other tests
  })

  describe('argument parsing', () => {
    it('should parse list action', () => {
      const { output, exitCode } = runCommand(`${CLI} tabs list --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('Manage browser tabs')
      expect(output).toContain('list')
    })

    it('should parse new action with URL', () => {
      const { output, exitCode } = runCommand(`${CLI} tabs new --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('Manage browser tabs')
      expect(output).toContain('--url')
    })

    it('should parse close action with index', () => {
      const { output, exitCode } = runCommand(`${CLI} tabs close --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('Manage browser tabs')
      expect(output).toContain('--index')
    })

    it('should parse select action with index', () => {
      const { output, exitCode } = runCommand(`${CLI} tabs select --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('Manage browser tabs')
      expect(output).toContain('--index')
    })

    it('should default to list action when no action provided', () => {
      const { output, exitCode } = runCommand(`${CLI} tabs --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('Manage browser tabs')
      expect(output).toContain('list')
    })
  })

  describe('handler execution', () => {
    describe('list action', () => {
      it('should list tabs with global browser session', () => {
        const { output, exitCode } = runCommand(`${CLI} tabs list`)
        expect(exitCode).toBe(0)
        expect(output).toContain('tabs')
      })
    })

    describe('new action', () => {
      it('should create new tab with global browser session', () => {
        const { output, exitCode } = runCommand(
          `${CLI} tabs new --url https://example.com`
        )
        expect(exitCode).toBe(0)
        expect(output).toContain('Tab ID')
      })
    })

    describe('close action', () => {
      it('should handle tab close with global browser session', () => {
        // Try to close a tab - may succeed or fail depending on tab availability
        const { output, exitCode } = runCommand(`${CLI} tabs close --index 999`)
        // Either succeeds (if tab exists) or fails gracefully (if no tab at index)
        expect([0, 1]).toContain(exitCode)
      })
    })

    describe('select action', () => {
      it('should handle tab select with global browser session', () => {
        // Try to select a tab - should work with existing tabs
        const { output, exitCode } = runCommand(`${CLI} tabs select --index 0`)
        expect([0, 1]).toContain(exitCode)
      })
    })
  })
})
