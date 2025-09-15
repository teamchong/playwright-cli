import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import yargs from 'yargs';
import { hoverCommand } from '../hover';

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

describe('hover command', () => {
  let parser: yargs.Argv;

  beforeEach(() => {
    vi.clearAllMocks();
    parser = yargs()
      .command(hoverCommand)
      .exitProcess(false)
      .strict();
  });

  describe('argument parsing', () => {
    it('should parse selector argument', async () => {
      const result = await parser.parse(['hover', '#menu']);
      expect(result.selector).toBe('#menu');
    });

    it('should require selector argument', async () => {
      await expect(parser.parse(['hover'])).rejects.toThrow();
    });

    it('should accept timeout option', async () => {
      const result = await parser.parse(['hover', '#menu', '--timeout', '10000']);
      expect(result.timeout).toBe(10000);
    });

    it('should accept force option', async () => {
      const result = await parser.parse(['hover', '#menu', '--force']);
      expect(result.force).toBe(true);
    });

    it('should accept modifier options', async () => {
      const result = await parser.parse(['hover', '#menu', '--shift', '--ctrl']);
      expect(result.shift).toBe(true);
      expect(result.ctrl).toBe(true);
    });
  });

  describe('handler execution', () => {
    it('should hover over element with default options', async () => {
      const mockPage = {
        hover: vi.fn().mockResolvedValue(undefined)
      };

      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.withActivePage).mockImplementation(async (port, callback) => {
        return callback(mockPage as any);
      });

      await hoverCommand.handler({
        selector: '#menu',
        port: 9222,
        timeout: 5000,
        force: false,
        shift: false,
        ctrl: false,
        alt: false,
        meta: false,
        _: ['hover'],
        $0: 'playwright'
      } as any);

      expect(mockPage.hover).toHaveBeenCalledWith('#menu', {
        timeout: 5000,
        force: false,
        modifiers: []
      });
    });

    it('should include modifiers when specified', async () => {
      const mockPage = {
        hover: vi.fn().mockResolvedValue(undefined)
      };

      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.withActivePage).mockImplementation(async (port, callback) => {
        return callback(mockPage as any);
      });

      await hoverCommand.handler({
        selector: '#menu',
        port: 9222,
        timeout: 5000,
        force: false,
        shift: true,
        ctrl: true,
        alt: false,
        meta: false,
        _: ['hover'],
        $0: 'playwright'
      } as any);

      expect(mockPage.hover).toHaveBeenCalledWith('#menu', {
        timeout: 5000,
        force: false,
        modifiers: ['Shift', 'Control']
      });
    });

    it('should handle hover errors', async () => {
      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.withActivePage).mockRejectedValue(new Error('Element not found'));

      await expect(hoverCommand.handler({
        selector: '#menu',
        port: 9222,
        timeout: 5000,
        force: false,
        shift: false,
        ctrl: false,
        alt: false,
        meta: false,
        _: ['hover'],
        $0: 'playwright'
      } as any)).rejects.toThrow('Element not found');
    });
  });
});