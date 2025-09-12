/**
 * Test setup file for Vitest
 * This file is executed before each test suite
 */

import { vi } from 'vitest';

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();

  // Reset any global state if needed

  // Suppress console output during tests (can be overridden in individual tests)
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(() => {
  // Restore all mocks after each test
  vi.restoreAllMocks();
});

// Global test teardown
afterAll(() => {
  // Clean up any resources if needed
});

// Mock external dependencies that should always be mocked
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  spawnSync: vi.fn(() => ({
    stdout: '200',
    stderr: '',
    status: 0
  }))
}));

// Mock filesystem operations to avoid actual file I/O during tests
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(() => 'mock file content'),
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn()
  };
});

// Mock Playwright browser automation for faster tests
vi.mock('playwright', () => ({
  chromium: {
    connectOverCDP: vi.fn(() => Promise.resolve({
      contexts: vi.fn(() => []),
      close: vi.fn(() => Promise.resolve()),
      newContext: vi.fn(() => Promise.resolve({
        pages: vi.fn(() => []),
        newPage: vi.fn(() => Promise.resolve({
          goto: vi.fn(() => Promise.resolve()),
          url: vi.fn(() => 'https://example.com'),
          title: vi.fn(() => Promise.resolve('Test Page'))
        }))
      }))
    })),
    launch: vi.fn(() => Promise.resolve({
      newContext: vi.fn(() => Promise.resolve({
        newPage: vi.fn(() => Promise.resolve({
          goto: vi.fn(() => Promise.resolve()),
          url: vi.fn(() => 'https://example.com'),
          title: vi.fn(() => Promise.resolve('Test Page'))
        }))
      })),
      close: vi.fn(() => Promise.resolve())
    }))
  }
}));

// Add custom matchers or extend expect if needed
expect.extend({
  // Custom matcher example:
  // toBeValidUrl(received: string) {
  //   try {
  //     new URL(received)
  //     return { pass: true, message: () => `${received} is a valid URL` }
  //   } catch {
  //     return { pass: false, message: () => `${received} is not a valid URL` }
  //   }
  // }
});

// Set up test environment variables
process.env.NODE_ENV = 'test';

// Increase test timeout for integration tests
vi.setConfig({
  testTimeout: 10000
});
