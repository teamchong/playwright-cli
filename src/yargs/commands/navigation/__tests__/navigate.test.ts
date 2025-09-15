import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import yargs from 'yargs';
import { navigateCommand } from '../navigate';

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

describe('navigate command', () => {
  let parser: yargs.Argv;

  beforeEach(() => {
    vi.clearAllMocks();
    parser = yargs()
      .command(navigateCommand)
      .exitProcess(false)
      .strict();
  });

  describe('argument parsing', () => {
    it('should parse URL argument', async () => {
      const result = await parser.parse(['navigate', 'https://example.com']);
      expect(result.url).toBe('https://example.com');
    });

    it('should require URL argument', async () => {
      await expect(parser.parse(['navigate'])).rejects.toThrow();
    });

    it('should accept port option', async () => {
      const result = await parser.parse(['navigate', 'https://example.com', '--port', '8080']);
      expect(result.port).toBe(8080);
    });

    it('should accept timeout option', async () => {
      const result = await parser.parse(['navigate', 'https://example.com', '--timeout', '10000']);
      expect(result.timeout).toBe(10000);
    });

    it('should accept wait-until option', async () => {
      const result = await parser.parse(['navigate', 'https://example.com', '--wait-until', 'networkidle']);
      expect(result.waitUntil).toBe('networkidle');
    });
  });

  describe('handler execution', () => {
    it('should navigate to URL with default options', async () => {
      const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        url: vi.fn().mockReturnValue('https://example.com'),
        title: vi.fn().mockResolvedValue('Example Domain')
      };

      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.withActivePage).mockImplementation(async (port, callback) => {
        return callback(mockPage as any);
      });

      await navigateCommand.handler({
        url: 'https://example.com',
        port: 9222,
        timeout: 30000,
        waitUntil: 'load',
        _: ['navigate'],
        $0: 'playwright'
      } as any);

      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', {
        timeout: 30000,
        waitUntil: 'load'
      });
    });

    it('should handle navigation errors', async () => {
      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.withActivePage).mockRejectedValue(new Error('Navigation failed'));

      await expect(navigateCommand.handler({
        url: 'https://example.com',
        port: 9222,
        timeout: 30000,
        waitUntil: 'load',
        _: ['navigate'],
        $0: 'playwright'
      } as any)).rejects.toThrow('Navigation failed');
    });
  });
});