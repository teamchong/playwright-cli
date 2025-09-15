import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import {
  environmentConfigMiddleware,
  globalOptionsMiddleware,
  browserConfigMiddleware,
  loggingMiddleware,
  selectorShorthandMiddleware,
  browserConnectionMiddleware,
  configFileMiddleware,
  globalMiddlewareChain,
  initializeGlobalState,
  resetGlobalState,
  getGlobalState,
  conditionalMiddleware,
  requiresBrowser,
  middleware
} from '../global-options';
import type { BaseCommandOptions } from '../../types';

// Mock the BrowserConfig module
vi.mock('../../../lib/browser-config', () => ({
  BrowserConfig: {
    getLastUsedBrowser: vi.fn().mockResolvedValue('chrome'),
    saveLastUsedBrowser: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('Global Options Middleware', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalChalkLevel: any;

  beforeEach(() => {
    originalEnv = { ...process.env };
    originalChalkLevel = chalk.level;
    resetGlobalState();
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    chalk.level = originalChalkLevel;
  });

  describe('environmentConfigMiddleware', () => {
    it('should load port from environment variable', async () => {
      process.env.PLAYWRIGHT_PORT = '8080';
      
      const argv = { port: 9222, _: ['test'], $0: 'cli' } as any;
      await environmentConfigMiddleware(argv);
      
      // Should not override existing port
      expect(argv.port).toBe(9222);
    });

    it('should set port from environment when not provided', async () => {
      process.env.PLAYWRIGHT_PORT = '8080';
      
      const argv = { _: ['test'], $0: 'cli' } as any;
      await environmentConfigMiddleware(argv);
      
      expect(argv.port).toBe(8080);
    });

    it('should set verbose from environment', async () => {
      process.env.PLAYWRIGHT_VERBOSE = 'true';
      
      const argv = { _: ['test'], $0: 'cli' } as any;
      await environmentConfigMiddleware(argv);
      
      expect(argv.verbose).toBe(true);
    });

    it('should set debug mode from environment', async () => {
      process.env.PLAYWRIGHT_DEBUG = 'true';
      
      const argv = { _: ['test'], $0: 'cli' } as any;
      await environmentConfigMiddleware(argv);
      
      expect(argv.verbose).toBe(true);
      expect(process.env.DEBUG).toBe('playwright:*');
    });

    it('should only apply environment config once', async () => {
      process.env.PLAYWRIGHT_PORT = '8080';
      
      const argv1 = { _: ['test'], $0: 'cli' } as any;
      const argv2 = { _: ['test'], $0: 'cli' } as any;
      
      await environmentConfigMiddleware(argv1);
      await environmentConfigMiddleware(argv2);
      
      expect(argv1.port).toBe(8080);
      expect(argv2.port).toBeUndefined(); // Should not be set on second call
    });
  });

  describe('globalOptionsMiddleware', () => {
    it('should disable colors when color is false', async () => {
      const argv = { port: 9222, color: false, _: ['test'], $0: 'cli' } as any;
      await globalOptionsMiddleware(argv);
      
      expect(chalk.level).toBe(0);
    });

    it('should disable colors when NO_COLOR environment is set', async () => {
      process.env.NO_COLOR = '1';
      
      const argv = { port: 9222, _: ['test'], $0: 'cli' } as any;
      await globalOptionsMiddleware(argv);
      
      expect(chalk.level).toBe(0);
    });

    it('should handle conflicting verbose and quiet flags', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const argv = { port: 9222, verbose: true, quiet: true, _: ['test'], $0: 'cli' } as any;
      await globalOptionsMiddleware(argv);
      
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Both --quiet and --verbose specified')
      );
      expect(argv.quiet).toBe(false);
      expect(argv.verbose).toBe(true);
      
      consoleError.mockRestore();
    });

    it('should set environment variables', async () => {
      const argv = { port: 8080, verbose: true, quiet: false, _: ['test'], $0: 'cli' } as any;
      await globalOptionsMiddleware(argv);
      
      expect(process.env.PLAYWRIGHT_VERBOSE).toBe('true');
      expect(process.env.PLAYWRIGHT_PORT).toBe('8080');
    });

    it('should validate port number', async () => {
      const argv = { port: 70000, _: ['test'], $0: 'cli' } as any;
      
      await expect(globalOptionsMiddleware(argv)).rejects.toThrow('Invalid port number');
    });

    it('should set default port if not provided', async () => {
      const argv = { _: ['test'], $0: 'cli' } as any;
      await globalOptionsMiddleware(argv);
      
      expect(argv.port).toBe(9222);
    });
  });

  describe('selectorShorthandMiddleware', () => {
    it('should transform button shorthand', () => {
      const argv = { selector: 'button:Login', _: ['click'], $0: 'cli' } as any;
      selectorShorthandMiddleware(argv);
      
      expect(argv.selector).toBe('button:has-text("Login")');
    });

    it('should transform link shorthand', () => {
      const argv = { selector: 'link:Home', _: ['click'], $0: 'cli' } as any;
      selectorShorthandMiddleware(argv);
      
      expect(argv.selector).toBe('a:has-text("Home")');
    });

    it('should transform text shorthand', () => {
      const argv = { selector: 'text:Submit', _: ['click'], $0: 'cli' } as any;
      selectorShorthandMiddleware(argv);
      
      expect(argv.selector).toBe(':has-text("Submit")');
    });

    it('should transform input shorthand', () => {
      const argv = { selector: 'input:email', _: ['fill'], $0: 'cli' } as any;
      selectorShorthandMiddleware(argv);
      
      expect(argv.selector).toBe('input[placeholder*="email" i], input[name*="email" i], input[id*="email" i]');
    });

    it('should not transform regular selectors', () => {
      const argv = { selector: '#button', _: ['click'], $0: 'cli' } as any;
      const original = argv.selector;
      
      selectorShorthandMiddleware(argv);
      
      expect(argv.selector).toBe(original);
    });

    it('should not transform complex selectors', () => {
      const argv = { selector: '[data-test="button"]', _: ['click'], $0: 'cli' } as any;
      const original = argv.selector;
      
      selectorShorthandMiddleware(argv);
      
      expect(argv.selector).toBe(original);
    });

    it('should log transformation in verbose mode', () => {
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const argv = { selector: 'button:Login', verbose: true, _: ['click'], $0: 'cli' } as any;
      selectorShorthandMiddleware(argv);
      
      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Transformed selector')
      );
      
      consoleLog.mockRestore();
    });
  });

  describe('loggingMiddleware', () => {
    it('should log command start in verbose mode', async () => {
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const argv = { port: 9222, verbose: true, _: ['click'], $0: 'cli' } as any;
      await loggingMiddleware(argv);
      
      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Starting command: click')
      );
      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Port: 9222')
      );
      
      consoleLog.mockRestore();
    });

    it('should not log in quiet mode', async () => {
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const argv = { port: 9222, verbose: false, _: ['click'], $0: 'cli' } as any;
      await loggingMiddleware(argv);
      
      expect(consoleLog).not.toHaveBeenCalled();
      
      consoleLog.mockRestore();
    });
  });

  describe('browserConnectionMiddleware', () => {
    it('should require port for browser commands', async () => {
      const argv = { _: ['click'], $0: 'cli' } as any;
      
      await expect(browserConnectionMiddleware(argv)).rejects.toThrow('Port is required');
    });

    it('should succeed with valid port', async () => {
      const argv = { port: 9222, _: ['click'], $0: 'cli' } as any;
      
      await expect(browserConnectionMiddleware(argv)).resolves.toBeUndefined();
    });

    it('should log connection details in verbose mode', async () => {
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const argv = { port: 9222, verbose: true, _: ['click'], $0: 'cli' } as any;
      await browserConnectionMiddleware(argv);
      
      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Will connect to browser on port 9222')
      );
      
      consoleLog.mockRestore();
    });
  });

  describe('globalMiddlewareChain', () => {
    it('should run all middleware in order', async () => {
      // Note: Yargs sets the default port to 9222, but when calling middleware directly
      // we need to provide it since middleware doesn't set defaults
      const argv = { _: ['click'], $0: 'cli', port: 9222 } as any;
      
      await globalMiddlewareChain(argv);
      
      // Should preserve the port value
      expect(argv.port).toBe(9222);
    });

    it('should apply selector shorthand for commands with selectors', async () => {
      const argv = { selector: 'button:Login', _: ['click'], $0: 'cli' } as any;
      
      await globalMiddlewareChain(argv);
      
      expect(argv.selector).toBe('button:has-text("Login")');
    });
  });

  describe('utility functions', () => {
    it('should identify browser commands correctly', () => {
      expect(requiresBrowser({ _: ['click'], $0: 'cli' } as any)).toBe(true);
      expect(requiresBrowser({ _: ['screenshot'], $0: 'cli' } as any)).toBe(true);
      expect(requiresBrowser({ _: ['install'], $0: 'cli' } as any)).toBe(false);
      expect(requiresBrowser({ _: ['version'], $0: 'cli' } as any)).toBe(false);
    });

    it('should create conditional middleware', async () => {
      const mockMiddleware = vi.fn().mockResolvedValue(undefined);
      const condition = (argv: any) => argv.test === true;
      
      const conditionalMw = conditionalMiddleware(condition, mockMiddleware);
      
      // Should run when condition is true
      await conditionalMw({ test: true, _: [], $0: 'cli' } as any);
      expect(mockMiddleware).toHaveBeenCalled();
      
      mockMiddleware.mockClear();
      
      // Should not run when condition is false
      await conditionalMw({ test: false, _: [], $0: 'cli' } as any);
      expect(mockMiddleware).not.toHaveBeenCalled();
    });

    it('should provide global state access', () => {
      initializeGlobalState();
      const state = getGlobalState();
      
      expect(state).toHaveProperty('startTime');
      expect(state).toHaveProperty('config');
      expect(state).toHaveProperty('environmentApplied');
      expect(state).toHaveProperty('browserConfigLoaded');
    });

    it('should reset global state', () => {
      const state1 = getGlobalState();
      const originalTime = state1.startTime;
      
      // Wait a bit then reset
      setTimeout(() => {
        resetGlobalState();
        const state2 = getGlobalState();
        expect(state2.startTime).toBeGreaterThan(originalTime);
      }, 10);
    });
  });

  describe('configFileMiddleware', () => {
    it('should skip when no config file exists', async () => {
      const argv = { _: ['test'], $0: 'cli' } as any;
      
      // Should not throw when config files don't exist
      await expect(configFileMiddleware(argv)).resolves.toBeUndefined();
    });

    // Note: Testing actual file loading would require mocking fs module
    // which is complex in this context. The middleware handles file not found gracefully.
  });

  describe('middleware object', () => {
    it('should export individual middleware functions', () => {
      expect(middleware).toHaveProperty('environmentConfig');
      expect(middleware).toHaveProperty('configFile');
      expect(middleware).toHaveProperty('globalOptions');
      expect(middleware).toHaveProperty('browserConfig');
      expect(middleware).toHaveProperty('logging');
      expect(middleware).toHaveProperty('selectorShorthand');
      expect(middleware).toHaveProperty('browserConnection');
      
      expect(typeof middleware.environmentConfig).toBe('function');
      expect(typeof middleware.globalOptions).toBe('function');
    });
  });
});