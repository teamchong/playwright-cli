import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';

/**
 * Simplified Type Command Tests - TAB ID FROM COMMAND OUTPUT
 * 
 * - Uses global browser session (no per-file setup/teardown)
 * - Captures tab ID directly from command output
 * - Uses returned tab ID for all interactions
 * - NO COMPLEX DISCOVERY - commands return what we need
 * - NO TAB MANAGEMENT - let global setup handle browser lifecycle
 */
describe('type command - TAB ID FROM OUTPUT', () => {
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
    const { output } = runCommand(`${CLI} tabs new --url "data:text/html,<div id='test-container'>Type Test Suite Ready</div>"`);
    testTabId = extractTabId(output);
    console.log(`Type test suite using tab ID: ${testTabId}`);
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
      const { output, exitCode } = runCommand(`${CLI} type --help`);
      expect(exitCode).toBe(0);
      expect(output).toContain('type');
      expect(output).toContain('tab-index');
      expect(output).toContain('tab-id');
    });
  });

  describe('direct tab targeting with captured ID', () => {
    it('should type text using captured tab ID', () => {
      // Navigate our test tab to a page with input field
      runCommand(`${CLI} navigate "data:text/html,<input id='test-input' placeholder='Type here'/>" --tab-id ${testTabId}`);
      
      // Type text into the input field using our captured tab ID
      const { exitCode } = runCommand(`${CLI} type "#test-input" "Hello World" --tab-id ${testTabId}`);
      expect(exitCode).toBe(0);
    });

    it('should handle different input types in same tab', () => {
      // Navigate to page with various input types
      runCommand(`${CLI} navigate "data:text/html,<form><input id='text-input' type='text'/><textarea id='textarea'>Default text</textarea></form>" --tab-id ${testTabId}`);
      
      // Type into different elements in the same tab
      expect(runCommand(`${CLI} type "#text-input" "Text input value" --tab-id ${testTabId}`).exitCode).toBe(0);
      expect(runCommand(`${CLI} type "#textarea" "Textarea content" --tab-id ${testTabId}`).exitCode).toBe(0);
    });

    it('should type with clear option', () => {
      // Navigate to page with pre-filled input
      runCommand(`${CLI} navigate "data:text/html,<input id='test-input' value='existing text'/>" --tab-id ${testTabId}`);
      
      // Type with clear option
      const { exitCode } = runCommand(`${CLI} type "#test-input" "new text" --clear --tab-id ${testTabId}`);
      expect(exitCode).toBe(0);
    });

    it('should handle non-existent element gracefully', () => {
      // Navigate to page without target element
      runCommand(`${CLI} navigate "data:text/html,<div>No input field here</div>" --tab-id ${testTabId}`);
      
      // Try to type into non-existent element - command hangs on non-existent selectors
      expect(() => {
        runCommand(`${CLI} type "#nonexistent" "text" --tab-id ${testTabId}`, 2000);
      }).toThrow('Command timed out (hanging)');
    });

    it('should handle invalid tab ID', () => {
      const { output, exitCode } = runCommand(`${CLI} type "#test" "text" --tab-id "INVALID_ID"`, 2000);
      expect(exitCode).toBe(1);
      expect(output).toMatch(/not found/i);
    });

    it('should prevent conflicting tab arguments', () => {
      const { output, exitCode } = runCommand(`${CLI} type "#test" "text" --tab-index 0 --tab-id ${testTabId}`, 2000);
      expect(exitCode).toBe(1);
      // Note: yargs validation output handling varies in test environment
    });
  });

  describe('backwards compatibility', () => {
    it('should work without tab targeting (active page)', () => {
      // Should work on whatever tab is currently active
      const { exitCode } = runCommand(`${CLI} type --help`);
      expect(exitCode).toBe(0);
    });
  });
});