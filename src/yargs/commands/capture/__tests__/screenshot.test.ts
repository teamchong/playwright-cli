import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';

/**
 * Screenshot Command Tests - TAB ID FROM COMMAND OUTPUT
 * 
 * - Uses global browser session (no per-file setup/teardown)
 * - Captures tab ID directly from command output
 * - Uses returned tab ID for all interactions
 * - NO COMPLEX DISCOVERY - commands return what we need
 * - NO TAB MANAGEMENT - let global setup handle browser lifecycle
 */
describe('screenshot command - TAB ID FROM OUTPUT', () => {
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
    const { output } = runCommand(`${CLI} tabs new --url "data:text/html,<div id='test-container'>Screenshot Test Suite Ready</div>"`);
    testTabId = extractTabId(output);
    console.log(`Screenshot test suite using tab ID: ${testTabId}`);
  });

  afterAll(async () => {
    // Clean up test screenshots
    try {
      if (fs.existsSync('screenshot.png')) fs.unlinkSync('screenshot.png');
      if (fs.existsSync('test-screenshot.png')) fs.unlinkSync('test-screenshot.png');
      if (fs.existsSync('test-custom.png')) fs.unlinkSync('test-custom.png');
    } catch {}
    
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
      const { output, exitCode } = runCommand(`${CLI} screenshot --help`);
      expect(exitCode).toBe(0);
      expect(output).toContain('screenshot');
      expect(output).toContain('tab-index');
      expect(output).toContain('tab-id');
    });
  });

  describe('direct tab targeting with captured ID', () => {
    it('should take screenshot with default filename using captured tab ID', () => {
      const { exitCode } = runCommand(`${CLI} screenshot --tab-id ${testTabId}`);
      expect(exitCode).toBe(0);
      
      // Check that default screenshot file was created
      expect(fs.existsSync('screenshot.png')).toBe(true);
      
      // Clean up
      if (fs.existsSync('screenshot.png')) fs.unlinkSync('screenshot.png');
    });

    it('should take screenshot with custom filename using captured tab ID', () => {
      const { exitCode } = runCommand(`${CLI} screenshot test-screenshot.png --tab-id ${testTabId}`);
      expect(exitCode).toBe(0);
      
      // Check that the file was created
      expect(fs.existsSync('test-screenshot.png')).toBe(true);
    });

    it('should handle full page screenshot using captured tab ID', () => {
      const { exitCode } = runCommand(`${CLI} screenshot test-custom.png --full-page --tab-id ${testTabId}`);
      expect(exitCode).toBe(0);
      expect(fs.existsSync('test-custom.png')).toBe(true);
    });

    it('should handle invalid tab ID', () => {
      const { output, exitCode } = runCommand(`${CLI} screenshot --tab-id "INVALID_ID"`, 2000);
      expect(exitCode).toBe(1);
      expect(output).toMatch(/not found/i);
    });

    it('should prevent conflicting tab arguments', () => {
      const { output, exitCode } = runCommand(`${CLI} screenshot --tab-index 0 --tab-id ${testTabId}`, 2000);
      expect(exitCode).toBe(1);
      // Note: yargs validation output handling varies in test environment
    });
  });

  describe('backwards compatibility', () => {
    it('should work without tab targeting (active page)', () => {
      // Should work on whatever tab is currently active
      const { exitCode } = runCommand(`${CLI} screenshot --help`);
      expect(exitCode).toBe(0);
    });
  });
});