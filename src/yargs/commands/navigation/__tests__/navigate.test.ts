import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';

/**
 * Real Navigate Command Tests
 * 
 * These tests run the actual CLI binary with real browser functionality.
 * NO MOCKS - everything is tested against a real implementation.
 */
describe('navigate command - REAL TESTS', () => {
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
  });

  afterAll(async () => {
    // Clean up
    try {
      runCommand(`${CLI} close`, 2000);
    } catch {}
  });

  describe('argument validation', () => {
    it('should require URL argument', () => {
      const result = runCommand(`${CLI} navigate`);
      expect(result.exitCode).toBe(1);
      // Should show help/error output when no URL provided
      expect(result.output.length).toBeGreaterThan(0);
    });

    it('should validate URL format', () => {
      const result = runCommand(`${CLI} navigate invalid-url`);
      expect(result.exitCode).toBe(1);
      expect(result.output).toMatch(/Invalid URL|URL/);
    });
  });

  describe('real browser navigation', () => {
    beforeAll(() => {
      // Ensure browser is running
      runCommand(`${CLI} open https://example.com`);
    });

    it('should navigate to valid URL', () => {
      const result = runCommand(`${CLI} navigate https://google.com`);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('Successfully navigated');
      expect(result.output).toContain('google.com');
    });

    it('should handle navigation timeout', () => {
      const result = runCommand(`${CLI} navigate https://example.com --timeout 1000`);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('Successfully navigated');
    });

    it('should accept port option', () => {
      const result = runCommand(`${CLI} navigate https://example.com --port 9222`);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('Successfully navigated');
    });

    it('should handle wait-until option', () => {
      const result = runCommand(`${CLI} navigate https://example.com --wait-until load`);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('Successfully navigated');
    });
  });

  describe('error handling', () => {
    it('should auto-launch browser when not running', () => {
      // Close browser first
      runCommand(`${CLI} close`);
      
      const result = runCommand(`${CLI} navigate https://example.com`);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('Successfully navigated');
    });
  });
});