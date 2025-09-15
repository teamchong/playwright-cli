import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import yargs from 'yargs';
import { waitCommand } from '../wait';

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

describe('wait command', () => {
  let parser: yargs.Argv;

  beforeEach(() => {
    vi.clearAllMocks();
    parser = yargs()
      .command(waitCommand)
      .exitProcess(false)
      .strict();
  });

  describe('argument parsing', () => {
    it('should parse selector argument', async () => {
      const result = await parser.parse(['wait', '#button']);
      expect(result.selector).toBe('#button');
    });

    it('should work without selector (timeout only)', async () => {
      const result = await parser.parse(['wait']);
      expect(result.selector).toBeUndefined();
    });

    it('should accept timeout option', async () => {
      const result = await parser.parse(['wait', '--timeout', '10000']);
      expect(result.timeout).toBe(10000);
    });

    it('should accept state option', async () => {
      const result = await parser.parse(['wait', '#button', '--state', 'hidden']);
      expect(result.state).toBe('hidden');
    });

    it('should accept port option', async () => {
      const result = await parser.parse(['wait', '--port', '8080']);
      expect(result.port).toBe(8080);
    });
  });

  describe('handler execution', () => {
    it('should wait for selector with default state', async () => {
      const mockPage = {
        waitForSelector: vi.fn().mockResolvedValue(undefined)
      };

      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.withActivePage).mockImplementation(async (port, callback) => {
        return callback(mockPage as any);
      });

      await waitCommand.handler({
        selector: '#button',
        port: 9222,
        timeout: 5000,
        state: 'visible',
        _: ['wait'],
        $0: 'playwright'
      } as any);

      expect(mockPage.waitForSelector).toHaveBeenCalledWith('#button', {
        timeout: 5000,
        state: 'visible'
      });
    });

    it('should wait for timeout when no selector provided', async () => {
      const mockPage = {
        waitForTimeout: vi.fn().mockResolvedValue(undefined)
      };

      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.withActivePage).mockImplementation(async (port, callback) => {
        return callback(mockPage as any);
      });

      await waitCommand.handler({
        port: 9222,
        timeout: 5000,
        state: 'visible',
        _: ['wait'],
        $0: 'playwright'
      } as any);

      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(5000);
    });

    it('should handle wait timeout errors', async () => {
      const mockPage = {
        waitForSelector: vi.fn().mockRejectedValue(new Error('Timeout waiting for selector'))
      };

      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.withActivePage).mockImplementation(async (port, callback) => {
        return callback(mockPage as any);
      });

      await expect(waitCommand.handler({
        selector: '#button',
        port: 9222,
        timeout: 5000,
        state: 'visible',
        _: ['wait'],
        $0: 'playwright'
      } as any)).rejects.toThrow('Timeout waiting for selector');
    });
  });
});