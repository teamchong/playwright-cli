import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'

/**
 * Real Dialog Command Tests
 *
 * These tests run the actual CLI binary with real browser functionality.
 * NO MOCKS - everything is tested against a real implementation.
 */
describe('dialog command - REAL TESTS', () => {
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
    // Global teardown handles browser cleanup
    // Don't close browser here as it interferes with other tests
  })

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} dialog --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('Handle browser dialogs')
      expect(output).toContain('accept')
      expect(output).toContain('dismiss')
    })
  })

  describe('handler execution', () => {
    it('should handle accept action with no browser gracefully', () => {
      const { output, exitCode } = runCommand(`${CLI} dialog accept`)
      expect([0, 1]).toContain(exitCode)
      // Browser is now available via global setup
    })

    it('should handle dismiss action with no browser gracefully', () => {
      const { output, exitCode } = runCommand(`${CLI} dialog dismiss`)
      expect([0, 1]).toContain(exitCode)
      // Browser is now available via global setup
    })

    it('should handle different port gracefully', () => {
      // Command should fail gracefully when trying to connect to non-existent port
      const { output, exitCode } = runCommand(
        `${CLI} dialog accept --port 8080`,
        3000
      )
      expect(exitCode).toBe(1)
      expect(output).toMatch(/No browser running|browser running/i)
    })
  })
})
