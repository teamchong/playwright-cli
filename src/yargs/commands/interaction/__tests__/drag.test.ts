import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import yargs from 'yargs';
import { dragCommand } from '../drag';

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

describe('drag command', () => {
  let parser: yargs.Argv;

  beforeEach(() => {
    vi.clearAllMocks();
    parser = yargs()
      .command(dragCommand)
      .exitProcess(false)
      .strict();
  });

  describe('argument parsing', () => {
    it('should parse source and target selectors', async () => {
      const result = await parser.parse(['drag', '#source', '#target']);
      expect(result.selector).toBe('#source');
      expect(result.target).toBe('#target');
    });

    it('should require both selectors', async () => {
      await expect(parser.parse(['drag'])).rejects.toThrow();
      await expect(parser.parse(['drag', '#source'])).rejects.toThrow();
    });

    it('should accept timeout option', async () => {
      const result = await parser.parse(['drag', '#source', '#target', '--timeout', '10000']);
      expect(result.timeout).toBe(10000);
    });

    it('should accept force option', async () => {
      const result = await parser.parse(['drag', '#source', '#target', '--force']);
      expect(result.force).toBe(true);
    });
  });

  describe('handler execution', () => {
    it('should drag from source to target', async () => {
      const mockPage = {
        dragAndDrop: vi.fn().mockResolvedValue(undefined)
      };

      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.withActivePage).mockImplementation(async (port, callback) => {
        return callback(mockPage as any);
      });

      await dragCommand.handler({
        selector: '#source',
        target: '#target',
        port: 9222,
        timeout: 5000,
        force: false,
        _: ['drag'],
        $0: 'playwright'
      } as any);

      expect(mockPage.dragAndDrop).toHaveBeenCalledWith('#source', '#target', {
        timeout: 5000,
        force: false
      });
    });

    it('should force drag when option is set', async () => {
      const mockPage = {
        dragAndDrop: vi.fn().mockResolvedValue(undefined)
      };

      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.withActivePage).mockImplementation(async (port, callback) => {
        return callback(mockPage as any);
      });

      await dragCommand.handler({
        selector: '#source',
        target: '#target',
        port: 9222,
        timeout: 5000,
        force: true,
        _: ['drag'],
        $0: 'playwright'
      } as any);

      expect(mockPage.dragAndDrop).toHaveBeenCalledWith('#source', '#target', {
        timeout: 5000,
        force: true
      });
    });

    it('should handle drag errors', async () => {
      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.withActivePage).mockRejectedValue(new Error('Element not draggable'));

      await expect(dragCommand.handler({
        selector: '#source',
        target: '#target',
        port: 9222,
        timeout: 5000,
        force: false,
        _: ['drag'],
        $0: 'playwright'
      } as any)).rejects.toThrow('Element not draggable');
    });
  });
});