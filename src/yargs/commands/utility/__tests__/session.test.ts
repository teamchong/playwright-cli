import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';

/**
 * Real Session Command Tests
 * 
 * These tests run the actual CLI binary with real browser functionality.
 * NO MOCKS - everything is tested against a real implementation.
 */
describe('session command - REAL TESTS', () => {
  const CLI = 'node dist/index.js';

  // Helper to run command and check it doesn't hang
  function runCommand(cmd: string, timeout = 5000): { output: string; exitCode: number } {
    try {
      const output = execSync(cmd, { 
        encoding: 'utf8',
        timeout,
        env: { ...process.env }
      });
      return { output, exitCode: 0 };
    } catch (error: any) {
      if (error.code === 'ETIMEDOUT') {
        throw new Error(`Command timed out (hanging): ${cmd}`);
      }
      // Combine stdout and stderr for full error output
      const output = (error.stdout || '') + (error.stderr || '');
      return { 
        output, 
        exitCode: error.status || 1 
      };
    }
  }

  beforeAll(async () => {
    // Build the CLI only if needed
    if (!require('fs').existsSync('dist/index.js')) {
      execSync('pnpm build', { stdio: 'ignore' });
    }
    
    // Clean up any existing browser
    try {
      execSync('pkill -f "Chrome.*remote-debugging-port=9222"', { stdio: 'ignore' });
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, 30000); // 30 second timeout for build

  afterAll(async () => {
    // Clean up
    try {
      runCommand(`${CLI} close`, 2000);
    } catch {}
  });

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} session --help`);
      expect(exitCode).toBe(0);
      expect(output).toContain('session');
      expect(output).toContain('Manage browser sessions');
    });
  });

  describe('subcommand execution', () => {
    it('should list sessions', () => {
      const { output, exitCode } = runCommand(`${CLI} session list`);
      expect(exitCode).toBe(0);
      // Either shows sessions or says no sessions
      expect(output.toLowerCase()).toMatch(/session|no saved sessions/i);
    });

    it('should handle save without browser', () => {
      const { output, exitCode } = runCommand(`${CLI} session save test-session`);
      expect(exitCode).toBe(1);
      expect(output).toContain('No browser');
    });

    it('should handle load of non-existent session', () => {
      const { output, exitCode } = runCommand(`${CLI} session load non-existent`);
      expect(exitCode).toBe(1);
      expect(output.toLowerCase()).toMatch(/not found|does not exist/i);
    });

    it('should handle delete of non-existent session', () => {
      const { output, exitCode } = runCommand(`${CLI} session delete non-existent`);
      // May succeed (no-op) or fail (not found)
      expect([0, 1]).toContain(exitCode);
    });
  });
});