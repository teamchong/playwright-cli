import { describe, it, expect, beforeEach } from '../vitest-compat';

import { IBrowserService, MockBrowserService } from '../../lib/browser-service';
import { DIContainer, SERVICE_TYPES, setupDefaultServices, setupTestServices, container } from '../../lib/di-container';

describe('DIContainer', () => {
  let testContainer: DIContainer;

  beforeEach(() => {
    testContainer = new DIContainer();
  });

  describe('basic functionality', () => {
    it('should register and resolve services', () => {
      const mockService = new MockBrowserService();
      testContainer.register(SERVICE_TYPES.BrowserService, mockService);

      const resolved = testContainer.resolve<IBrowserService>(SERVICE_TYPES.BrowserService);
      expect(resolved).toBe(mockService);
    });

    it('should register and resolve factories', () => {
      let factoryCalled = false;
      const factory = () => {
        factoryCalled = true;
        return new MockBrowserService();
      };

      testContainer.registerFactory(SERVICE_TYPES.BrowserService, factory);

      const resolved = testContainer.resolve<IBrowserService>(SERVICE_TYPES.BrowserService);
      expect(factoryCalled).toBe(true);
      expect(resolved).toBeInstanceOf(MockBrowserService);
    });

    it('should cache factory results', () => {
      let factoryCallCount = 0;
      const factory = () => {
        factoryCallCount++;
        return new MockBrowserService();
      };

      testContainer.registerFactory(SERVICE_TYPES.BrowserService, factory);

      const resolved1 = testContainer.resolve<IBrowserService>(SERVICE_TYPES.BrowserService);
      const resolved2 = testContainer.resolve<IBrowserService>(SERVICE_TYPES.BrowserService);

      expect(factoryCallCount).toBe(1);
      expect(resolved1).toBe(resolved2);
    });

    it('should throw error for unregistered services', () => {
      const unknownToken = Symbol.for('UnknownService');
      expect(() => testContainer.resolve(unknownToken)).toThrow('Service not found');
    });

    it('should check service existence', () => {
      const mockService = new MockBrowserService();
      testContainer.register(SERVICE_TYPES.BrowserService, mockService);

      expect(testContainer.has(SERVICE_TYPES.BrowserService)).toBe(true);
      expect(testContainer.has(Symbol.for('UnknownService'))).toBe(false);
    });

    it('should clear all services', () => {
      const mockService = new MockBrowserService();
      testContainer.register(SERVICE_TYPES.BrowserService, mockService);

      expect(testContainer.has(SERVICE_TYPES.BrowserService)).toBe(true);

      testContainer.clear();

      expect(testContainer.has(SERVICE_TYPES.BrowserService)).toBe(false);
    });
  });

});

describe('Global Container Setup Functions', () => {
  beforeEach(() => {
    // Clear the global container before each test
    container.clear();
  });

  it('should setup default services in global container', () => {
    setupDefaultServices();
    // We can't easily test the actual service without creating a browser instance
    // But we can test that the service is registered
    expect(() => container.resolve<IBrowserService>(SERVICE_TYPES.BrowserService)).not.toThrow();
  });

  it('should setup test services in global container', () => {
    setupTestServices();

    const service = container.resolve<IBrowserService>(SERVICE_TYPES.BrowserService);
    expect(service).toBeInstanceOf(MockBrowserService);
  });

  it('should setup test services with custom mocks in global container', async () => {
    const mockBrowser = { contexts: () => [], close: () => Promise.resolve() };
    const mockPage = { url: () => 'https://test.com' };

    setupTestServices(mockBrowser, mockPage);

    const service = container.resolve<IBrowserService>(SERVICE_TYPES.BrowserService);
    const browser = await service.getBrowser();
    const page = await service.getActivePage();

    expect(browser).toBe(mockBrowser);
    expect(page.url()).toBe('https://test.com');
  });
});

describe('MockBrowserService', () => {
  let mockService: MockBrowserService;

  beforeEach(() => {
    mockService = new MockBrowserService();
  });

  it('should provide mock browser and page', async () => {
    const browser = await mockService.getBrowser();
    const page = await mockService.getActivePage();

    expect(browser).toBeDefined();
    expect(page).toBeDefined();
    expect(page.url()).toBe('https://example.com');
  });

  it('should execute withActivePage callback', async () => {
    let callbackExecuted = false;

    const result = await mockService.withActivePage(9222, async (page) => {
      callbackExecuted = true;
      return 'test-result';
    });

    expect(callbackExecuted).toBe(true);
    expect(result).toBe('test-result');
  });

  it('should execute withBrowser callback', async () => {
    let callbackExecuted = false;

    const result = await mockService.withBrowser(9222, async (browser) => {
      callbackExecuted = true;
      return 'test-result';
    });

    expect(callbackExecuted).toBe(true);
    expect(result).toBe('test-result');
  });

  it('should return mock values for utility methods', async () => {
    expect(await mockService.isPortOpen(9222)).toBe(true);
    expect(await mockService.createTabHTTP(9222, 'https://test.com')).toBe(true);
    expect(await mockService.getPages()).toHaveLength(1);
    expect(await mockService.getContexts()).toHaveLength(0);
  });
});
