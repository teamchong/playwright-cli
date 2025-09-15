import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { pdfCommand } from '../pdf';
import { BrowserHelper } from '../../../../lib/browser-helper';

vi.mock('../../../../lib/browser-helper');

describe('pdf command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('command structure', () => {
    it('should have correct command definition', () => {
      expect(pdfCommand.command).toBe('pdf [path]');
      expect(pdfCommand.describe).toBe('Save page as PDF');
    });
    
    it('should have proper builder', () => {
      expect(pdfCommand.builder).toBeDefined();
    });
    
    it('should have handler', () => {
      expect(pdfCommand.handler).toBeDefined();
    });
  });
  
  describe('handler execution', () => {
    it('should generate PDF successfully with default options', async () => {
      const mockPage = {
        pdf: vi.fn().mockResolvedValue(undefined)
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const argv = {
        path: 'page.pdf',
        port: 9222,
        timeout: 30000,
        format: 'A4',
        _: ['pdf'],
        $0: 'playwright'
      };

      await pdfCommand.handler(argv as any);

      expect(BrowserHelper.getActivePage).toHaveBeenCalledWith(9222);
      expect(mockPage.pdf).toHaveBeenCalledWith({
        path: 'page.pdf',
        format: 'A4'
      });
    });

    it('should generate PDF with custom format', async () => {
      const mockPage = {
        pdf: vi.fn().mockResolvedValue(undefined)
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const argv = {
        path: 'letter.pdf',
        port: 9222,
        timeout: 30000,
        format: 'Letter',
        _: ['pdf'],
        $0: 'playwright'
      };

      await pdfCommand.handler(argv as any);

      expect(mockPage.pdf).toHaveBeenCalledWith({
        path: 'letter.pdf',
        format: 'Letter'
      });
    });

    it('should throw error when no browser session', async () => {
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(null);
      
      const argv = {
        path: 'test.pdf',
        port: 9222,
        timeout: 30000,
        format: 'A4',
        _: ['pdf'],
        $0: 'playwright'
      };

      // Process.exit already mocked in global setup

      await expect(pdfCommand.handler(argv as any)).rejects.toThrow('process.exit called');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle PDF generation errors', async () => {
      const mockPage = {
        pdf: vi.fn().mockRejectedValue(new Error('PDF generation failed'))
      };
      
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const argv = {
        path: 'test.pdf',
        port: 9222,
        timeout: 30000,
        format: 'A4',
        _: ['pdf'],
        $0: 'playwright'
      };

      // Process.exit already mocked in global setup

      await expect(pdfCommand.handler(argv as any)).rejects.toThrow('process.exit called');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});