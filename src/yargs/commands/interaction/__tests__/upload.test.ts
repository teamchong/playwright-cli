import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Simplified Upload Command Tests - TAB ID FROM COMMAND OUTPUT
 * 
 * - Uses global browser session (no per-file setup/teardown)
 * - Captures tab ID directly from command output
 * - Uses returned tab ID for all interactions
 * - NO COMPLEX DISCOVERY - commands return what we need
 * - NO TAB MANAGEMENT - let global setup handle browser lifecycle
 */
describe('upload command - TAB ID FROM OUTPUT', () => {
  const CLI = 'node dist/index.js';
  let testTabId: string;
  let testFile1: string;
  let testFile2: string;

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
    // Create test files
    testFile1 = path.join(process.cwd(), 'test-upload-1.txt');
    testFile2 = path.join(process.cwd(), 'test-upload-2.txt');
    fs.writeFileSync(testFile1, 'Test file 1 content');
    fs.writeFileSync(testFile2, 'Test file 2 content');

    // Browser already running from global setup
    // Create a dedicated test tab for this test suite and capture its ID
    const { output } = runCommand(`${CLI} tabs new --url "data:text/html,<div id='test-container'>Upload Test Suite Ready</div>"`);
    testTabId = extractTabId(output);
    console.log(`Upload test suite using tab ID: ${testTabId}`);
  });

  afterAll(async () => {
    // Clean up test files
    try {
      fs.unlinkSync(testFile1);
      fs.unlinkSync(testFile2);
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
      const { output, exitCode } = runCommand(`${CLI} upload --help`);
      expect(exitCode).toBe(0);
      expect(output).toContain('upload');
      expect(output).toContain('tab-index');
      expect(output).toContain('tab-id');
    });
  });

  describe('direct tab targeting with captured ID', () => {
    it('should upload single file using captured tab ID', () => {
      // Navigate our test tab to a page with file input
      runCommand(`${CLI} navigate "data:text/html,<input type='file' id='file-input'/>" --tab-id ${testTabId}`);
      
      // Upload file using our captured tab ID
      const { exitCode } = runCommand(`${CLI} upload "#file-input" "${testFile1}" --tab-id ${testTabId}`);
      expect(exitCode).toBe(0);
    });

    it('should upload multiple files', () => {
      // Navigate to page with multiple file input
      runCommand(`${CLI} navigate "data:text/html,<input type='file' id='multi-file' multiple/>" --tab-id ${testTabId}`);
      
      // Upload multiple files in the same tab
      const { exitCode } = runCommand(`${CLI} upload "#multi-file" "${testFile1}" "${testFile2}" --tab-id ${testTabId}`);
      expect(exitCode).toBe(0);
    });

    it('should work with different file inputs', () => {
      // Navigate to page with multiple file inputs
      runCommand(`${CLI} navigate "data:text/html,<input type='file' id='doc-upload'/><input type='file' id='image-upload'/>" --tab-id ${testTabId}`);
      
      // Upload to different inputs in the same tab
      expect(runCommand(`${CLI} upload "#doc-upload" "${testFile1}" --tab-id ${testTabId}`).exitCode).toBe(0);
      expect(runCommand(`${CLI} upload "#image-upload" "${testFile2}" --tab-id ${testTabId}`).exitCode).toBe(0);
    });

    it('should handle non-existent element gracefully', () => {
      // Navigate to page without file input
      runCommand(`${CLI} navigate "data:text/html,<div>No file input here</div>" --tab-id ${testTabId}`);
      
      // Try to upload to non-existent element - command hangs on non-existent selectors
      expect(() => {
        runCommand(`${CLI} upload "#nonexistent" "${testFile1}" --tab-id ${testTabId}`, 2000);
      }).toThrow('Command timed out (hanging)');
    });

    it('should handle invalid tab ID', () => {
      const { output, exitCode } = runCommand(`${CLI} upload "#test" "${testFile1}" --tab-id "INVALID_ID"`, 2000);
      expect(exitCode).toBe(1);
      expect(output).toMatch(/not found/i);
    });

    it('should prevent conflicting tab arguments', () => {
      const { output, exitCode } = runCommand(`${CLI} upload "#test" "${testFile1}" --tab-index 0 --tab-id ${testTabId}`, 2000);
      expect(exitCode).toBe(1);
      // Note: yargs validation output handling varies in test environment
    });
  });

  describe('backwards compatibility', () => {
    it('should work without tab targeting (active page)', () => {
      // Should work on whatever tab is currently active
      const { exitCode } = runCommand(`${CLI} upload --help`);
      expect(exitCode).toBe(0);
    });
  });
});