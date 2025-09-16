/**
 * Global Test Setup for Yargs Commands
 * 
 * Provides consistent test environment for all command tests.
 * Prevents hanging on stdin, process.exit, and other blocking operations.
 */

import { vi, beforeEach, afterEach } from 'vitest';
import { Readable } from 'stream';

// Store original values
let originalStdin: NodeJS.ReadStream;
let originalExit: typeof process.exit;
let originalStdinResume: typeof process.stdin.resume;

/**
 * Setup test environment before each test
 */
export function setupTestEnvironment() {
  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    
    // Save originals
    originalStdin = process.stdin;
    originalExit = process.exit;
    originalStdinResume = process.stdin.resume;
    
    // Mock stdin to prevent hanging
    const mockStdin = new Readable();
    mockStdin.push(null); // EOF immediately
    Object.defineProperty(process, 'stdin', {
      value: mockStdin,
      writable: true,
      configurable: true
    });
    
    // Mock process.stdin.resume to prevent hanging
    process.stdin.resume = vi.fn().mockReturnValue(process.stdin);
    
    // Mock process.exit to prevent test process from exiting
    process.exit = vi.fn((code?: number) => {
      throw new Error(`process.exit called with code ${code}`);
    }) as any;
    
    // Mock setTimeout for continuous monitoring commands
    vi.spyOn(global, 'setTimeout').mockImplementation((fn: any, ms?: number) => {
      if (ms && ms > 5000) {
        // Don't actually wait for long timeouts
        return {} as any;
      }
      return originalSetTimeout(fn, ms);
    });
  });
  
  afterEach(() => {
    // Restore originals
    Object.defineProperty(process, 'stdin', {
      value: originalStdin,
      writable: true,
      configurable: true
    });
    
    process.exit = originalExit;
    process.stdin.resume = originalStdinResume;
    
    // Restore timers
    vi.restoreAllMocks();
  });
}

const originalSetTimeout = global.setTimeout;

/**
 * Mock fs module for file operations
 */
export function mockFileSystem() {
  vi.mock('fs', async () => {
    const actual = await vi.importActual<typeof import('fs')>('fs');
    return {
      ...actual,
      promises: {
        ...actual.promises,
        readFile: vi.fn().mockResolvedValue('// mock file content'),
        writeFile: vi.fn().mockResolvedValue(undefined),
        access: vi.fn().mockResolvedValue(undefined),
        mkdir: vi.fn().mockResolvedValue(undefined),
        readdir: vi.fn().mockResolvedValue([])
      },
      existsSync: vi.fn().mockReturnValue(true),
      readFileSync: vi.fn().mockReturnValue('// mock file content')
    };
  });
}

/**
 * Mock child_process for spawn operations
 */
export function mockChildProcess() {
  vi.mock('child_process', () => ({
    spawn: vi.fn(() => ({
      unref: vi.fn(),
      on: vi.fn((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 100);
        }
      }),
      kill: vi.fn(),
      pid: 12345,
      stdout: {
        on: vi.fn(),
        pipe: vi.fn()
      },
      stderr: {
        on: vi.fn(),
        pipe: vi.fn()
      }
    }))
  }));
}

/**
 * Mock BrowserHelper with sensible defaults
 */
export function mockBrowserHelper() {
  const mockPage = {
    goto: vi.fn().mockResolvedValue(undefined),
    url: vi.fn().mockReturnValue('about:blank'),
    click: vi.fn().mockResolvedValue(undefined),
    type: vi.fn().mockResolvedValue(undefined),
    fill: vi.fn().mockResolvedValue(undefined),
    press: vi.fn().mockResolvedValue(undefined),
    hover: vi.fn().mockResolvedValue(undefined),
    selectOption: vi.fn().mockResolvedValue(undefined),
    dragAndDrop: vi.fn().mockResolvedValue(undefined),
    setInputFiles: vi.fn().mockResolvedValue(undefined),
    waitForSelector: vi.fn().mockResolvedValue(undefined),
    screenshot: vi.fn().mockResolvedValue(Buffer.from('fake')),
    pdf: vi.fn().mockResolvedValue(Buffer.from('fake')),
    evaluate: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
    title: vi.fn().mockResolvedValue('Test Page'),
    content: vi.fn().mockResolvedValue('<html></html>'),
    locator: vi.fn().mockReturnValue({
      click: vi.fn().mockResolvedValue(undefined),
      fill: vi.fn().mockResolvedValue(undefined),
      hover: vi.fn().mockResolvedValue(undefined),
      press: vi.fn().mockResolvedValue(undefined)
    }),
    goBack: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue(undefined),
    setViewportSize: vi.fn().mockResolvedValue(undefined),
    accessibility: {
      snapshot: vi.fn().mockResolvedValue({ role: 'WebArea', children: [] })
    },
    context: vi.fn().mockReturnValue({
      browser: vi.fn().mockReturnValue({})
    })
  };

  vi.mock('../../../../lib/browser-helper', () => ({
    BrowserHelper: {
      getBrowser: vi.fn().mockResolvedValue({
        contexts: vi.fn().mockReturnValue([{
          pages: vi.fn().mockReturnValue([mockPage]),
          newPage: vi.fn().mockResolvedValue(mockPage),
          setDefaultTimeout: vi.fn()
        }]),
        close: vi.fn().mockResolvedValue(undefined)
      }),
      getActivePage: vi.fn().mockResolvedValue(mockPage),
      withActivePage: vi.fn().mockImplementation(async (_port, callback) => {
        return callback(mockPage);
      }),
      withBrowser: vi.fn().mockImplementation(async (_port, callback) => {
        const mockBrowser = {
          contexts: vi.fn().mockReturnValue([{
            pages: vi.fn().mockReturnValue([mockPage]),
            newPage: vi.fn().mockResolvedValue(mockPage),
            setDefaultTimeout: vi.fn()
          }]),
          close: vi.fn().mockResolvedValue(undefined)
        };
        return callback(mockBrowser);
      }),
      launchChrome: vi.fn().mockResolvedValue(undefined),
      isPortOpen: vi.fn().mockResolvedValue(false)
    }
  }));
  
  return mockPage;
}