import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Real Claude Command Tests
 *
 * These tests run the actual CLI binary with real file system operations.
 * NO MOCKS - everything is tested against a real implementation.
 */
describe('claude command - REAL TESTS', () => {
  const CLI = 'node dist/src/index.js'
  const testClaudeFile = path.join(process.cwd(), 'CLAUDE.md')
  const originalClaudeContent = fs.existsSync(testClaudeFile)
    ? fs.readFileSync(testClaudeFile, 'utf-8')
    : null

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

    // Save original CLAUDE.md if it exists
    if (originalClaudeContent !== null) {
      fs.writeFileSync(testClaudeFile + '.backup', originalClaudeContent)
    }
  }, 30000) // 30 second timeout for build

  afterAll(async () => {
    // Restore original CLAUDE.md
    if (originalClaudeContent !== null) {
      fs.writeFileSync(testClaudeFile, originalClaudeContent)
      if (fs.existsSync(testClaudeFile + '.backup')) {
        fs.unlinkSync(testClaudeFile + '.backup')
      }
    } else if (fs.existsSync(testClaudeFile)) {
      // Remove test file if there wasn't one originally
      fs.unlinkSync(testClaudeFile)
    }
  })

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} claude --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('claude')
      expect(output).toContain('Claude-specific usage instructions')
    })
  })

  describe('handler execution', () => {
    it('should read and output CLAUDE.md when file exists', () => {
      // Create a test CLAUDE.md file
      const testContent = '# Test Claude Instructions\n\nThis is a test file.'
      fs.writeFileSync(testClaudeFile, testContent)

      const { output, exitCode } = runCommand(`${CLI} claude`)
      expect(exitCode).toBe(0)
      expect(output).toContain('# Test Claude Instructions')
      expect(output).toContain('This is a test file.')
    })

    it('should output fallback instructions when CLAUDE.md does not exist', () => {
      // Remove CLAUDE.md if it exists
      if (fs.existsSync(testClaudeFile)) {
        fs.unlinkSync(testClaudeFile)
      }

      const { output, exitCode } = runCommand(`${CLI} claude`)
      expect(exitCode).toBe(0)

      // Check that fallback contains expected content
      expect(output).toContain('# Playwright CLI - Claude Instructions')
      expect(output).toContain('playwright open')
      expect(output).toContain('playwright click')
      expect(output).toContain('playwright screenshot')
      expect(output).toContain('Core Capabilities')
    })

    it('should handle alias command', () => {
      const { output, exitCode } = runCommand(`${CLI} claude-instructions`)
      expect(exitCode).toBe(0)
      // Should work the same as 'claude' command
      if (fs.existsSync(testClaudeFile)) {
        expect(output.length).toBeGreaterThan(0)
      } else {
        expect(output).toContain('# Playwright CLI - Claude Instructions')
      }
    })
  })
})
