import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import yargs from 'yargs';
import { closeCommand } from '../close';

// Mock BrowserHelper
vi.mock('../../../../lib/browser-helper', () => ({
  BrowserHelper: {
    getBrowser: vi.fn()
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

describe('close command', () => {
  let parser: yargs.Argv;

  beforeEach(() => {
    vi.clearAllMocks();
    parser = yargs()
      .command(closeCommand)
      .exitProcess(false)
      .strict();
  });

  describe('argument parsing', () => {
    it('should parse command without arguments', async () => {
      const result = await parser.parse(['close']);
      expect(result._).toContain('close');
    });

    it('should accept port option', async () => {
      const result = await parser.parse(['close', '--port', '8080']);
      expect(result.port).toBe(8080);
    });
  });

  describe('handler execution', () => {
    it('should close browser successfully', async () => {
      const mockBrowser = {
        close: vi.fn().mockResolvedValue(undefined)
      };

      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.getBrowser).mockResolvedValue(mockBrowser as any);

      await closeCommand.handler({
        port: 9222,
        _: ['close'],
        $0: 'playwright'
      } as any);

      expect(BrowserHelper.getBrowser).toHaveBeenCalledWith(9222);
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle browser not found', async () => {
      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.getBrowser).mockRejectedValue(new Error('Browser not found'));

      await expect(closeCommand.handler({
        port: 9222,
        _: ['close'],
        $0: 'playwright'
      } as any)).rejects.toThrow('Browser not found');
    });
  });
});