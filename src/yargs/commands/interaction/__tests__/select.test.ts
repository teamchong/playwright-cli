import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import yargs from 'yargs';
import { selectCommand } from '../select';

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

describe('select command', () => {
  let parser: yargs.Argv;

  beforeEach(() => {
    vi.clearAllMocks();
    parser = yargs()
      .command(selectCommand)
      .exitProcess(false)
      .strict();
  });

  describe('argument parsing', () => {
    it('should parse selector and single value', async () => {
      const result = await parser.parse(['select', '#dropdown', 'option1']);
      expect(result.selector).toBe('#dropdown');
      expect(result.values).toEqual(['option1']);
    });

    it('should parse multiple values', async () => {
      const result = await parser.parse(['select', '#dropdown', 'option1', 'option2']);
      expect(result.selector).toBe('#dropdown');
      expect(result.values).toEqual(['option1', 'option2']);
    });

    it('should require selector and at least one value', async () => {
      await expect(parser.parse(['select'])).rejects.toThrow();
      await expect(parser.parse(['select', '#dropdown'])).rejects.toThrow();
    });

    it('should accept timeout option', async () => {
      const result = await parser.parse(['select', '#dropdown', 'option1', '--timeout', '10000']);
      expect(result.timeout).toBe(10000);
    });
  });

  describe('handler execution', () => {
    it('should select single option', async () => {
      const mockPage = {
        selectOption: vi.fn().mockResolvedValue(['option1'])
      };

      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.withActivePage).mockImplementation(async (port, callback) => {
        return callback(mockPage as any);
      });

      await selectCommand.handler({
        selector: '#dropdown',
        values: ['option1'],
        port: 9222,
        timeout: 5000,
        _: ['select'],
        $0: 'playwright'
      } as any);

      expect(mockPage.selectOption).toHaveBeenCalledWith('#dropdown', ['option1'], {
        timeout: 5000
      });
    });

    it('should select multiple options', async () => {
      const mockPage = {
        selectOption: vi.fn().mockResolvedValue(['option1', 'option2'])
      };

      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.withActivePage).mockImplementation(async (port, callback) => {
        return callback(mockPage as any);
      });

      await selectCommand.handler({
        selector: '#dropdown',
        values: ['option1', 'option2'],
        port: 9222,
        timeout: 5000,
        _: ['select'],
        $0: 'playwright'
      } as any);

      expect(mockPage.selectOption).toHaveBeenCalledWith('#dropdown', ['option1', 'option2'], {
        timeout: 5000
      });
    });

    it('should handle selection errors', async () => {
      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.withActivePage).mockRejectedValue(new Error('Select not found'));

      await expect(selectCommand.handler({
        selector: '#dropdown',
        values: ['option1'],
        port: 9222,
        timeout: 5000,
        _: ['select'],
        $0: 'playwright'
      } as any)).rejects.toThrow('Select not found');
    });
  });
});