import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { screenshotCommand } from '../screenshot';
import { BrowserHelper } from '../../../../lib/browser-helper';

vi.mock('../../../../lib/browser-helper');

describe('screenshot command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('command structure', () => {
    it('should have correct command definition', () => {
      expect(screenshotCommand.command).toBe('screenshot [path]');
      expect(screenshotCommand.describe).toBe('Take a screenshot');
      expect(screenshotCommand.aliases).toEqual(['capture']);
    });
    
    it('should have proper builder', () => {
      expect(screenshotCommand.builder).toBeDefined();
    });
    
    it('should have handler', () => {
      expect(screenshotCommand.handler).toBeDefined();
    });
  });
  
  describe('handler execution', () => {
    it('should take a screenshot successfully', async () => {
      const mockPage = {
        screenshot: vi.fn().mockResolvedValue(undefined),
        $: vi.fn().mockResolvedValue(null)
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const argv = {
        path: 'test-screenshot.png',
        port: 9222,
        timeout: 30000,
        fullPage: false,
        selector: undefined,
        _: ['screenshot'],
        $0: 'playwright'
      };

      await screenshotCommand.handler(argv as any);

      expect(BrowserHelper.getActivePage).toHaveBeenCalledWith(9222);
      expect(mockPage.screenshot).toHaveBeenCalledWith({
        path: 'test-screenshot.png',
        fullPage: false
      });
    });

    it('should take a full page screenshot', async () => {
      const mockPage = {
        screenshot: vi.fn().mockResolvedValue(undefined),
        $: vi.fn().mockResolvedValue(null)
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const argv = {
        path: 'full-page.png',
        port: 9222,
        timeout: 30000,
        fullPage: true,
        selector: undefined,
        _: ['screenshot'],
        $0: 'playwright'
      };

      await screenshotCommand.handler(argv as any);

      expect(mockPage.screenshot).toHaveBeenCalledWith({
        path: 'full-page.png',
        fullPage: true
      });
    });

    it('should take element screenshot when selector provided', async () => {
      const mockElement = {
        screenshot: vi.fn().mockResolvedValue(undefined)
      };
      
      const mockPage = {
        screenshot: vi.fn().mockResolvedValue(undefined),
        $: vi.fn().mockResolvedValue(mockElement)
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const argv = {
        path: 'element.png',
        port: 9222,
        timeout: 30000,
        fullPage: false,
        selector: '#element',
        _: ['screenshot'],
        $0: 'playwright'
      };

      await screenshotCommand.handler(argv as any);

      expect(mockPage.$).toHaveBeenCalledWith('#element');
      expect(mockElement.screenshot).toHaveBeenCalledWith({ path: 'element.png' });
    });

    it('should throw error when no browser session', async () => {
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(null);
      
      const argv = {
        path: 'test.png',
        port: 9222,
        timeout: 30000,
        _: ['screenshot'],
        $0: 'playwright'
      };

      // Process.exit already mocked in global setup

      await expect(screenshotCommand.handler(argv as any)).rejects.toThrow('process.exit called');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should throw error when element not found', async () => {
      const mockPage = {
        screenshot: vi.fn().mockResolvedValue(undefined),
        $: vi.fn().mockResolvedValue(null)
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const argv = {
        path: 'element.png',
        port: 9222,
        timeout: 30000,
        selector: '#nonexistent',
        _: ['screenshot'],
        $0: 'playwright'
      };

      // Process.exit already mocked in global setup

      await expect(screenshotCommand.handler(argv as any)).rejects.toThrow('process.exit called');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});