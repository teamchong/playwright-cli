import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync, spawn } from 'child_process'

/**
 * Real Codegen Command Tests
 *
 * These tests run the actual CLI binary with real process spawning.
 * NO MOCKS - everything is tested against a real implementation.
 * Note: We test command structure but don't actually launch the interactive Playwright codegen
 * as that would require GUI interaction.
 */
describe('codegen command - REAL TESTS', () => {
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

  // Helper to test if command would spawn correctly without actually launching GUI
  function testSpawnCommand(cmd: string): Promise<boolean> {
    return new Promise(resolve => {
      const child = spawn('sh', ['-c', `${cmd} --help`], {
        timeout: 2000,
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
        // Check if help output contains expected playwright codegen info
        resolve(code === 0 && output.includes('codegen'))
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
      const { output, exitCode } = runCommand(`${CLI} codegen --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('codegen')
      expect(output).toContain('Playwright code generator')
    })
  })

  describe('command validation', () => {
    it('should validate npx playwright is available', async () => {
      // Test that npx playwright is installed and available
      const isAvailable = await testSpawnCommand('npx playwright')
      expect(isAvailable).toBe(true)
    })

    it('should handle help flag correctly', () => {
      // We can't actually launch the GUI, but we can verify the command structure
      const { output, exitCode } = runCommand(`${CLI} codegen --help`)
      expect(exitCode).toBe(0)
      expect(output.toLowerCase()).toMatch(/codegen|generator/i)
    })
  })

  describe('command options', () => {
    it('should accept optional URL parameter', () => {
      const { output, exitCode } = runCommand(`${CLI} codegen --help`)
      expect(exitCode).toBe(0)
      // Help should show URL as optional parameter
      expect(output).toMatch(/\[url\]|URL/i)
    })
  })
})
