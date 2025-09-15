import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import yargs from 'yargs';
import { tabsCommand } from '../tabs';

// Mock BrowserHelper
vi.mock('../../../../lib/browser-helper', () => ({
  BrowserHelper: {
    getBrowser: vi.fn(),
    getActivePage: vi.fn()
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

describe('tabs command', () => {
  let parser: yargs.Argv;

  beforeEach(() => {
    vi.clearAllMocks();
    parser = yargs()
      .command(tabsCommand)
      .exitProcess(false)
      .strict();
  });

  describe('argument parsing', () => {
    it('should parse list action', async () => {
      const result = await parser.parse(['tabs', 'list']);
      expect(result.action).toBe('list');
    });

    it('should parse new action with URL', async () => {
      const result = await parser.parse(['tabs', 'new', '--url', 'https://example.com']);
      expect(result.action).toBe('new');
      expect(result.url).toBe('https://example.com');
    });

    it('should parse close action with index', async () => {
      const result = await parser.parse(['tabs', 'close', '--index', '2']);
      expect(result.action).toBe('close');
      expect(result.index).toBe(2);
    });

    it('should parse select action with index', async () => {
      const result = await parser.parse(['tabs', 'select', '--index', '1']);
      expect(result.action).toBe('select');
      expect(result.index).toBe(1);
    });

    it('should default to list action when no action provided', async () => {
      const result = await parser.parse(['tabs']);
      expect(result.action).toBe('list');
    });
  });

  describe('handler execution', () => {
    describe('list action', () => {
      it('should list all tabs', async () => {
        const mockPages = [
          { url: vi.fn().mockReturnValue('https://example.com'), title: vi.fn().mockResolvedValue('Example') },
          { url: vi.fn().mockReturnValue('https://google.com'), title: vi.fn().mockResolvedValue('Google') }
        ];
        const mockBrowser = {
          contexts: vi.fn().mockReturnValue([
            { pages: vi.fn().mockReturnValue(mockPages) }
          ])
        };

        const { BrowserHelper } = await import('../../../../lib/browser-helper');
        vi.mocked(BrowserHelper.getBrowser).mockResolvedValue(mockBrowser as any);

        const { logger } = await import('../../../../lib/logger');

        await tabsCommand.handler({
          action: 'list',
          port: 9222,
          _: ['tabs'],
          $0: 'playwright'
        } as any);

        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Tab 0'));
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('https://example.com'));
      });
    });

    describe('new action', () => {
      it('should create new tab with URL', async () => {
        const mockPage = {
          goto: vi.fn().mockResolvedValue(undefined)
        };
        const mockContext = {
          newPage: vi.fn().mockResolvedValue(mockPage)
        };
        const mockBrowser = {
          contexts: vi.fn().mockReturnValue([mockContext])
        };

        const { BrowserHelper } = await import('../../../../lib/browser-helper');
        vi.mocked(BrowserHelper.getBrowser).mockResolvedValue(mockBrowser as any);

        await tabsCommand.handler({
          action: 'new',
          url: 'https://example.com',
          port: 9222,
          _: ['tabs'],
          $0: 'playwright'
        } as any);

        expect(mockContext.newPage).toHaveBeenCalled();
        expect(mockPage.goto).toHaveBeenCalledWith('https://example.com');
      });
    });

    describe('close action', () => {
      it('should close tab at index', async () => {
        const mockPage = {
          close: vi.fn().mockResolvedValue(undefined)
        };
        const mockContext = {
          pages: vi.fn().mockReturnValue([mockPage])
        };
        const mockBrowser = {
          contexts: vi.fn().mockReturnValue([mockContext])
        };

        const { BrowserHelper } = await import('../../../../lib/browser-helper');
        vi.mocked(BrowserHelper.getBrowser).mockResolvedValue(mockBrowser as any);

        await tabsCommand.handler({
          action: 'close',
          index: 0,
          port: 9222,
          _: ['tabs'],
          $0: 'playwright'
        } as any);

        expect(mockPage.close).toHaveBeenCalled();
      });
    });

    describe('select action', () => {
      it('should bring tab to front', async () => {
        const mockPage = {
          bringToFront: vi.fn().mockResolvedValue(undefined)
        };
        const mockContext = {
          pages: vi.fn().mockReturnValue([mockPage])
        };
        const mockBrowser = {
          contexts: vi.fn().mockReturnValue([mockContext])
        };

        const { BrowserHelper } = await import('../../../../lib/browser-helper');
        vi.mocked(BrowserHelper.getBrowser).mockResolvedValue(mockBrowser as any);

        await tabsCommand.handler({
          action: 'select',
          index: 0,
          port: 9222,
          _: ['tabs'],
          $0: 'playwright'
        } as any);

        expect(mockPage.bringToFront).toHaveBeenCalled();
      });
    });
  });
});