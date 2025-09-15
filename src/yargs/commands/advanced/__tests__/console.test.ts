import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { consoleCommand } from '../console';
import { BrowserHelper } from '../../../../lib/browser-helper';

vi.mock('../../../../lib/browser-helper');

describe('console command', () => {
  let originalExit: typeof process.exit;
  let originalStdin: typeof process.stdin;
  let originalStdinResume: typeof process.stdin.resume;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Save originals
    originalExit = process.exit;
    originalStdin = process.stdin;
    originalStdinResume = process.stdin.resume;
    
    // Mock process.exit globally
    process.exit = vi.fn((code?: number) => {
      throw new Error(`process.exit called with code ${code}`);
    }) as any;
    
    // Mock process.stdin.resume
    process.stdin.resume = vi.fn().mockReturnValue(process.stdin);
  });
  
  afterEach(() => {
    // Restore originals
    process.exit = originalExit;
    Object.defineProperty(process, 'stdin', {
      value: originalStdin,
      writable: true,
      configurable: true
    });
    process.stdin.resume = originalStdinResume;
  });
  
  describe('command structure', () => {
    it('should have correct command definition', () => {
      expect(consoleCommand.command).toBe('console');
      expect(consoleCommand.describe).toBe('Monitor browser console output');
    });
    
    it('should have proper builder', () => {
      expect(consoleCommand.builder).toBeDefined();
    });
    
    it('should have handler', () => {
      expect(consoleCommand.handler).toBeDefined();
    });
  });
  
  describe('handler execution', () => {
    it('should set up console listener and monitor messages', async () => {
      const mockPage = {
        on: vi.fn(),
        evaluate: vi.fn().mockResolvedValue(undefined)
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn()
      };
      
      const context = {
        argv: {
          port: 9222,
          once: true,
          filter: 'all',
          json: false,
          _: ['console'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      await expect(consoleCommand.handler(context as any)).rejects.toThrow('process.exit called with code 0');

      expect(BrowserHelper.getActivePage).toHaveBeenCalledWith(9222);
      expect(mockPage.on).toHaveBeenCalledWith('console', expect.any(Function));
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should format console messages properly for different types', async () => {
      const mockPage = {
        on: vi.fn(),
        evaluate: vi.fn().mockResolvedValue(undefined)
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn()
      };
      
      const context = {
        argv: {
          port: 9222,
          once: true,
          filter: 'all',
          json: false,
          _: ['console'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      // Process.exit already mocked in global setup

      await expect(consoleCommand.handler(context as any)).rejects.toThrow('process.exit called');

      // Get the console listener function
      const consoleListener = mockPage.on.mock.calls[0][1];
      
      // Test different message types
      const createMockMsg = (type: string, text: string) => ({
        type: () => type,
        text: () => text
      });
      
      // Test error message
      consoleListener(createMockMsg('error', 'Test error'));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('[error] Test error'));
      
      // Test warning message
      consoleListener(createMockMsg('warning', 'Test warning'));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('[warning] Test warning'));
      
      // Test info message
      consoleListener(createMockMsg('info', 'Test info'));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('[info] Test info'));
    });

    it('should filter messages by type when filter is specified', async () => {
      const mockPage = {
        on: vi.fn(),
        evaluate: vi.fn().mockResolvedValue(undefined)
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn()
      };
      
      const context = {
        argv: {
          port: 9222,
          once: true,
          filter: 'error',
          json: false,
          _: ['console'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      // Process.exit already mocked in global setup

      await expect(consoleCommand.handler(context as any)).rejects.toThrow('process.exit called');

      // Get the console listener function
      const consoleListener = mockPage.on.mock.calls[0][1];
      
      const createMockMsg = (type: string, text: string) => ({
        type: () => type,
        text: () => text
      });
      
      const initialCallCount = mockLogger.info.mock.calls.length;
      
      // This should be logged (matches filter)
      consoleListener(createMockMsg('error', 'Test error'));
      
      // This should NOT be logged (doesn't match filter)
      consoleListener(createMockMsg('info', 'Test info'));
      
      // Only one additional call should have been made for the error message
      expect(mockLogger.info.mock.calls.length).toBe(initialCallCount + 1);
    });

    it('should output messages as JSON when requested', async () => {
      const mockPage = {
        on: vi.fn(),
        evaluate: vi.fn().mockResolvedValue(undefined)
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn()
      };
      
      const context = {
        argv: {
          port: 9222,
          once: true,
          filter: 'all',
          json: true,
          _: ['console'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      // Process.exit already mocked in global setup

      await expect(consoleCommand.handler(context as any)).rejects.toThrow('process.exit called');

      // Get the console listener function
      const consoleListener = mockPage.on.mock.calls[0][1];
      
      const createMockMsg = (type: string, text: string) => ({
        type: () => type,
        text: () => text
      });
      
      // Trigger a console message
      consoleListener(createMockMsg('info', 'Test message'));
      
      // Should output JSON format
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('"type":"info"')
      );
    });

    it('should throw error when no browser session', async () => {
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(null);
      
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn()
      };
      
      const context = {
        argv: {
          port: 9222,
          once: false,
          filter: 'all',
          json: false,
          _: ['console'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      // Process.exit already mocked in global setup

      await expect(consoleCommand.handler(context as any)).rejects.toThrow('process.exit called with code 1');
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(mockLogger.error).toHaveBeenCalledWith('Console monitoring failed: No browser session. Use "playwright open" first');
    });

    it('should handle continuous monitoring mode', async () => {
      const mockPage = {
        on: vi.fn(),
        evaluate: vi.fn().mockResolvedValue(undefined)
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn()
      };
      
      const context = {
        argv: {
          port: 9222,
          once: false,
          filter: 'all',
          json: false,
          _: ['console'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      // Mock process.stdin.resume to prevent hanging in tests
      // stdin.resume already mocked in global setup

      // We need to simulate the handler execution without the infinite loop
      // In a real test environment, this would run indefinitely
      const handlerPromise = consoleCommand.handler(context as any);
      
      // Let it run briefly
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(BrowserHelper.getActivePage).toHaveBeenCalledWith(9222);
      expect(mockPage.on).toHaveBeenCalledWith('console', expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith('Monitoring console... Press Ctrl+C to exit');
      expect(process.stdin.resume).toHaveBeenCalled();
    });
  });
});