import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { networkCommand } from '../network';

// Create mock before importing BrowserHelper
const mockPage = {
  on: vi.fn(),
  route: vi.fn(),
  evaluate: vi.fn().mockResolvedValue(undefined),
  url: () => 'about:blank'
};

vi.mock('../../../../lib/browser-helper', () => ({
  BrowserHelper: {
    getActivePage: vi.fn().mockResolvedValue(mockPage)
  }
}));

describe('network command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock functions
    mockPage.on.mockClear();
    mockPage.route.mockClear();
    mockPage.evaluate.mockClear();
  });
  
  describe('command structure', () => {
    it('should have correct command definition', () => {
      expect(networkCommand.command).toBe('network');
      expect(networkCommand.describe).toBe('Monitor network requests');
    });
    
    it('should have proper builder', () => {
      expect(networkCommand.builder).toBeDefined();
    });
    
    it('should have handler', () => {
      expect(networkCommand.handler).toBeDefined();
    });
  });
  
  describe('handler execution', () => {
    it('should set up network monitoring successfully', async () => {
      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn()
      };
      
      const context = {
        argv: {
          port: 9222,
          once: true,
          json: false,
          filter: undefined,
          _: ['network'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      // The handler starts monitoring and never resolves, so we need to test it differently
      const handlerPromise = networkCommand.handler(context as any);
      
      // Give it time to set up listeners
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(BrowserHelper.getActivePage).toHaveBeenCalledWith(9222);
      expect(mockPage.on).toHaveBeenCalledWith('request', expect.any(Function));
      expect(mockPage.on).toHaveBeenCalledWith('response', expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Monitoring network requests'));
    });

    it('should handle request and response events', async () => {
      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn()
      };
      
      const context = {
        argv: {
          port: 9222,
          once: true,
          json: false,
          filter: undefined,
          _: ['network'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      // Start the handler but don't await it since it runs forever
      const handlerPromise = networkCommand.handler(context as any);
      
      // Give it time to set up
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get the request listener function
      const requestListener = mockPage.on.mock.calls.find(call => call[0] === 'request')[1];
      const responseListener = mockPage.on.mock.calls.find(call => call[0] === 'response')[1];
      
      // Test request handling
      const mockRequest = {
        url: () => 'https://example.com/api',
        method: () => 'GET'
      };
      
      requestListener(mockRequest);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('GET https://example.com/api'));
      
      // Test response handling
      const mockResponse = {
        url: () => 'https://example.com/api',
        status: () => 200,
        statusText: () => 'OK',
        headers: () => ({}),
        request: () => ({ method: () => 'GET' })
      };
      
      responseListener(mockResponse);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('200'));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('https://example.com/api'));
    });

    it('should throw error when no browser session', async () => {
      const { BrowserHelper } = await import('../../../../lib/browser-helper');
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(null);
      
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn()
      };
      
      const context = {
        argv: {
          port: 9222,
          once: false,
          json: false,
          _: ['network'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      // Process.exit already mocked in global setup

      await expect(networkCommand.handler(context as any)).rejects.toThrow('process.exit called');
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to monitor network: No active page. Use "playwright open" first');
    });
  });
});