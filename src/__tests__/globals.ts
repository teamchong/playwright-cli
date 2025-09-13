/**
 * Global setup for Bun test to provide Vitest compatibility
 */

// Import Bun test utilities
const { mock, spyOn } = require('bun:test');

// Create vi compatibility layer - must be set before any imports
global.vi = {
  fn: mock,
  spyOn,
  mock: (modulePath, factory) => {
    // Bun doesn't support hoisted mocking in the same way
    // We'll implement a basic mock registry
    if (!global.__mocks) {
      global.__mocks = {};
    }
    global.__mocks[modulePath] = factory || {};
  },
  mocked: (item) => {
    // Create a mock wrapper with common mock methods
    if (!item.mockImplementation) {
      item.mockImplementation = (impl) => {
        Object.assign(item, mock(impl));
        return item;
      };
    }
    if (!item.mockReturnValue) {
      item.mockReturnValue = (value) => {
        Object.assign(item, mock(() => value));
        return item;
      };
    }
    if (!item.mockResolvedValue) {
      item.mockResolvedValue = (value) => {
        Object.assign(item, mock(() => Promise.resolve(value)));
        return item;
      };
    }
    if (!item.mockRejectedValue) {
      item.mockRejectedValue = (value) => {
        Object.assign(item, mock(() => Promise.reject(value)));
        return item;
      };
    }
    if (!item.mock) {
      item.mock = { calls: [] };
    }
    return item;
  },
  clearAllMocks: () => {
    mock.clearAllMocks();
  },
  restoreAllMocks: () => {
    mock.restore();
  },
  importActual: async (modulePath) => {
    return await import(modulePath);
  },
  setConfig: () => {}
};

// Set up test environment
process.env.NODE_ENV = 'test';