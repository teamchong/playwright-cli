import { tmpdir } from 'os'
import { join } from 'path'

/**
 * Common test fixtures for the Playwright CLI
 */

export const urlFixtures = {
  valid: {
    https: 'https://example.com',
    http: 'http://example.com',
    withPath: 'https://example.com/path/to/page',
    withQuery: 'https://example.com?q=search&page=1',
    localhost: 'http://localhost:3000',
    subdomain: 'https://api.example.com',
  },
  invalid: {
    noProtocol: 'example.com',
    invalidProtocol: 'ftp://example.com',
    malformed: 'https://',
    empty: '',
    withSpaces: 'https://example .com',
  },
}

export const selectorFixtures = {
  simple: {
    id: '#myId',
    class: '.myClass',
    tag: 'button',
    attribute: '[data-testid="test"]',
  },
  complex: {
    descendant: 'div > span',
    adjacent: 'h1 + p',
    multiple: 'input[type="text"], input[type="email"]',
    pseudoClass: 'button:hover',
    nthChild: 'li:nth-child(2n+1)',
  },
  playwright: {
    text: 'text="Click me"',
    hasText: 'button:has-text("Submit")',
    visible: 'button >> visible=true',
    role: 'role=button[name="Submit"]',
  },
  invalid: {
    empty: '',
    malformed: 'div[unclosed',
    tooComplex: 'a'.repeat(1000),
  },
}

export const pageDataFixtures = {
  basic: {
    title: 'Test Page',
    url: 'https://example.com',
    viewport: { width: 1920, height: 1080 },
  },
  ecommerce: {
    title: 'Online Store',
    url: 'https://shop.example.com',
    products: [
      { id: '1', name: 'Widget A', price: 19.99 },
      { id: '2', name: 'Widget B', price: 29.99 },
    ],
  },
  form: {
    title: 'Contact Form',
    url: 'https://example.com/contact',
    fields: {
      name: 'John Doe',
      email: 'john@example.com',
      message: 'Hello world',
    },
  },
}

export const browserFixtures = {
  contexts: [
    {
      id: 'context-1',
      pages: [
        { url: 'https://example.com', title: 'Example' },
        { url: 'https://google.com', title: 'Google' },
      ],
    },
    {
      id: 'context-2',
      pages: [{ url: 'https://github.com', title: 'GitHub' }],
    },
  ],
  consoleMessages: [
    {
      type: 'log',
      text: 'Page loaded successfully',
      timestamp: '2024-01-01T00:00:00.000Z',
      location: { url: 'https://example.com', lineNumber: 1 },
    },
    {
      type: 'error',
      text: 'Script error occurred',
      timestamp: '2024-01-01T00:00:01.000Z',
      location: { url: 'https://example.com', lineNumber: 25 },
    },
    {
      type: 'warn',
      text: 'Deprecated API used',
      timestamp: '2024-01-01T00:00:02.000Z',
      location: { url: 'https://example.com', lineNumber: 10 },
    },
  ],
  networkRequests: [
    {
      url: 'https://api.example.com/users',
      method: 'GET',
      status: 200,
      responseTime: 150,
      headers: { 'content-type': 'application/json' },
    },
    {
      url: 'https://api.example.com/login',
      method: 'POST',
      status: 401,
      responseTime: 89,
      headers: { 'content-type': 'application/json' },
    },
  ],
}

export const commandFixtures = {
  navigate: {
    validUrls: [
      'https://example.com',
      'http://localhost:3000',
      'https://user:pass@secure.com:8080/path?q=1',
    ],
    options: {
      timeout: 30000,
      waitUntil: 'networkidle',
    },
  },
  click: {
    selectors: [
      'button',
      '#submit-btn',
      '.primary-button',
      '[data-testid="click-target"]',
    ],
    options: {
      timeout: 5000,
      force: false,
      button: 'left',
    },
  },
  screenshot: {
    paths: [
      'screenshot.png',
      join(tmpdir(), 'test-screenshot.jpg'),
      'outputs/page-capture.png',
    ],
    options: {
      fullPage: true,
      quality: 90,
      type: 'png',
    },
  },
  evaluate: {
    scripts: [
      'document.title',
      'window.location.href',
      'document.querySelectorAll("button").length',
      '(() => { return { width: window.innerWidth, height: window.innerHeight } })()',
    ],
  },
}

export const errorFixtures = {
  browserConnection: {
    message: 'No browser running on port 9222',
    code: 'BROWSER_NOT_FOUND',
  },
  selectorNotFound: {
    message: 'Element not found: #missing-element',
    code: 'ELEMENT_NOT_FOUND',
  },
  timeout: {
    message: 'Timeout 5000ms exceeded',
    code: 'TIMEOUT',
  },
  navigation: {
    message: 'Navigation failed: net::ERR_CONNECTION_REFUSED',
    code: 'NAVIGATION_ERROR',
  },
}

export const sessionFixtures = {
  valid: {
    name: 'test-session',
    timestamp: '2024-01-01T00:00:00.000Z',
    pages: [{ url: 'https://example.com', title: 'Example' }],
    cookies: [{ name: 'sessionId', value: 'abc123', domain: 'example.com' }],
  },
  saved: [
    {
      name: 'dev-session',
      created: '2024-01-01T00:00:00.000Z',
      pageCount: 3,
    },
    {
      name: 'prod-session',
      created: '2024-01-02T00:00:00.000Z',
      pageCount: 1,
    },
  ],
}

/**
 * Helper to create custom fixtures for specific tests
 */
export class FixtureBuilder {
  static createPage(overrides: Partial<typeof pageDataFixtures.basic> = {}) {
    return { ...pageDataFixtures.basic, ...overrides }
  }

  static createBrowserContext(pageUrls: string[] = []) {
    return {
      id: `context-${Date.now()}`,
      pages: pageUrls.map(url => ({
        url,
        title: `Page: ${new URL(url).hostname}`,
      })),
    }
  }

  static createConsoleMessage(
    type: 'log' | 'error' | 'warn' | 'info' = 'log',
    text: string = 'Test message',
    url: string = 'https://example.com'
  ) {
    return {
      type,
      text,
      timestamp: new Date().toISOString(),
      location: { url, lineNumber: 1 },
    }
  }

  static createNetworkRequest(
    url: string = 'https://api.example.com/test',
    method: string = 'GET',
    status: number = 200
  ) {
    return {
      url,
      method,
      status,
      responseTime: Math.floor(Math.random() * 500) + 50,
      headers: { 'content-type': 'application/json' },
    }
  }
}
