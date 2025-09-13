import type { Command } from 'commander';
import { vi } from '../../__tests__/vitest-compat';

import { createMockBrowser, createMockPage, testFixtures } from '../../lib/__tests__/test-helpers';

/**
 * Test utilities specifically for command testing
 */
export class CommandTestUtils {
  /**
   * Create a mock Command instance for testing
   */
  static createMockCommand(name: string): Command {
    const mockCommand = {
      name: vi.fn(() => name),
      description: vi.fn(() => mockCommand),
      option: vi.fn(() => mockCommand),
      action: vi.fn(() => mockCommand),
      opts: vi.fn(() => ({})),
      args: [],
      _name: name
    } as unknown as Command;

    return mockCommand;
  }

  /**
   * Mock the process.exit function for command testing
   */
  static mockProcessExit() {
    const originalExit = process.exit;
    const mockExit = vi.fn() as any;
    process.exit = mockExit;

    return {
      mockExit,
      restore: () => {
        process.exit = originalExit;
      }
    };
  }

  /**
   * Mock stdio for capturing output
   */
  static mockStdio() {
    const originalStdout = process.stdout.write;
    const originalStderr = process.stderr.write;

    const stdoutOutput: string[] = [];
    const stderrOutput: string[] = [];

    process.stdout.write = vi.fn((chunk: any) => {
      stdoutOutput.push(chunk.toString());
      return true;
    }) as any;

    process.stderr.write = vi.fn((chunk: any) => {
      stderrOutput.push(chunk.toString());
      return true;
    }) as any;

    return {
      getStdout: () => stdoutOutput.join(''),
      getStderr: () => stderrOutput.join(''),
      stdoutOutput,
      stderrOutput,
      restore: () => {
        process.stdout.write = originalStdout;
        process.stderr.write = originalStderr;
      }
    };
  }

  /**
   * Setup environment for browser command testing
   */
  static setupBrowserCommandTest() {
    const mockBrowser = createMockBrowser();
    const mockPage = createMockPage();

    // Mock BrowserHelper
    vi.mock('../../lib/browser-helper', () => ({
      BrowserHelper: {
        getBrowser: vi.fn(() => Promise.resolve(mockBrowser)),
        withBrowser: vi.fn(async (port: number, action: Function) => {
          return await action(mockBrowser);
        }),
        getPages: vi.fn(() => Promise.resolve([mockPage])),
        getPage: vi.fn(() => Promise.resolve(mockPage))
      }
    }));

    // Mock BrowserConnection
    vi.mock('../../lib/browser-connection', () => ({
      BrowserConnection: {
        checkConnection: vi.fn(() => Promise.resolve(true)),
        getPages: vi.fn(() => Promise.resolve([{
          id: '1',
          url: testFixtures.urls.example,
          title: testFixtures.pageInfo.title
        }]))
      }
    }));

    return {
      mockBrowser,
      mockPage,
      restore: () => {
        vi.restoreAllMocks();
      }
    };
  }

  /**
   * Helper for testing commands that interact with selectors
   */
  static createSelectorTest(selector: string, expectedElement?: any) {
    const mockPage = createMockPage();
    const mockLocator = {
      click: vi.fn(() => Promise.resolve()),
      fill: vi.fn(() => Promise.resolve()),
      type: vi.fn(() => Promise.resolve()),
      isVisible: vi.fn(() => Promise.resolve(true)),
      waitFor: vi.fn(() => Promise.resolve()),
      count: vi.fn(() => Promise.resolve(1))
    };

    mockPage.locator = vi.fn(() => mockLocator);
    mockPage.waitForSelector = vi.fn(() => Promise.resolve(expectedElement || mockLocator));

    return {
      mockPage,
      mockLocator,
      expectSelectorCalled: (expectedSelector: string) => {
        expect(mockPage.locator).toHaveBeenCalledWith(expectedSelector);
      }
    };
  }

  /**
   * Helper for testing navigation commands
   */
  static createNavigationTest(initialUrl: string = testFixtures.urls.example) {
    const mockPage = createMockPage(initialUrl);
    const mockBrowser = createMockBrowser();

    // Add page to context
    const mockContext = mockBrowser.contexts()[0];
    mockContext.pages = vi.fn(() => [mockPage]);

    return {
      mockBrowser,
      mockPage,
      expectNavigatedTo: (expectedUrl: string) => {
        expect(mockPage.goto).toHaveBeenCalledWith(expectedUrl);
      }
    };
  }

  /**
   * Helper for testing screenshot commands
   */
  static createScreenshotTest() {
    const mockPage = createMockPage();
    const mockBuffer = Buffer.from('fake-screenshot-data');

    mockPage.screenshot = vi.fn(() => Promise.resolve(mockBuffer));

    return {
      mockPage,
      mockBuffer,
      expectScreenshotTaken: (options?: any) => {
        if (options) {
          expect(mockPage.screenshot).toHaveBeenCalledWith(options);
        } else {
          expect(mockPage.screenshot).toHaveBeenCalled();
        }
      }
    };
  }

  /**
   * Helper for testing commands that evaluate JavaScript
   */
  static createEvaluationTest(returnValue: any = null) {
    const mockPage = createMockPage();

    mockPage.evaluate = vi.fn(() => Promise.resolve(returnValue));

    return {
      mockPage,
      expectEvaluated: (expectedCode: string) => {
        expect(mockPage.evaluate).toHaveBeenCalledWith(expectedCode);
      },
      getEvaluationCalls: () => {
        return (mockPage.evaluate as any).mock.calls;
      }
    };
  }

  /**
   * Create a test timeout for async operations
   */
  static withTimeout<T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error(`Test timeout after ${timeoutMs}ms`)), timeoutMs);
      })
    ]);
  }
}

/**
 * Common test patterns for command testing
 */
export const commandTestPatterns = {
  /**
   * Test that a command handles browser connection errors properly
   */
  testBrowserConnectionError: async (commandFunction: Function) => {
    // Mock failed browser connection
    vi.mock('../../lib/browser-helper', () => ({
      BrowserHelper: {
        getBrowser: vi.fn(() => Promise.reject(new Error('No browser running')))
      }
    }));

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('Process exit called');
    });

    try {
      await expect(commandFunction()).rejects.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();
    } finally {
      vi.restoreAllMocks();
    }
  },

  /**
   * Test that a command validates its arguments
   */
  testArgumentValidation: async (commandFunction: Function, invalidArgs: any[]) => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    for (const args of invalidArgs) {
      await expect(commandFunction(args)).rejects.toThrow();
    }

    vi.restoreAllMocks();
  },

  /**
   * Test that a command produces expected output
   */
  testCommandOutput: async (
    commandFunction: Function,
    args: any[],
    expectedOutput: string | RegExp
  ) => {
    const { getStdout, restore } = CommandTestUtils.mockStdio();

    try {
      await commandFunction(...args);
      const output = getStdout();

      if (typeof expectedOutput === 'string') {
        expect(output).toContain(expectedOutput);
      } else {
        expect(output).toMatch(expectedOutput);
      }
    } finally {
      restore();
    }
  }
};
