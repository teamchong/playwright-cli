import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { evalCommand } from '../eval';
import { BrowserHelper } from '../../../../lib/browser-helper';

vi.mock('../../../../lib/browser-helper');

describe('eval command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('command structure', () => {
    it('should have correct command definition', () => {
      expect(evalCommand.command).toBe('eval <expression>');
      expect(evalCommand.describe).toBe('Execute JavaScript in the browser');
    });
    
    it('should have proper builder', () => {
      expect(evalCommand.builder).toBeDefined();
    });
    
    it('should have handler', () => {
      expect(evalCommand.handler).toBeDefined();
    });
  });
  
  describe('handler execution', () => {
    it('should execute JavaScript expression successfully', async () => {
      const mockPage = {
        evaluate: vi.fn().mockResolvedValue('Test Page Title')
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const mockLogger = {
        info: vi.fn(),
        commandError: vi.fn()
      };
      
      const context = {
        argv: {
          expression: 'document.title',
          port: 9222,
          json: false,
          timeout: 30000,
          _: ['eval'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      await evalCommand.handler(context as any);

      expect(BrowserHelper.getActivePage).toHaveBeenCalledWith(9222);
      expect(mockPage.evaluate).toHaveBeenCalledWith('document.title');
      expect(mockLogger.info).toHaveBeenCalledWith('Test Page Title');
    });

    it('should output result as JSON when requested', async () => {
      const mockResult = { title: 'Test', links: ['link1', 'link2'] };
      const mockPage = {
        evaluate: vi.fn().mockResolvedValue(mockResult)
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const mockLogger = {
        info: vi.fn(),
        commandError: vi.fn()
      };
      
      const context = {
        argv: {
          expression: 'document.querySelectorAll("a")',
          port: 9222,
          json: true,
          timeout: 30000,
          _: ['eval'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      await evalCommand.handler(context as any);

      expect(mockPage.evaluate).toHaveBeenCalledWith('document.querySelectorAll("a")');
      expect(mockLogger.info).toHaveBeenCalledWith(JSON.stringify(mockResult, null, 2));
    });

    it('should handle numeric results', async () => {
      const mockPage = {
        evaluate: vi.fn().mockResolvedValue(42)
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const mockLogger = {
        info: vi.fn(),
        commandError: vi.fn()
      };
      
      const context = {
        argv: {
          expression: 'document.querySelectorAll("div").length',
          port: 9222,
          json: false,
          timeout: 30000,
          _: ['eval'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      await evalCommand.handler(context as any);

      expect(mockLogger.info).toHaveBeenCalledWith('42');
    });

    it('should handle boolean results', async () => {
      const mockPage = {
        evaluate: vi.fn().mockResolvedValue(true)
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const mockLogger = {
        info: vi.fn(),
        commandError: vi.fn()
      };
      
      const context = {
        argv: {
          expression: 'document.querySelector("#test") !== null',
          port: 9222,
          json: false,
          timeout: 30000,
          _: ['eval'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      await evalCommand.handler(context as any);

      expect(mockLogger.info).toHaveBeenCalledWith('true');
    });

    it('should throw error when no browser session', async () => {
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(null);
      
      const mockLogger = {
        info: vi.fn(),
        commandError: vi.fn()
      };
      
      const context = {
        argv: {
          expression: 'document.title',
          port: 9222,
          json: false,
          timeout: 30000,
          _: ['eval'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      // Process.exit already mocked in global setup

      await expect(evalCommand.handler(context as any)).rejects.toThrow('process.exit called');
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(mockLogger.commandError).toHaveBeenCalledWith('Evaluation failed: No browser session. Use "playwright open" first');
    });

    it('should handle evaluation errors', async () => {
      const mockPage = {
        evaluate: vi.fn().mockRejectedValue(new Error('Syntax error'))
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const mockLogger = {
        info: vi.fn(),
        commandError: vi.fn()
      };
      
      const context = {
        argv: {
          expression: 'invalid.syntax(',
          port: 9222,
          json: false,
          timeout: 30000,
          _: ['eval'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      // Process.exit already mocked in global setup

      await expect(evalCommand.handler(context as any)).rejects.toThrow('process.exit called');
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(mockLogger.commandError).toHaveBeenCalledWith('Evaluation failed: Syntax error');
    });

    it('should handle null results', async () => {
      const mockPage = {
        evaluate: vi.fn().mockResolvedValue(null)
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const mockLogger = {
        info: vi.fn(),
        commandError: vi.fn()
      };
      
      const context = {
        argv: {
          expression: 'document.querySelector("#nonexistent")',
          port: 9222,
          json: false,
          timeout: 30000,
          _: ['eval'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      await evalCommand.handler(context as any);

      expect(mockLogger.info).toHaveBeenCalledWith('null');
    });
  });
});