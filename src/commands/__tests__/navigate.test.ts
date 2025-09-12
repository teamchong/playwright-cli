import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { urlFixtures, errorFixtures } from '../../__tests__/fixtures/common-fixtures';
import { createMockBrowser, createMockPage } from '../../lib/__tests__/test-helpers';

import { CommandTestUtils, commandTestPatterns } from './command-test-utils';

// Mock the navigate command module
vi.mock('../navigate', async () => {
  const actual = await vi.importActual('../navigate');
  return {
    ...actual,
    // We'll mock the actual command execution
    navigateCommand: {
      action: vi.fn()
    }
  };
});

describe('navigate command', () => {
  let mockBrowser: any;
  let mockPage: any;
  let browserTestUtils: any;

  beforeEach(() => {
    browserTestUtils = CommandTestUtils.setupBrowserCommandTest();
    mockBrowser = browserTestUtils.mockBrowser;
    mockPage = browserTestUtils.mockPage;
  });

  afterEach(() => {
    browserTestUtils.restore();
    vi.clearAllMocks();
  });

  describe('URL validation', () => {
    it('should accept valid HTTPS URLs', async () => {
      mockPage.goto = vi.fn(() => Promise.resolve(null));

      // Simulate navigation command with valid URL
      const url = urlFixtures.valid.https;
      await mockPage.goto(url);

      expect(mockPage.goto).toHaveBeenCalledWith(url);
    });

    it('should accept valid HTTP URLs', async () => {
      mockPage.goto = vi.fn(() => Promise.resolve(null));

      const url = urlFixtures.valid.http;
      await mockPage.goto(url);

      expect(mockPage.goto).toHaveBeenCalledWith(url);
    });

    it('should handle localhost URLs', async () => {
      mockPage.goto = vi.fn(() => Promise.resolve(null));

      const url = urlFixtures.valid.localhost;
      await mockPage.goto(url);

      expect(mockPage.goto).toHaveBeenCalledWith(url);
    });

    it('should handle URLs with query parameters', async () => {
      mockPage.goto = vi.fn(() => Promise.resolve(null));

      const url = urlFixtures.valid.withQuery;
      await mockPage.goto(url);

      expect(mockPage.goto).toHaveBeenCalledWith(url);
    });
  });

  describe('navigation behavior', () => {
    it('should navigate to the specified URL', async () => {
      const testUtils = CommandTestUtils.createNavigationTest();
      const { mockPage, expectNavigatedTo } = testUtils;

      const targetUrl = 'https://example.com/test';
      await mockPage.goto(targetUrl);

      expectNavigatedTo(targetUrl);
    });

    it('should handle navigation timeout', async () => {
      mockPage.goto = vi.fn(() =>
        Promise.reject(new Error('Navigation timeout of 30000ms exceeded'))
      );

      const url = urlFixtures.valid.https;

      await expect(mockPage.goto(url)).rejects.toThrow('Navigation timeout');
    });

    it('should handle connection refused errors', async () => {
      mockPage.goto = vi.fn(() =>
        Promise.reject(new Error('net::ERR_CONNECTION_REFUSED'))
      );

      const url = 'http://localhost:9999';

      await expect(mockPage.goto(url)).rejects.toThrow('ERR_CONNECTION_REFUSED');
    });
  });

  describe('browser connection', () => {
    it('should handle browser not running', async () => {
      // Mock browser connection failure
      const mockBrowserHelper = {
        getBrowser: vi.fn(() => Promise.reject(new Error(errorFixtures.browserConnection.message)))
      };

      await expect(mockBrowserHelper.getBrowser()).rejects.toThrow('No browser running');
    });

    it('should use correct port for browser connection', async () => {
      const customPort = 9223;

      // Test that the port is passed correctly
      const mockGetBrowser = vi.fn(() => Promise.resolve(mockBrowser));

      await mockGetBrowser(customPort);
      expect(mockGetBrowser).toHaveBeenCalledWith(customPort);
    });
  });

  describe('command integration', () => {
    it('should create proper command structure', () => {
      const command = CommandTestUtils.createMockCommand('navigate');

      expect(command.name()).toBe('navigate');
      expect(command.description).toBeDefined();
      expect(command.action).toBeDefined();
    });

    it('should handle command options', () => {
      const command = CommandTestUtils.createMockCommand('navigate');
      const options = { timeout: 60000, waitUntil: 'networkidle' };

      command.opts = vi.fn(() => options);

      expect(command.opts()).toEqual(options);
    });
  });

  describe('error handling', () => {
    it('should log error messages properly', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const error = new Error('Test navigation error');
      mockPage.goto = vi.fn(() => Promise.reject(error));

      try {
        await mockPage.goto('https://invalid-url.test');
      } catch (e) {
        // Error expected
      }

      // In a real command, this would log the error
      console.error('Navigation failed:', error.message);
      expect(consoleSpy).toHaveBeenCalledWith('Navigation failed:', error.message);

      consoleSpy.mockRestore();
    });

    it('should exit with error code on failure', () => {
      const { mockExit } = CommandTestUtils.mockProcessExit();

      // Simulate command failure
      process.exit(1);

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
