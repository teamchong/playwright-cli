import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { listCommand } from '../list';
import { BrowserHelper } from '../../../../lib/browser-helper';

vi.mock('../../../../lib/browser-helper');

describe('list command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('command structure', () => {
    it('should have correct command definition', () => {
      expect(listCommand.command).toBe('list');
      expect(listCommand.describe).toBe('List open pages and contexts');
    });
    
    it('should have proper builder', () => {
      expect(listCommand.builder).toBeDefined();
    });
    
    it('should have handler', () => {
      expect(listCommand.handler).toBeDefined();
    });
  });
  
  describe('handler execution', () => {
    it('should list contexts and pages successfully', async () => {
      const mockPage1 = {
        url: () => 'https://example.com',
        title: () => 'Example Site'
      };

      const mockPage2 = {
        url: () => 'https://google.com',
        title: () => 'Google'
      };

      const mockContext = {
        pages: () => [mockPage1, mockPage2]
      };

      vi.mocked(BrowserHelper.getContexts).mockResolvedValue([mockContext] as any);
      vi.mocked(BrowserHelper.getPages).mockResolvedValue([mockPage1, mockPage2] as any);
      
      const argv = {
        port: 9222,
        timeout: 30000,
        _: ['list'],
        $0: 'playwright'
      };

      await listCommand.handler(argv as any);

      expect(BrowserHelper.getContexts).toHaveBeenCalledWith(9222);
      expect(BrowserHelper.getPages).toHaveBeenCalledWith(9222);
    });

    it('should handle empty contexts and pages', async () => {
      vi.mocked(BrowserHelper.getContexts).mockResolvedValue([]);
      vi.mocked(BrowserHelper.getPages).mockResolvedValue([]);
      
      const argv = {
        port: 9222,
        timeout: 30000,
        _: ['list'],
        $0: 'playwright'
      };

      await listCommand.handler(argv as any);

      expect(BrowserHelper.getContexts).toHaveBeenCalledWith(9222);
      expect(BrowserHelper.getPages).toHaveBeenCalledWith(9222);
    });

    it('should handle context with no pages', async () => {
      const mockContext = {
        pages: () => []
      };

      vi.mocked(BrowserHelper.getContexts).mockResolvedValue([mockContext] as any);
      vi.mocked(BrowserHelper.getPages).mockResolvedValue([]);
      
      const argv = {
        port: 9222,
        timeout: 30000,
        _: ['list'],
        $0: 'playwright'
      };

      await listCommand.handler(argv as any);

      expect(BrowserHelper.getContexts).toHaveBeenCalledWith(9222);
      expect(BrowserHelper.getPages).toHaveBeenCalledWith(9222);
    });

    it('should handle local URLs', async () => {
      const mockPage = {
        url: () => 'file:///local/file.html',
        title: () => 'Local File'
      };

      const mockContext = {
        pages: () => [mockPage]
      };

      vi.mocked(BrowserHelper.getContexts).mockResolvedValue([mockContext] as any);
      vi.mocked(BrowserHelper.getPages).mockResolvedValue([mockPage] as any);
      
      const argv = {
        port: 9222,
        timeout: 30000,
        _: ['list'],
        $0: 'playwright'
      };

      await listCommand.handler(argv as any);

      expect(BrowserHelper.getContexts).toHaveBeenCalledWith(9222);
      expect(BrowserHelper.getPages).toHaveBeenCalledWith(9222);
    });

    it('should handle no browser running error', async () => {
      vi.mocked(BrowserHelper.getContexts).mockRejectedValue(
        new Error('No browser running')
      );
      
      const argv = {
        port: 9222,
        timeout: 30000,
        _: ['list'],
        $0: 'playwright'
      };

      // Process.exit already mocked in global setup

      await expect(listCommand.handler(argv as any)).rejects.toThrow('process.exit called');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle general connection errors', async () => {
      vi.mocked(BrowserHelper.getContexts).mockRejectedValue(
        new Error('Connection failed')
      );
      
      const argv = {
        port: 9222,
        timeout: 30000,
        _: ['list'],
        $0: 'playwright'
      };

      // Process.exit already mocked in global setup

      await expect(listCommand.handler(argv as any)).rejects.toThrow('process.exit called');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});