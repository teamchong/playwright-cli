import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import { TEST_PORT } from '../../../../test-utils/test-constants'
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
    timeout = 3000
  ): { output: string; exitCode: number } {
    try {
      const output = execSync(cmd, {
        encoding: 'utf8',
        timeout,
        env: { ...process.env, NODE_ENV: undefined },
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
    it('should handle accept action with no dialog gracefully', () => {
      const { output, exitCode } = runCommand(`${CLI} dialog accept --port ${TEST_PORT}`, 5000)
      expect(exitCode).toBe(1)
      expect(output).toMatch(/No dialog appeared|No browser running|browser running/i)
    })

    it('should handle dismiss action with no dialog gracefully', () => {
      const { output, exitCode } = runCommand(`${CLI} dialog dismiss --port ${TEST_PORT}`, 5000)
      expect(exitCode).toBe(1)
      expect(output).toMatch(/No dialog appeared|No browser running|browser running/i)
    })

    it('should handle different port gracefully', () => {
      // Command should fail gracefully when trying to connect to non-existent port
      const { output, exitCode } = runCommand(
        `${CLI} dialog accept --port 18999`,  // Use a definitely unused port
        3000
      )
      expect(exitCode).toBe(1)
      expect(output).toMatch(/No browser running|browser running/i)
    })
  })
})
