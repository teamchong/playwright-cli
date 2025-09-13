import { describe, it, expect, beforeEach, afterEach, vi } from '../vitest-compat';

import { SnapshotCommand } from '../../commands/snapshot-refactored';
import { MockBrowserService } from '../../lib/browser-service';
import { logger } from '../../lib/logger';

describe('SnapshotCommand with Dependency Injection', () => {
  let mockBrowserService: MockBrowserService;
  let snapshotCommand: SnapshotCommand;
  let mockPage: any;
  let mockSnapshot: any;

  beforeEach(() => {
    // Create a detailed mock snapshot for testing
    mockSnapshot = {
      role: 'WebArea',
      name: 'Test Page',
      children: [
        {
          role: 'button',
          name: 'Click me',
          children: []
        },
        {
          role: 'textbox',
          name: 'Search input',
          children: []
        }
      ]
    };

    // Create a mock page with accessibility.snapshot method
    mockPage = {
      url: () => 'https://test-page.com',
      accessibility: {
        snapshot: vi.fn().mockResolvedValue(mockSnapshot)
      }
    };

    // Create mock browser service
    mockBrowserService = new MockBrowserService(undefined, mockPage);

    // Create command with injected mock service
    snapshotCommand = new SnapshotCommand(mockBrowserService);
  });

  describe('command initialization', () => {
    it('should initialize with correct name and description', () => {
      const command = snapshotCommand.getCommand();

      expect(command.name()).toBe('snapshot');
      expect(command.description()).toBe('Capture interactive elements from the current page');
    });

    it('should have expected options', () => {
      const command = snapshotCommand.getCommand();
      const options = command.options;

      expect(options.some(opt => opt.short === '-p')).toBe(true);
      expect(options.some(opt => opt.long === '--port')).toBe(true);
      expect(options.some(opt => opt.long === '--json')).toBe(true);
      expect(options.some(opt => opt.long === '--full')).toBe(true);
    });
  });

  describe('command execution', () => {
    let loggerInfoSpy: any;

    beforeEach(() => {
      loggerInfoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {});
    });

    afterEach(() => {
      loggerInfoSpy.mockRestore();
    });

    it('should call accessibility.snapshot on the page', async () => {
      await snapshotCommand.execute([], { port: '9222' });

      expect(mockPage.accessibility.snapshot).toHaveBeenCalledOnce();
    });

    it('should render interactive elements by default', async () => {
      await snapshotCommand.execute([], { port: '9222' });

      expect(loggerInfoSpy).toHaveBeenCalled();
      // Should display the interactive elements, not full snapshot
      const output = loggerInfoSpy.mock.calls.map((call: any[]) => call[0]).join('\n');
      expect(output).toContain('Interactive Elements');
    });

    it('should render full snapshot when --full option is provided', async () => {
      await snapshotCommand.execute([], { port: '9222', full: true });

      expect(loggerInfoSpy).toHaveBeenCalled();
      // Should display the full accessibility tree
      const output = loggerInfoSpy.mock.calls.map((call: any[]) => call[0]).join('\n');
      expect(output).toContain('WebArea');
      expect(output).toContain('Test Page');
    });

    it('should output JSON when --json option is provided', async () => {
      await snapshotCommand.execute([], { port: '9222', json: true });

      expect(loggerInfoSpy).toHaveBeenCalled();
      // Should output JSON format
      const output = loggerInfoSpy.mock.calls[0][0];
      expect(() => JSON.parse(output)).not.toThrow();
    });

    it('should output full JSON when both --full and --json options are provided', async () => {
      await snapshotCommand.execute([], { port: '9222', full: true, json: true });

      expect(loggerInfoSpy).toHaveBeenCalled();
      const output = loggerInfoSpy.mock.calls[0][0];
      const parsedOutput = JSON.parse(output);

      expect(parsedOutput.role).toBe('WebArea');
      expect(parsedOutput.name).toBe('Test Page');
      expect(parsedOutput.children).toHaveLength(2);
    });

    it('should use correct port from options', async () => {
      const customPort = '8080';

      // Mock the withActivePage method to verify port is passed correctly
      const withActivePageSpy = vi.spyOn(mockBrowserService, 'withActivePage');

      await snapshotCommand.execute([], { port: customPort });

      expect(withActivePageSpy).toHaveBeenCalledWith(
        parseInt(customPort),
        expect.any(Function)
      );
    });
  });

  describe('error handling', () => {
    it('should handle snapshot errors gracefully', async () => {
      // Mock snapshot to throw an error
      mockPage.accessibility.snapshot.mockRejectedValue(new Error('Snapshot failed'));

      // The command should handle this error through the base class error handling
      await expect(snapshotCommand.execute([], { port: '9222' })).rejects.toThrow('Snapshot failed');
    });
  });

  describe('dependency injection benefits', () => {
    it('should allow easy mocking for unit tests', async () => {
      // This test demonstrates how DI makes unit testing trivial
      const customSnapshot = { role: 'custom', name: 'Custom Test' };

      const customMockPage = {
        url: () => 'https://custom.com',
        accessibility: {
          snapshot: vi.fn().mockResolvedValue(customSnapshot)
        }
      };

      const customMockService = new MockBrowserService(undefined, customMockPage);
      const customCommand = new SnapshotCommand(customMockService);

      const loggerInfoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {});

      await customCommand.execute([], { port: '9222', json: true });

      // Verify that our custom mock was called
      expect(customMockPage.accessibility.snapshot).toHaveBeenCalled();
      expect(loggerInfoSpy).toHaveBeenCalled();

      loggerInfoSpy.mockRestore();
    });

    it('should allow testing without real browser instance', () => {
      // This test shows that we can test command logic without needing Chrome
      expect(snapshotCommand).toBeDefined();
      expect(typeof snapshotCommand.execute).toBe('function');

      // The command is fully testable without browser dependencies
      expect(mockBrowserService.withActivePage).toBeDefined();
    });
  });
});
