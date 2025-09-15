import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { resizeCommand } from '../resize';
import { BrowserHelper } from '../../../../lib/browser-helper';

vi.mock('../../../../lib/browser-helper');

describe('resize command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('command structure', () => {
    it('should have correct command definition', () => {
      expect(resizeCommand.command).toBe('resize <width> <height>');
      expect(resizeCommand.describe).toBe('Resize browser window');
    });
    
    it('should have proper builder', () => {
      expect(resizeCommand.builder).toBeDefined();
    });
    
    it('should have handler', () => {
      expect(resizeCommand.handler).toBeDefined();
    });
  });
  
  describe('handler execution', () => {
    it('should resize window successfully', async () => {
      const mockPage = {
        setViewportSize: vi.fn().mockResolvedValue(undefined)
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const argv = {
        width: '1920',
        height: '1080',
        port: 9222,
        timeout: 30000,
        _: ['resize'],
        $0: 'playwright'
      };

      await resizeCommand.handler(argv as any);

      expect(BrowserHelper.getActivePage).toHaveBeenCalledWith(9222);
      expect(mockPage.setViewportSize).toHaveBeenCalledWith({
        width: 1920,
        height: 1080
      });
    });

    it('should handle different viewport sizes', async () => {
      const mockPage = {
        setViewportSize: vi.fn().mockResolvedValue(undefined)
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const argv = {
        width: '800',
        height: '600',
        port: 9222,
        timeout: 30000,
        _: ['resize'],
        $0: 'playwright'
      };

      await resizeCommand.handler(argv as any);

      expect(mockPage.setViewportSize).toHaveBeenCalledWith({
        width: 800,
        height: 600
      });
    });

    it('should throw error when no active page', async () => {
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(null);
      
      const argv = {
        width: '1920',
        height: '1080',
        port: 9222,
        timeout: 30000,
        _: ['resize'],
        $0: 'playwright'
      };

      // Process.exit already mocked in global setup

      await expect(resizeCommand.handler(argv as any)).rejects.toThrow('process.exit called');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should throw error for invalid width', async () => {
      const mockPage = {
        setViewportSize: vi.fn().mockResolvedValue(undefined)
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const argv = {
        width: 'invalid',
        height: '1080',
        port: 9222,
        timeout: 30000,
        _: ['resize'],
        $0: 'playwright'
      };

      // Process.exit already mocked in global setup

      await expect(resizeCommand.handler(argv as any)).rejects.toThrow('process.exit called');
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(mockPage.setViewportSize).not.toHaveBeenCalled();
    });

    it('should throw error for invalid height', async () => {
      const mockPage = {
        setViewportSize: vi.fn().mockResolvedValue(undefined)
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const argv = {
        width: '1920',
        height: 'invalid',
        port: 9222,
        timeout: 30000,
        _: ['resize'],
        $0: 'playwright'
      };

      // Process.exit already mocked in global setup

      await expect(resizeCommand.handler(argv as any)).rejects.toThrow('process.exit called');
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(mockPage.setViewportSize).not.toHaveBeenCalled();
    });

    it('should handle setViewportSize errors', async () => {
      const mockPage = {
        setViewportSize: vi.fn().mockRejectedValue(new Error('Resize failed'))
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const argv = {
        width: '1920',
        height: '1080',
        port: 9222,
        timeout: 30000,
        _: ['resize'],
        $0: 'playwright'
      };

      // Process.exit already mocked in global setup

      await expect(resizeCommand.handler(argv as any)).rejects.toThrow('process.exit called');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});