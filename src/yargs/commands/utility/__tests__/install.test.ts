import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync, spawn } from 'child_process'

/**
 * Real Install Command Tests
 *
 * These tests run the actual CLI binary with real process spawning.
 * NO MOCKS - everything is tested against a real implementation.
 * Note: We test command structure but don't actually install browsers
 * as that would be time-consuming and modify the system.
 */
describe('install command - REAL TESTS', () => {
  const CLI = 'node dist/index.js'

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

  // Helper to test if npx playwright install is available
  function testInstallCommand(): Promise<boolean> {
    return new Promise(resolve => {
      const child = spawn('sh', ['-c', 'npx playwright install --help'], {
        timeout: 3000,
      })

      let output = ''
      child.stdout?.on('data', data => {
        output += data.toString()
      })

      child.stderr?.on('data', data => {
        output += data.toString()
      })

      child.on('error', () => {
        resolve(false)
      })

      child.on('exit', code => {
        // Check if help output contains expected install info
        resolve(code === 0 && output.includes('install'))
      })
    })
  }

  beforeAll(async () => {
    // Build the CLI only if needed
    if (!require('fs').existsSync('dist/index.js')) {
      execSync('pnpm build', { stdio: 'ignore' })
    }
  }, 30000) // 30 second timeout for build

  afterAll(async () => {
    // Global teardown handles browser cleanup
    // Don't close browser here as it interferes with other tests
  })

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} install --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('install')
      expect(output).toContain('Install browser binaries')
    })
  })

  describe('command validation', () => {
    it('should validate npx playwright install is available', async () => {
      // Test that npx playwright is installed and available
      const isAvailable = await testInstallCommand()
      expect(isAvailable).toBe(true)
    })

    it('should handle help flag correctly', () => {
      const { output, exitCode } = runCommand(`${CLI} install --help`)
      expect(exitCode).toBe(0)
      expect(output.toLowerCase()).toMatch(/install|browser/i)
    })
  })

  describe('command options', () => {
    it('should accept optional browsers parameter', () => {
      const { output, exitCode } = runCommand(`${CLI} install --help`)
      expect(exitCode).toBe(0)
      // Help should show browsers as optional parameter
      expect(output).toMatch(/\[browsers\]|chromium|firefox|webkit/i)
    })
  })
})
