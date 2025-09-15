import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import yargs from 'yargs';
import { fillCommand } from '../fill';

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

describe('fill command', () => {
  let parser: yargs.Argv;

  beforeEach(() => {
    vi.clearAllMocks();
    parser = yargs()
      .command(fillCommand)
      .exitProcess(false)
      .strict();
  });

  describe('argument parsing', () => {
    it('should parse multiple field=value pairs', async () => {
      const result = await parser.parse(['fill', '#name=John', '#email=john@example.com']);
      expect(result.fields).toEqual(['#name=John', '#email=john@example.com']);
    });

    it('should require at least one field', async () => {
      await expect(parser.parse(['fill'])).rejects.toThrow();
    });

    it('should accept timeout option', async () => {
      const result = await parser.parse(['fill', '#name=John', '--timeout', '10000']);
      expect(result.timeout).toBe(10000);
    });
  });

  describe('handler execution', () => {
    it('should fill multiple fields', async () => {
      const mockPage = {
        fill: vi.fn().mockResolvedValue(undefined)
      };

      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.withActivePage).mockImplementation(async (port, callback) => {
        return callback(mockPage as any);
      });

      await fillCommand.handler({
        fields: ['#name=John', '#email=john@example.com'],
        port: 9222,
        timeout: 5000,
        _: ['fill'],
        $0: 'playwright'
      } as any);

      expect(mockPage.fill).toHaveBeenCalledWith('#name', 'John', { timeout: 5000 });
      expect(mockPage.fill).toHaveBeenCalledWith('#email', 'john@example.com', { timeout: 5000 });
    });

    it('should handle malformed field=value pairs', async () => {
      const mockPage = {
        fill: vi.fn().mockResolvedValue(undefined)
      };

      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.withActivePage).mockImplementation(async (port, callback) => {
        return callback(mockPage as any);
      });

      const { logger } = await import('../../../../lib/logger');

      await fillCommand.handler({
        fields: ['invalid-field'],
        port: 9222,
        timeout: 5000,
        _: ['fill'],
        $0: 'playwright'
      } as any);

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid field format'));
    });
  });
});