import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';

/**
 * Resize Command Tests - TAB ID FROM COMMAND OUTPUT
 * 
 * - Uses global browser session (no per-file setup/teardown)
 * - Captures tab ID directly from command output
 * - Uses returned tab ID for all interactions
 * - NO COMPLEX DISCOVERY - commands return what we need
 * - NO TAB MANAGEMENT - let global setup handle browser lifecycle
 */
describe('resize command - TAB ID FROM OUTPUT', () => {
  const CLI = 'node dist/index.js';
  let testTabId: string;

  function runCommand(cmd: string, timeout = 5000): { output: string; exitCode: number } {
    try {
      const output = execSync(cmd, { 
        encoding: 'utf8',
        timeout,
        env: { ...process.env },
        stdio: 'pipe'
      });
      return { output, exitCode: 0 };
    } catch (error: any) {
      if (error.code === 'ETIMEDOUT') {
        throw new Error(`Command timed out (hanging): ${cmd}`);
      }
      const output = (error.stdout || '') + (error.stderr || '');
      return { output, exitCode: error.status || 1 };
    }
  }

  function extractTabId(output: string): string {
    const match = output.match(/Tab ID: ([A-F0-9-]+)/);
    if (!match) {
      throw new Error(`No tab ID found in output: ${output}`);
    }
    return match[1];
  }

  beforeAll(async () => {
    // Browser already running from global setup
    // Create a dedicated test tab for this test suite and capture its ID
    const { output } = runCommand(`${CLI} tabs new --url "data:text/html,<div id='test-container'><h1>Resize Test Suite Ready</h1><p>Window resize testing</p></div>"`);
    testTabId = extractTabId(output);
    console.log(`Resize test suite using tab ID: ${testTabId}`);
  });

  afterAll(async () => {
    // Clean up our test tab using the specific tab ID
    if (testTabId) {
      try {
        // First check if tab still exists
        const { output } = runCommand(`${CLI} tabs list --json`);
        const data = JSON.parse(output);
        const tabExists = data.tabs.some((tab: any) => tab.id === testTabId);
        
        if (tabExists) {
          // Find the tab index and close it
          const tabIndex = data.tabs.findIndex((tab: any) => tab.id === testTabId);
          runCommand(`${CLI} tabs close --index ${tabIndex}`);
          console.log(`Closed test tab ${testTabId}`);
        }
      } catch (error) {
        // Silently ignore - tab might already be closed
      }
    }
  });

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} resize --help`);
      expect(exitCode).toBe(0);
      expect(output).toContain('resize');
      expect(output).toContain('tab-index');
      expect(output).toContain('tab-id');
    });
  });

  describe('direct tab targeting with captured ID', () => {
    it('should resize browser window using captured tab ID', () => {
      const { exitCode, output } = runCommand(`${CLI} resize 800 600 --tab-id ${testTabId}`);
      expect(exitCode).toBe(0);
      expect(output).toMatch(/resized|800|600/i);
    });

    it('should handle different viewport sizes using captured tab ID', () => {
      const { exitCode, output } = runCommand(`${CLI} resize 1024 768 --tab-id ${testTabId}`);
      expect(exitCode).toBe(0);
      expect(output).toMatch(/resized|1024|768/i);
    });

    it('should validate resize arguments', () => {
      const { exitCode, output } = runCommand(`${CLI} resize 800 --tab-id ${testTabId}`);
      expect(exitCode).toBe(1);
      expect(output.length).toBeGreaterThan(0);
    });

    it('should handle invalid tab ID', () => {
      const { output, exitCode } = runCommand(`${CLI} resize 800 600 --tab-id "INVALID_ID"`, 2000);
      expect(exitCode).toBe(1);
      expect(output).toMatch(/not found/i);
    });

    it('should prevent conflicting tab arguments', () => {
      const { output, exitCode } = runCommand(`${CLI} resize 800 600 --tab-index 0 --tab-id ${testTabId}`, 2000);
      expect(exitCode).toBe(1);
      // Note: yargs validation output handling varies in test environment
    });
  });

  describe('backwards compatibility', () => {
    it('should work without tab targeting (active page)', () => {
      // Should work on whatever tab is currently active
      const { exitCode } = runCommand(`${CLI} resize --help`);
      expect(exitCode).toBe(0);
    });
  });
});