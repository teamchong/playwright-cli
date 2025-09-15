import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import yargs from 'yargs';
import { typeCommand } from '../type';

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

describe('type command', () => {
  let parser: yargs.Argv;

  beforeEach(() => {
    vi.clearAllMocks();
    parser = yargs()
      .command(typeCommand)
      .exitProcess(false)
      .strict();
  });

  describe('argument parsing', () => {
    it('should parse selector and text arguments', async () => {
      const result = await parser.parse(['type', '#input', 'Hello World']);
      expect(result.selector).toBe('#input');
      expect(result.text).toBe('Hello World');
    });

    it('should require both arguments', async () => {
      await expect(parser.parse(['type'])).rejects.toThrow();
      await expect(parser.parse(['type', '#input'])).rejects.toThrow();
    });

    it('should accept delay option', async () => {
      const result = await parser.parse(['type', '#input', 'text', '--delay', '100']);
      expect(result.delay).toBe(100);
    });

    it('should accept timeout option', async () => {
      const result = await parser.parse(['type', '#input', 'text', '--timeout', '10000']);
      expect(result.timeout).toBe(10000);
    });

    it('should accept clear option', async () => {
      const result = await parser.parse(['type', '#input', 'text', '--clear']);
      expect(result.clear).toBe(true);
    });
  });

  describe('handler execution', () => {
    it('should type text with default options', async () => {
      const mockPage = {
        type: vi.fn().mockResolvedValue(undefined)
      };

      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.withActivePage).mockImplementation(async (port, callback) => {
        return callback(mockPage as any);
      });

      await typeCommand.handler({
        selector: '#input',
        text: 'Hello World',
        port: 9222,
        delay: 0,
        timeout: 5000,
        clear: false,
        _: ['type'],
        $0: 'playwright'
      } as any);

      expect(mockPage.type).toHaveBeenCalledWith('#input', 'Hello World', {
        delay: 0,
        timeout: 5000
      });
    });

    it('should clear field before typing when clear option is set', async () => {
      const mockPage = {
        fill: vi.fn().mockResolvedValue(undefined),
        type: vi.fn().mockResolvedValue(undefined)
      };

      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.withActivePage).mockImplementation(async (port, callback) => {
        return callback(mockPage as any);
      });

      await typeCommand.handler({
        selector: '#input',
        text: 'New Text',
        port: 9222,
        delay: 0,
        timeout: 5000,
        clear: true,
        _: ['type'],
        $0: 'playwright'
      } as any);

      expect(mockPage.fill).toHaveBeenCalledWith('#input', '');
      expect(mockPage.type).toHaveBeenCalledWith('#input', 'New Text', {
        delay: 0,
        timeout: 5000
      });
    });

    it('should handle typing errors', async () => {
      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.withActivePage).mockRejectedValue(new Error('Element not found'));

      await expect(typeCommand.handler({
        selector: '#input',
        text: 'text',
        port: 9222,
        delay: 0,
        timeout: 5000,
        clear: false,
        _: ['type'],
        $0: 'playwright'
      } as any)).rejects.toThrow('Element not found');
    });
  });
});