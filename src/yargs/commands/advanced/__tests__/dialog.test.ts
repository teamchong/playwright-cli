import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { dialogCommand } from '../dialog';
import { BrowserHelper } from '../../../../lib/browser-helper';

vi.mock('../../../../lib/browser-helper');

describe('dialog command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('command structure', () => {
    it('should have correct command definition', () => {
      expect(dialogCommand.command).toBe('dialog <action>');
      expect(dialogCommand.describe).toBe('Handle browser dialogs (alert, confirm, prompt)');
    });
    
    it('should have proper builder', () => {
      expect(dialogCommand.builder).toBeDefined();
    });
    
    it('should have handler', () => {
      expect(dialogCommand.handler).toBeDefined();
    });
  });
  
  describe('handler execution', () => {
    it('should handle accept action', async () => {
      const mockPage = {
        on: vi.fn(),
        evaluate: vi.fn().mockResolvedValue(undefined)
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        success: vi.fn()
      };
      
      const context = {
        argv: {
          action: 'accept',
          port: 9222,
          text: undefined,
          _: ['dialog'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      await dialogCommand.handler(context as any);

      expect(BrowserHelper.getActivePage).toHaveBeenCalledWith(9222);
      expect(mockPage.on).toHaveBeenCalledWith('dialog', expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith('Waiting for dialogs... (will auto-accept)');
    });

    it('should handle dismiss action', async () => {
      const mockPage = {
        on: vi.fn(),
        evaluate: vi.fn().mockResolvedValue(undefined)
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        success: vi.fn()
      };
      
      const context = {
        argv: {
          action: 'dismiss',
          port: 9222,
          text: undefined,
          _: ['dialog'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      await dialogCommand.handler(context as any);

      expect(mockPage.on).toHaveBeenCalledWith('dialog', expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith('Waiting for dialogs... (will auto-dismiss)');
    });

    it('should handle dialog events correctly', async () => {
      const mockPage = {
        on: vi.fn(),
        evaluate: vi.fn().mockResolvedValue(undefined)
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        success: vi.fn()
      };
      
      const context = {
        argv: {
          action: 'accept',
          port: 9222,
          text: 'test input',
          _: ['dialog'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      await dialogCommand.handler(context as any);

      // Get the dialog listener function
      const dialogListener = mockPage.on.mock.calls[0][1];
      
      // Test dialog handling
      const mockDialog = {
        type: () => 'prompt',
        message: () => 'Enter your name:',
        accept: vi.fn().mockResolvedValue(undefined),
        dismiss: vi.fn().mockResolvedValue(undefined)
      };
      
      await dialogListener(mockDialog);
      
      expect(mockDialog.accept).toHaveBeenCalledWith('test input');
      expect(mockLogger.success).toHaveBeenCalledWith('Accepted prompt dialog: "Enter your name:"');
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
          action: 'accept',
          port: 9222,
          _: ['dialog'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      // Process.exit already mocked in global setup

      await expect(dialogCommand.handler(context as any)).rejects.toThrow('process.exit called');
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(mockLogger.error).toHaveBeenCalledWith('Dialog handling failed: No browser session. Use "playwright open" first');
    });
  });
});