import { BrowserHelper } from './browser-helper';
import { IBrowserService, MockBrowserService } from './browser-service';

/**
 * Service types that can be injected
 */
export const SERVICE_TYPES = {
  BrowserService: Symbol.for('BrowserService')
} as const;

/**
 * Simple dependency injection container
 * Provides a way to register and resolve services
 */
export class DIContainer {
  private services = new Map<symbol, any>();
  private factories = new Map<symbol, () => any>();

  /**
   * Register a service instance
   */
  register<T>(token: symbol, instance: T): void {
    this.services.set(token, instance);
  }

  /**
   * Register a factory function for lazy initialization
   */
  registerFactory<T>(token: symbol, factory: () => T): void {
    this.factories.set(token, factory);
  }

  /**
   * Resolve a service by token
   */
  resolve<T>(token: symbol): T {
    // Try to get existing instance first
    if (this.services.has(token)) {
      return this.services.get(token) as T;
    }

    // Try to create from factory
    if (this.factories.has(token)) {
      const factory = this.factories.get(token)!;
      const instance = factory();
      this.services.set(token, instance);
      return instance as T;
    }

    throw new Error(`Service not found for token: ${token.toString()}`);
  }

  /**
   * Check if a service is registered
   */
  has(token: symbol): boolean {
    return this.services.has(token) || this.factories.has(token);
  }

  /**
   * Clear all services (useful for testing)
   */
  clear(): void {
    this.services.clear();
    this.factories.clear();
  }
}

/**
 * Global container instance
 */
export const container = new DIContainer();

/**
 * Configure default services
 */
export function setupDefaultServices(): void {
  // Register real browser service by default
  container.registerFactory(SERVICE_TYPES.BrowserService, () => new BrowserHelperAdapter());
}

/**
 * Configure services for testing
 */
export function setupTestServices(mockBrowser?: any, mockPage?: any): void {
  container.register(SERVICE_TYPES.BrowserService, new MockBrowserService(mockBrowser, mockPage));
}

/**
 * Adapter to make BrowserHelper implement IBrowserService interface
 */
class BrowserHelperAdapter implements IBrowserService {
  async getBrowser(port = 9222): Promise<any> {
    return BrowserHelper.getBrowser(port);
  }

  async withBrowser<T>(port: number, action: (browser: any) => Promise<T>): Promise<T> {
    return BrowserHelper.withBrowser(port, action);
  }

  async getPages(port = 9222): Promise<any[]> {
    return BrowserHelper.getPages(port);
  }

  async getPage(index = 0, port = 9222): Promise<any> {
    return BrowserHelper.getPage(index, port);
  }

  async getActivePage(port = 9222): Promise<any> {
    return BrowserHelper.getActivePage(port);
  }

  async withActivePage<T>(port: number, action: (page: any) => Promise<T>): Promise<T> {
    return BrowserHelper.withActivePage(port, action);
  }

  async getContexts(port = 9222): Promise<any[]> {
    return BrowserHelper.getContexts(port);
  }

  async isPortOpen(port: number): Promise<boolean> {
    return BrowserHelper.isPortOpen(port);
  }

  async launchChrome(port = 9222, browserPathOrType?: string, url?: string): Promise<void> {
    return BrowserHelper.launchChrome(port, browserPathOrType, url);
  }

  async createTabHTTP(port: number, url: string): Promise<boolean> {
    return BrowserHelper.createTabHTTP(port, url);
  }
}
