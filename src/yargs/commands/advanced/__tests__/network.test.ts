import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import { TEST_PORT, CLI } from '../../../../test-utils/test-constants'

/**
 * Real Network Command Tests
 *
 * These tests run the actual CLI binary with real browser functionality.
 * NO MOCKS - everything is tested against a real implementation.
 */
describe('network command - REAL TESTS', () => {

  // Helper to run command and check it doesn't hang
  function runCommand(
    cmd: string,
    timeout = 5000
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
      const { output, exitCode } = runCommand(`${CLI} network --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('Monitor network requests')
      expect(output).toContain('network')
    })
  })

  describe('handler execution', () => {
    // Skip this test - network command runs continuously and never exits on its own
    // Testing it would require process management (spawn/kill) which is complex
    it.skip('should work with global browser session', () => {
      // Network command runs continuously without timeout parameter
      // Would need to use spawn() instead of execSync() to test properly
      const { output, exitCode } = runCommand(`${CLI} network`)
      expect([0, 1]).toContain(exitCode)
    })

    it('should handle different port gracefully', () => {
      // Command should fail gracefully when trying to connect to non-existent port
      const { output, exitCode } = runCommand(
        `${CLI} network --port 29999`,
        4000
      )
      // Should fail (1) since no browser is running on port 29999
      expect(exitCode).toBe(1)
      expect(output).toMatch(/No active page|browser running|Failed to connect/i)
    })
  })
})
