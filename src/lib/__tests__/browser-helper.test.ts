import { describe, it, expect, beforeEach, vi } from 'vitest';
import { spawn } from 'child_process';
import * as fs from 'fs';
import { BrowserHelper } from '../browser-helper';
import { createMockBrowser, createMockPage, createMockContext, suppressConsole } from './mock-helpers';

vi.mock('playwright', () => ({
  chromium: {
    connectOverCDP: vi.fn(),
    executablePath: vi.fn(() => '/path/to/chromium')
  },
  firefox: {
    executablePath: vi.fn(() => '/path/to/firefox')
  },
  webkit: {
    executablePath: vi.fn(() => '/path/to/webkit')
  }
}));

vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    unref: vi.fn()
  }))
}));

vi.mock('net', () => ({
  createConnection: vi.fn()
}));

describe('BrowserHelper', () => {
  suppressConsole();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBrowser', () => {
    it('should connect to browser on specified port', async () => {
      const mockBrowser = createMockBrowser();
      const { chromium } = await import('playwright');
      vi.mocked(chromium.connectOverCDP).mockResolvedValue(mockBrowser as any);

      const browser = await BrowserHelper.getBrowser(9222);

      expect(chromium.connectOverCDP).toHaveBeenCalledWith('http://localhost:9222');
      expect(browser).toBe(mockBrowser);
    });

    it('should set default timeout on all contexts', async () => {
      const mockContext = createMockContext();
      const mockBrowser = createMockBrowser();
      mockBrowser.contexts = vi.fn(() => [mockContext]);

      const { chromium } = await import('playwright');
      vi.mocked(chromium.connectOverCDP).mockResolvedValue(mockBrowser as any);

      await BrowserHelper.getBrowser(9222);

      expect(mockContext.setDefaultTimeout).toHaveBeenCalledWith(5000);
    });

    it('should throw error when browser not running', async () => {
      const { chromium } = await import('playwright');
      vi.mocked(chromium.connectOverCDP).mockRejectedValue(new Error('Connection failed'));

      await expect(BrowserHelper.getBrowser(9222)).rejects.toThrow(
        'No browser running on port 9222. Use "playwright open" first'
      );
    });
  });

  describe('withBrowser', () => {
    it('should execute action and close browser', async () => {
      const mockBrowser = createMockBrowser();
      const { chromium } = await import('playwright');
      vi.mocked(chromium.connectOverCDP).mockResolvedValue(mockBrowser as any);

      const action = vi.fn().mockResolvedValue('result');
      const result = await BrowserHelper.withBrowser(9222, action);

      expect(action).toHaveBeenCalledWith(mockBrowser);
      expect(mockBrowser.close).toHaveBeenCalled();
      expect(result).toBe('result');
    });

    it('should close browser even if action throws', async () => {
      const mockBrowser = createMockBrowser();
      const { chromium } = await import('playwright');
      vi.mocked(chromium.connectOverCDP).mockResolvedValue(mockBrowser as any);

      const action = vi.fn().mockRejectedValue(new Error('Action failed'));

      await expect(BrowserHelper.withBrowser(9222, action)).rejects.toThrow('Action failed');
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('getPages', () => {
    it('should return all pages from all contexts', async () => {
      const page1 = createMockPage('https://example1.com');
      const page2 = createMockPage('https://example2.com');
      const context1 = createMockContext([page1]);
      const context2 = createMockContext([page2]);

      const mockBrowser = createMockBrowser();
      mockBrowser.contexts = vi.fn(() => [context1, context2]);

      const { chromium } = await import('playwright');
      vi.mocked(chromium.connectOverCDP).mockResolvedValue(mockBrowser as any);

      const pages = await BrowserHelper.getPages(9222);

      expect(pages).toHaveLength(2);
      expect(pages).toContain(page1);
      expect(pages).toContain(page2);
    });
  });

  describe('getPage', () => {
    it('should return page at specified index', async () => {
      const page1 = createMockPage('https://example1.com');
      const page2 = createMockPage('https://example2.com');
      const context = createMockContext([page1, page2]);

      const mockBrowser = createMockBrowser();
      mockBrowser.contexts = vi.fn(() => [context]);

      const { chromium } = await import('playwright');
      vi.mocked(chromium.connectOverCDP).mockResolvedValue(mockBrowser as any);

      const page = await BrowserHelper.getPage(1, 9222);

      expect(page).toBe(page2);
    });

    it('should return null for out of bounds index', async () => {
      const page1 = createMockPage('https://example1.com');
      const context = createMockContext([page1]);

      const mockBrowser = createMockBrowser();
      mockBrowser.contexts = vi.fn(() => [context]);

      const { chromium } = await import('playwright');
      vi.mocked(chromium.connectOverCDP).mockResolvedValue(mockBrowser as any);

      const page = await BrowserHelper.getPage(5, 9222);

      expect(page).toBeNull();
    });
  });

  describe('getActivePage', () => {
    it('should return first non-internal page', async () => {
      const chromePage = createMockPage('chrome://settings');
      const normalPage = createMockPage('https://example.com');
      const context = createMockContext([chromePage, normalPage]);

      const mockBrowser = createMockBrowser();
      mockBrowser.contexts = vi.fn(() => [context]);

      const { chromium } = await import('playwright');
      vi.mocked(chromium.connectOverCDP).mockResolvedValue(mockBrowser as any);

      const page = await BrowserHelper.getActivePage(9222);

      expect(page).toBe(normalPage);
    });

    it('should create new page if no active pages', async () => {
      const chromePage = createMockPage('chrome://settings');
      const newPage = createMockPage('about:blank');
      const context = createMockContext([chromePage]);
      context.newPage = vi.fn().mockResolvedValue(newPage);

      const mockBrowser = createMockBrowser();
      mockBrowser.contexts = vi.fn(() => [context]);

      const { chromium } = await import('playwright');
      vi.mocked(chromium.connectOverCDP).mockResolvedValue(mockBrowser as any);

      const page = await BrowserHelper.getActivePage(9222);

      expect(context.newPage).toHaveBeenCalled();
      expect(page).toBe(newPage);
    });
  });

  describe('withActivePage', () => {
    it('should execute action with active page and disconnect', async () => {
      const normalPage = createMockPage('https://example.com');
      const context = createMockContext([normalPage]);
      const mockBrowser = createMockBrowser();
      mockBrowser.contexts = vi.fn(() => [context]);

      const { chromium } = await import('playwright');
      vi.mocked(chromium.connectOverCDP).mockResolvedValue(mockBrowser as any);

      const action = vi.fn().mockResolvedValue('result');
      const result = await BrowserHelper.withActivePage(9222, action);

      expect(action).toHaveBeenCalledWith(normalPage);
      expect(mockBrowser.close).toHaveBeenCalled();
      expect(result).toBe('result');
    });
  });

  describe('isPortOpen', () => {
    it('should return true when port is open', async () => {
      const net = require('net');
      const mockSocket = {
        on: vi.fn((event, callback) => {
          if (event === 'connect') {
            callback();
          }
        }),
        end: vi.fn(),
        setTimeout: vi.fn(),
        destroy: vi.fn()
      };
      net.createConnection = vi.fn(() => mockSocket);

      const result = await BrowserHelper.isPortOpen(9222);

      expect(result).toBe(true);
      expect(mockSocket.end).toHaveBeenCalled();
    });

    it('should return false when port is closed', async () => {
      const net = require('net');
      const mockSocket = {
        on: vi.fn((event, callback) => {
          if (event === 'error') {
            callback();
          }
        }),
        setTimeout: vi.fn(),
        destroy: vi.fn()
      };
      net.createConnection = vi.fn(() => mockSocket);

      const result = await BrowserHelper.isPortOpen(9222);

      expect(result).toBe(false);
    });
  });

  describe('launchChrome', () => {
    it('should launch Chrome with correct arguments', async () => {
      vi.spyOn(fs.promises, 'access').mockResolvedValue(undefined);
      const spawnMock = spawn as any;

      await BrowserHelper.launchChrome(9222, 'chrome', 'https://example.com');

      expect(spawnMock).toHaveBeenCalledWith(
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        expect.arrayContaining([
          '--remote-debugging-port=9222',
          '--no-first-run',
          '--no-default-browser-check',
          'https://example.com'
        ]),
        expect.objectContaining({
          detached: true,
          stdio: 'ignore'
        })
      );
    });

    it('should throw error when browser not found', async () => {
      vi.spyOn(fs.promises, 'access').mockRejectedValue(new Error('Not found'));

      await expect(BrowserHelper.launchChrome(9222, 'chrome')).rejects.toThrow(
        'Browser not found at:'
      );
    });
  });

  describe('createTabHTTP', () => {
    it('should create new tab via HTTP API', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true
      });

      const result = await BrowserHelper.createTabHTTP(9222, 'https://example.com');

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:9222/json/new'),
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('should return false on HTTP error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await BrowserHelper.createTabHTTP(9222, 'https://example.com');

      expect(result).toBe(false);
    });
  });
});
