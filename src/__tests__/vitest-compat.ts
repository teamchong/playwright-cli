/**
 * Vitest compatibility layer for Bun test
 * Provides a Vitest-like API that wraps Bun test functions
 */

import { describe, it, expect, beforeEach, afterEach, afterAll, beforeAll, mock, spyOn } from 'bun:test';

// Create vi compatibility object
export const vi = {
  fn: mock,
  spyOn,
  mock: (modulePath: string, factory?: () => any) => {
    // Bun doesn't support module mocking the same way as Vitest
    // This is a no-op for now, tests will need to be refactored
    console.warn(`vi.mock('${modulePath}') called but module mocking is not supported in Bun test`);
  },
  mocked: <T>(item: T): T & {
    mockImplementation: (impl: Function) => any;
    mockReturnValue: (value: any) => any;
    mockResolvedValue: (value: any) => any;
    mockRejectedValue: (value: any) => any;
    mock: { calls: any[] };
  } => {
    // Add mock methods to the item if they don't exist
    const mockedItem = item as any;
    
    if (!mockedItem.mockImplementation) {
      const mockFn = mock();
      Object.assign(mockedItem, mockFn);
      mockedItem.mockImplementation = (impl: (...args: any[]) => any) => {
        Object.assign(mockedItem, mock(impl));
        return mockedItem;
      };
    }
    
    if (!mockedItem.mockReturnValue) {
      mockedItem.mockReturnValue = (value: any) => {
        Object.assign(mockedItem, mock(() => value));
        return mockedItem;
      };
    }
    
    if (!mockedItem.mockResolvedValue) {
      mockedItem.mockResolvedValue = (value: any) => {
        Object.assign(mockedItem, mock(() => Promise.resolve(value)));
        return mockedItem;
      };
    }
    
    if (!mockedItem.mockRejectedValue) {
      mockedItem.mockRejectedValue = (value: any) => {
        Object.assign(mockedItem, mock(() => Promise.reject(value)));
        return mockedItem;
      };
    }
    
    if (!mockedItem.mock) {
      mockedItem.mock = { calls: [] };
    }
    
    return mockedItem;
  },
  clearAllMocks: () => {
    mock.clearAllMocks();
  },
  restoreAllMocks: () => {
    mock.restore();
  },
  importActual: async (modulePath: string) => {
    return await import(modulePath);
  },
  setConfig: (config: any) => {
    // No-op for Bun
  }
};

// Re-export Bun test functions with Vitest names
export { describe, it, expect, beforeEach, afterEach, afterAll, beforeAll };

// Export test alias for it
export const test = it;