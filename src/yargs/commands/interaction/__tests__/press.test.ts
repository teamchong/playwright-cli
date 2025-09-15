import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import yargs from 'yargs';
import { pressCommand } from '../press';

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

describe('press command', () => {
  let parser: yargs.Argv;

  beforeEach(() => {
    vi.clearAllMocks();
    parser = yargs()
      .command(pressCommand)
      .exitProcess(false)
      .strict();
  });

  describe('argument parsing', () => {
    it('should parse key argument', async () => {
      const result = await parser.parse(['press', 'Enter']);
      expect(result.key).toBe('Enter');
    });

    it('should require key argument', async () => {
      await expect(parser.parse(['press'])).rejects.toThrow();
    });

    it('should accept delay option', async () => {
      const result = await parser.parse(['press', 'Enter', '--delay', '100']);
      expect(result.delay).toBe(100);
    });

    it('should accept count option', async () => {
      const result = await parser.parse(['press', 'Tab', '--count', '3']);
      expect(result.count).toBe(3);
    });
  });

  describe('handler execution', () => {
    it('should press key once by default', async () => {
      const mockPage = {
        keyboard: {
          press: vi.fn().mockResolvedValue(undefined)
        }
      };

      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.withActivePage).mockImplementation(async (port, callback) => {
        return callback(mockPage as any);
      });

      await pressCommand.handler({
        key: 'Enter',
        port: 9222,
        delay: 0,
        count: 1,
        _: ['press'],
        $0: 'playwright'
      } as any);

      expect(mockPage.keyboard.press).toHaveBeenCalledWith('Enter', { delay: 0 });
      expect(mockPage.keyboard.press).toHaveBeenCalledTimes(1);
    });

    it('should press key multiple times when count specified', async () => {
      const mockPage = {
        keyboard: {
          press: vi.fn().mockResolvedValue(undefined)
        }
      };

      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.withActivePage).mockImplementation(async (port, callback) => {
        return callback(mockPage as any);
      });

      await pressCommand.handler({
        key: 'Tab',
        port: 9222,
        delay: 0,
        count: 3,
        _: ['press'],
        $0: 'playwright'
      } as any);

      expect(mockPage.keyboard.press).toHaveBeenCalledWith('Tab', { delay: 0 });
      expect(mockPage.keyboard.press).toHaveBeenCalledTimes(3);
    });

    it('should handle key press errors', async () => {
      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.withActivePage).mockRejectedValue(new Error('Invalid key'));

      await expect(pressCommand.handler({
        key: 'InvalidKey',
        port: 9222,
        delay: 0,
        count: 1,
        _: ['press'],
        $0: 'playwright'
      } as any)).rejects.toThrow('Invalid key');
    });
  });
});