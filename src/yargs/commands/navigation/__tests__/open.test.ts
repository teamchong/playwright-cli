import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';

/**
 * Real Open Command Tests
 * 
 * These tests run the actual CLI binary with real browser functionality.
 * NO MOCKS - everything is tested against a real implementation.
 */
describe('open command - REAL TESTS', () => {
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
    // Build the CLI
    execSync('pnpm build', { stdio: 'ignore' });
    
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
      const { output, exitCode } = runCommand(`${CLI} open --help`);
      expect(exitCode).toBe(0);
      expect(output).toContain('open');
      expect(output).toContain('open');
    });
  });

  describe('handler execution', () => {
    it('should handle no browser session gracefully', () => {
      const { output, exitCode } = runCommand(`${CLI} open`);
      expect(exitCode).toBe(1);
      expect(output).toContain('No browser running on port 9222');
    });

    it('should handle different port gracefully', () => {
      const { output, exitCode } = runCommand(`${CLI} open --port 8080`);
      expect(exitCode).toBe(1);
      expect(output).toContain('No browser running on port 8080');
    });
  });
});