import { describe, it, expect, beforeEach, vi } from '../vitest-compat';

import { IBrowserService, MockBrowserService } from '../../lib/browser-service';
import { CommandBase } from '../../lib/command-base';
import { setupTestServices } from '../../lib/di-container';

// Create a test command to verify DI integration
class TestCommand extends CommandBase {
  constructor(browserService?: IBrowserService) {
    super('test-cmd', 'Test command for dependency injection', browserService);
  }

  protected setupCommand(): void {
    this.addCommonOptions();
  }

  protected async execute(args: any[], options: any): Promise<void> {
    const port = this.parsePort(options);

    // Test that injected service is used
    await this.withActivePage(port, async (page) => {
      await page.goto('https://example.com');
      return page.url();
    });
  }

  // Expose browserService for testing
  public getBrowserService(): IBrowserService {
    return this.browserService;
  }
}

describe('CommandBase Dependency Injection', () => {
  beforeEach(() => {
    setupTestServices();
  });

  it('should use dependency injection container by default', () => {
    const testCommand = new TestCommand();
    const browserService = testCommand.getBrowserService();

    expect(browserService).toBeInstanceOf(MockBrowserService);
  });

  it('should accept explicit browser service injection', () => {
    const customMockService = new MockBrowserService();
    const testCommand = new TestCommand(customMockService);
    const browserService = testCommand.getBrowserService();

    expect(browserService).toBe(customMockService);
  });

  it('should use injected service for browser operations', async () => {
    let mockPageCalled = false;
    const customMockPage = {
      url: () => 'https://custom-test.com',
      goto: () => {
        mockPageCalled = true;
        return Promise.resolve();
      }
    };

    const customMockService = new MockBrowserService(undefined, customMockPage);
    const testCommand = new TestCommand(customMockService);

    // Execute the command which should use our mock
    await testCommand.execute([], { port: '9222' });

    expect(mockPageCalled).toBe(true);
  });

  it('should handle browser service methods through base class', async () => {
    const customMockPage = {
      url: () => 'https://injected-service.com',
      click: vi.fn(),
      type: vi.fn()
    };
    const customMockService = new MockBrowserService(undefined, customMockPage);
    const testCommand = new TestCommand(customMockService);

    // Test withActivePage method
    const result = await testCommand['withActivePage'](9222, async (page) => {
      return page.url();
    });

    expect(result).toBe('https://injected-service.com');
  });

  it('should parse port correctly from options', () => {
    const testCommand = new TestCommand();

    expect(testCommand['parsePort']({ port: '8080' })).toBe(8080);
    expect(testCommand['parsePort']({}, '9999')).toBe(9999);
  });

  it('should create command with proper setup', () => {
    const testCommand = new TestCommand();
    const command = testCommand.getCommand();

    expect(command.name()).toBe('test-cmd');
    expect(command.description()).toBe('Test command for dependency injection');
  });
});
