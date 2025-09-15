import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { perfCommand } from '../perf';
import { BrowserHelper } from '../../../../lib/browser-helper';

vi.mock('../../../../lib/browser-helper');

describe('perf command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('command structure', () => {
    it('should have correct command definition', () => {
      expect(perfCommand.command).toBe('perf');
      expect(perfCommand.describe).toBe('Monitor performance metrics');
    });
    
    it('should have proper builder', () => {
      expect(perfCommand.builder).toBeDefined();
    });
    
    it('should have handler', () => {
      expect(perfCommand.handler).toBeDefined();
    });
  });
  
  describe('handler execution', () => {
    it('should collect performance metrics successfully', async () => {
      const mockPerformanceMetrics = {
        Timestamp: 123456,
        Documents: 1,
        Frames: 1,
        JSEventListeners: 5,
        Nodes: 100,
        LayoutCount: 2,
        RecalcStyleCount: 3,
        LayoutDuration: 0.01,
        RecalcStyleDuration: 0.005,
        ScriptDuration: 0.02,
        TaskDuration: 0.05,
        JSHeapUsedSize: 2048000,
        JSHeapTotalSize: 4096000
      };
      
      const mockCDPSession = {
        send: vi.fn().mockResolvedValue({ metrics: mockPerformanceMetrics })
      };
      
      const mockPage = {
        context: () => ({
          newCDPSession: vi.fn().mockResolvedValue(mockCDPSession)
        })
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        success: vi.fn()
      };
      
      const context = {
        argv: {
          port: 9222,
          json: false,
          watch: false,
          interval: 1000,
          _: ['perf'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      await perfCommand.handler(context as any);

      expect(BrowserHelper.getActivePage).toHaveBeenCalledWith(9222);
      expect(mockCDPSession.send).toHaveBeenCalledWith('Performance.getMetrics');
      expect(mockLogger.info).toHaveBeenCalledWith('📊 Performance Metrics:');
    });

    it('should output metrics as JSON when requested', async () => {
      const mockPerformanceMetrics = {
        Timestamp: 123456,
        JSHeapUsedSize: 2048000
      };
      
      const mockCDPSession = {
        send: vi.fn().mockResolvedValue({ metrics: mockPerformanceMetrics })
      };
      
      const mockPage = {
        context: () => ({
          newCDPSession: vi.fn().mockResolvedValue(mockCDPSession)
        })
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        success: vi.fn()
      };
      
      const context = {
        argv: {
          port: 9222,
          json: true,
          watch: false,
          interval: 1000,
          _: ['perf'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      await perfCommand.handler(context as any);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('"Timestamp":123456')
      );
    });

    it('should handle watch mode', async () => {
      const mockPerformanceMetrics = {
        Timestamp: 123456,
        JSHeapUsedSize: 2048000
      };
      
      const mockCDPSession = {
        send: vi.fn().mockResolvedValue({ metrics: mockPerformanceMetrics })
      };
      
      const mockPage = {
        context: () => ({
          newCDPSession: vi.fn().mockResolvedValue(mockCDPSession)
        })
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        success: vi.fn()
      };
      
      const context = {
        argv: {
          port: 9222,
          json: false,
          watch: true,
          interval: 100, // Short interval for test
          _: ['perf'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      // Mock setInterval to prevent infinite loop in tests
      const originalSetInterval = global.setInterval;
      let intervalCallback: Function;
      global.setInterval = vi.fn((cb, _interval) => {
        intervalCallback = cb;
        return 123 as any;
      });

      // stdin.resume already mocked in global setup

      const handlerPromise = perfCommand.handler(context as any);
      
      // Let it run briefly
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockLogger.info).toHaveBeenCalledWith('Monitoring performance... Press Ctrl+C to exit');
      expect(global.setInterval).toHaveBeenCalledWith(expect.any(Function), 100);
      
      // Cleanup
      global.setInterval = originalSetInterval;
      
    });

    it('should throw error when no browser session', async () => {
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(null);
      
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        success: vi.fn()
      };
      
      const context = {
        argv: {
          port: 9222,
          json: false,
          watch: false,
          _: ['perf'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      // Process.exit already mocked in global setup

      await expect(perfCommand.handler(context as any)).rejects.toThrow('process.exit called');
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(mockLogger.error).toHaveBeenCalledWith('Performance monitoring failed: No browser session. Use "playwright open" first');
    });
  });
});