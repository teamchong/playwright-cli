import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import yargs from 'yargs';
import { backCommand } from '../back';

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

describe('back command', () => {
  let parser: yargs.Argv;

  beforeEach(() => {
    vi.clearAllMocks();
    parser = yargs()
      .command(backCommand)
      .exitProcess(false)
      .strict();
  });

  describe('argument parsing', () => {
    it('should parse command without arguments', async () => {
      const result = await parser.parse(['back']);
      expect(result._).toContain('back');
    });

    it('should accept port option', async () => {
      const result = await parser.parse(['back', '--port', '8080']);
      expect(result.port).toBe(8080);
    });

    it('should accept timeout option', async () => {
      const result = await parser.parse(['back', '--timeout', '10000']);
      expect(result.timeout).toBe(10000);
    });

    it('should accept wait-until option', async () => {
      const result = await parser.parse(['back', '--wait-until', 'networkidle']);
      expect(result.waitUntil).toBe('networkidle');
    });
  });

  describe('handler execution', () => {
    it('should navigate back with default options', async () => {
      const mockPage = {
        goBack: vi.fn().mockResolvedValue(undefined),
        url: vi.fn().mockReturnValue('https://example.com')
      };

      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.withActivePage).mockImplementation(async (port, callback) => {
        return callback(mockPage as any);
      });

      await backCommand.handler({
        port: 9222,
        timeout: 30000,
        waitUntil: 'load',
        _: ['back'],
        $0: 'playwright'
      } as any);

      expect(mockPage.goBack).toHaveBeenCalledWith({
        timeout: 30000,
        waitUntil: 'load'
      });
    });

    it('should handle navigation errors', async () => {
      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.withActivePage).mockRejectedValue(new Error('Cannot go back'));

      await expect(backCommand.handler({
        port: 9222,
        timeout: 30000,
        waitUntil: 'load',
        _: ['back'],
        $0: 'playwright'
      } as any)).rejects.toThrow('Cannot go back');
    });
  });
});