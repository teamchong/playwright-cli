import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'

/**
 * Real Open Command Tests
 *
 * These tests run the actual CLI binary with real browser functionality.
 * NO MOCKS - everything is tested against a real implementation.
 */
describe('open command - REAL TESTS', () => {
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
        stdio: ['pipe', 'pipe', 'pipe'],
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
      const { output, exitCode } = runCommand(`${CLI} open --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('open')
      expect(output).toContain('open')
    })
  })

  describe('handler execution', () => {
    it('should work with global browser session', () => {
      const { output, exitCode } = runCommand(`${CLI} open`)
      // Open command launches browser automatically and succeeds
      expect(exitCode).toBe(0)
    })

    it('should handle different port gracefully', () => {
      // Open command should fail gracefully when no browser on specified port
      const { output, exitCode } = runCommand(`${CLI} open --port 8080`)
      expect(exitCode).toBe(1)
      expect(output).toMatch(/No browser running|Browser connection failed/i)
    })
  })
})
