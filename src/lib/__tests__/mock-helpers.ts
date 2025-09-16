import type { Browser, Page, BrowserContext } from 'playwright'
import { vi, type MockedFunction } from 'vitest'

/**
 * Mock browser instance for testing
 */
export function createMockBrowser(): Browser {
  const mockPage = createMockPage()
  const mockContext = createMockContext([mockPage])

  return {
    contexts: vi.fn(() => [mockContext]),
    close: vi.fn(() => Promise.resolve()),
    newContext: vi.fn(() => Promise.resolve(mockContext)),
    isConnected: vi.fn(() => true),
    version: vi.fn(() => 'test-version'),
    browserType: vi.fn(() => ({ name: vi.fn(() => 'chromium') })),
  } as any
}

/**
 * Mock page instance for testing
 */
export function createMockPage(url: string = 'https://example.com'): Page {
  return {
    url: vi.fn(() => url),
    title: vi.fn(() => Promise.resolve('Test Page')),
    goto: vi.fn(() => Promise.resolve(null)),
    click: vi.fn(() => Promise.resolve()),
    fill: vi.fn(() => Promise.resolve()),
    type: vi.fn(() => Promise.resolve()),
    waitForSelector: vi.fn(() => Promise.resolve(null)),
    waitForTimeout: vi.fn(() => Promise.resolve()),
    screenshot: vi.fn(() => Promise.resolve(Buffer.from(''))),
    evaluate: vi.fn(() => Promise.resolve(null)),
    locator: vi.fn(() => createMockLocator()),
    setViewportSize: vi.fn(() => Promise.resolve()),
    keyboard: {
      press: vi.fn(() => Promise.resolve()),
    },
    mouse: {
      click: vi.fn(() => Promise.resolve()),
    },
    on: vi.fn(),
    close: vi.fn(() => Promise.resolve()),
    isClosed: vi.fn(() => false),
  } as any
}

/**
 * Mock browser context for testing
 */
export function createMockContext(pages: Page[] = []): BrowserContext {
  return {
    pages: vi.fn(() => pages),
    newPage: vi.fn(() => Promise.resolve(createMockPage())),
    close: vi.fn(() => Promise.resolve()),
    setDefaultTimeout: vi.fn(),
  } as any
}

/**
 * Mock locator for testing
 */
export function createMockLocator() {
  return {
    click: vi.fn(() => Promise.resolve()),
    fill: vi.fn(() => Promise.resolve()),
    type: vi.fn(() => Promise.resolve()),
    isVisible: vi.fn(() => Promise.resolve(true)),
    waitFor: vi.fn(() => Promise.resolve()),
    count: vi.fn(() => Promise.resolve(1)),
    first: vi.fn(() => createMockLocator()),
    nth: vi.fn(() => createMockLocator()),
  }
}

/**
 * Mock BrowserHelper for testing
 */
export function mockBrowserHelper() {
  const mockBrowser = createMockBrowser()

  const originalBrowserHelper = require('../browser-helper').BrowserHelper

  return {
    getBrowser: vi.fn(() => Promise.resolve(mockBrowser)),
    withBrowser: vi.fn(
      (port: number, action: (browser: Browser) => Promise<any>) =>
        action(mockBrowser)
    ),
    getPages: vi.fn(() => Promise.resolve([createMockPage()])),
    getPage: vi.fn(() => Promise.resolve(createMockPage())),
    mockBrowser,
    restore: () => {
      vi.restoreAllMocks()
    },
  }
}

/**
 * Common test fixtures
 */
export const testFixtures = {
  // Common URLs
  urls: {
    example: 'https://example.com',
    google: 'https://google.com',
    github: 'https://github.com',
  },

  // Common selectors
  selectors: {
    button: 'button',
    input: 'input[type="text"]',
    link: 'a',
    div: 'div.test-class',
    complexSelector: 'div[data-testid="complex"] > span:first-child',
  },

  // Common test data
  testData: {
    username: 'testuser',
    email: 'test@example.com',
    password: 'testpass123',
    searchQuery: 'playwright testing',
  },

  // Mock console messages
  consoleMessages: [
    {
      type: 'log',
      text: 'Test log message',
      timestamp: '2024-01-01T00:00:00.000Z',
    },
    {
      type: 'error',
      text: 'Test error message',
      timestamp: '2024-01-01T00:00:01.000Z',
    },
    {
      type: 'warn',
      text: 'Test warning message',
      timestamp: '2024-01-01T00:00:02.000Z',
    },
  ],

  // Mock page info
  pageInfo: {
    title: 'Test Page Title',
    url: 'https://example.com/test',
    viewport: { width: 1920, height: 1080 },
  },
}

/**
 * Helper to create command arguments for testing
 */
export function createCommandArgs(
  command: string,
  args: string[] = [],
  options: Record<string, any> = {}
) {
  return {
    command,
    args,
    options,
    // Mock commander.js Command properties
    _name: command,
    opts: () => options,
  }
}

/**
 * Helper to mock browser connection status
 */
export function mockBrowserConnection(isConnected: boolean = true) {
  const { BrowserConnection } = require('../browser-connection')

  return {
    checkConnection: vi.fn(() => Promise.resolve(isConnected)),
    getPages: vi.fn(() =>
      Promise.resolve(
        isConnected
          ? [{ id: '1', url: 'https://example.com', title: 'Test Page' }]
          : []
      )
    ),
    restore: () => {
      vi.restoreAllMocks()
    },
  }
}

/**
 * Helper to suppress console output during tests
 */
export function suppressConsole() {
  const originalConsole = { ...console }

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  return originalConsole
}
