import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import yargs from 'yargs';
import { uploadCommand } from '../upload';

// Mock BrowserHelper
vi.mock('../../../../lib/browser-helper', () => ({
  BrowserHelper: {
    withActivePage: vi.fn()
  }
}));

// Mock logger
vi.mock('../../../../lib/logger', () => ({
  logger: {
    success: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    commandError: vi.fn()
  }
}));

describe('upload command', () => {
  let parser: yargs.Argv;

  beforeEach(() => {
    vi.clearAllMocks();
    parser = yargs()
      .command(uploadCommand)
      .exitProcess(false)
      .strict();
  });

  describe('argument parsing', () => {
    it('should parse selector and single file', async () => {
      const result = await parser.parse(['upload', '#file-input', 'file1.pdf']);
      expect(result.selector).toBe('#file-input');
      expect(result.files).toEqual(['file1.pdf']);
    });

    it('should parse multiple files', async () => {
      const result = await parser.parse(['upload', '#file-input', 'file1.pdf', 'file2.jpg']);
      expect(result.selector).toBe('#file-input');
      expect(result.files).toEqual(['file1.pdf', 'file2.jpg']);
    });

    it('should require selector and at least one file', async () => {
      await expect(parser.parse(['upload'])).rejects.toThrow();
      await expect(parser.parse(['upload', '#file-input'])).rejects.toThrow();
    });

    it('should accept timeout option', async () => {
      const result = await parser.parse(['upload', '#file-input', 'file.pdf', '--timeout', '10000']);
      expect(result.timeout).toBe(10000);
    });
  });

  describe('handler execution', () => {
    it('should upload single file', async () => {
      const mockPage = {
        setInputFiles: vi.fn().mockResolvedValue(undefined)
      };

      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.withActivePage).mockImplementation(async (port, callback) => {
        return callback(mockPage as any);
      });

      await uploadCommand.handler({
        selector: '#file-input',
        files: ['file1.pdf'],
        port: 9222,
        timeout: 5000,
        _: ['upload'],
        $0: 'playwright'
      } as any);

      expect(mockPage.setInputFiles).toHaveBeenCalledWith('#file-input', ['file1.pdf'], {
        timeout: 5000
      });
    });

    it('should upload multiple files', async () => {
      const mockPage = {
        setInputFiles: vi.fn().mockResolvedValue(undefined)
      };

      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.withActivePage).mockImplementation(async (port, callback) => {
        return callback(mockPage as any);
      });

      await uploadCommand.handler({
        selector: '#file-input',
        files: ['file1.pdf', 'file2.jpg', 'file3.doc'],
        port: 9222,
        timeout: 5000,
        _: ['upload'],
        $0: 'playwright'
      } as any);

      expect(mockPage.setInputFiles).toHaveBeenCalledWith('#file-input', ['file1.pdf', 'file2.jpg', 'file3.doc'], {
        timeout: 5000
      });
    });

    it('should handle upload errors', async () => {
      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.withActivePage).mockRejectedValue(new Error('Not a file input'));

      await expect(uploadCommand.handler({
        selector: '#not-file-input',
        files: ['file.pdf'],
        port: 9222,
        timeout: 5000,
        _: ['upload'],
        $0: 'playwright'
      } as any)).rejects.toThrow('Not a file input');
    });
  });
});