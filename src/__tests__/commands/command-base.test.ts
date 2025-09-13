import { describe, it, expect, mock, beforeEach, spyOn } from 'bun:test';

import { CommandBase } from '../../lib/command-base';
import { IBrowserService } from '../../lib/browser-service';
import { logger } from '../../lib/logger';

// Mock browser service
const mockBrowserService: IBrowserService = {
  getBrowser: mock(() => Promise.resolve({} as any)),
  withBrowser: mock(() => Promise.resolve()),
  getPages: mock(() => Promise.resolve([])),
  getPage: mock(() => Promise.resolve(null)),
  getActivePage: mock(() => Promise.resolve({} as any)),
  withActivePage: mock(() => Promise.resolve()),
  getContexts: mock(() => Promise.resolve([])),
  isPortOpen: mock(() => Promise.resolve(false)),
  launchChrome: mock(() => Promise.resolve()),
  createTabHTTP: mock(() => Promise.resolve(true)),
};

// Concrete implementation for testing
class TestCommand extends CommandBase {
  public testExecute = mock(() => Promise.resolve());
  public testSetupCommand = mock(() => {});
  public setupCalled = false;

  constructor() {
    super('test', 'Test command', mockBrowserService);
  }

  protected setupCommand(): void {
    this.setupCalled = true;
    // Don't call the mock during construction
    this.addCommonOptions();
  }

  protected async execute(args: any[], options: any): Promise<void> {
    await this.testExecute(args, options);
  }

  // Expose protected methods for testing
  public parsePort(options: any): number {
    return super.parsePort(options);
  }

  public parseTimeout(options: any): number {
    return super.parseTimeout(options);
  }

  public async resolveRefSelector(selector: string, page: any): Promise<any> {
    return super.resolveRefSelector(selector, page);
  }

  public logSuccess(message: string): void {
    super.logSuccess(message);
  }

  public logInfo(message: string): void {
    super.logInfo(message);
  }

  public logWarning(message: string): void {
    super.logWarning(message);
  }
}

describe('CommandBase', () => {
  let command: TestCommand;

  beforeEach(() => {
    command = new TestCommand();
  });

  describe('constructor and setup', () => {
    it('should create command with correct name and description', () => {
      const cmd = command.getCommand();
      expect(cmd.name()).toBe('test');
      expect(cmd.description()).toBe('Test command');
    });

    it('should call setupCommand during initialization', () => {
      // Test that setupCommand was called by checking if addCommonOptions was called
      // (which adds port and timeout options)
      const cmd = command.getCommand();
      const options = cmd.options;
      const hasPortOption = options.some(opt => opt.long === '--port');
      const hasTimeoutOption = options.some(opt => opt.long === '--timeout');
      
      expect(hasPortOption).toBe(true);
      expect(hasTimeoutOption).toBe(true);
    });
  });

  describe('option parsing', () => {
    it('should parse port with default', () => {
      const result = command.parsePort({});
      expect(result).toBe(9222);
    });

    it('should parse custom port', () => {
      const result = command.parsePort({ port: '8080' });
      expect(result).toBe(8080);
    });

    it('should parse timeout with default', () => {
      const result = command.parseTimeout({});
      expect(result).toBe(5000);
    });

    it('should parse custom timeout', () => {
      const result = command.parseTimeout({ timeout: '10000' });
      expect(result).toBe(10000);
    });
  });

  describe('ref selector resolution', () => {
    const mockPage = {
      accessibility: {
        snapshot: mock().mockResolvedValue({
          role: 'generic',
          children: [
            { role: 'button', name: 'Click me', ref: 'abc123' }
          ]
        })
      }
    };

    it('should return original selector if not ref format', async () => {
      const result = await command.resolveRefSelector('#button', mockPage);
      expect(result.actualSelector).toBe('#button');
      expect(result.element).toBeUndefined();
    });
  });

  describe('logging methods', () => {
    it('should log success message', () => {
      const loggerSpy = spyOn(logger, 'success').mockImplementation(() => {});
      command.logSuccess('Test success');
      expect(loggerSpy).toHaveBeenCalledWith('Test success');
      loggerSpy.mockRestore();
    });

    it('should log info message', () => {
      const loggerSpy = spyOn(logger, 'debug').mockImplementation(() => {});
      command.logInfo('Test info');
      expect(loggerSpy).toHaveBeenCalledWith('   Test info');
      loggerSpy.mockRestore();
    });

    it('should log warning message', () => {
      const loggerSpy = spyOn(logger, 'warn').mockImplementation(() => {});
      command.logWarning('Test warning');
      expect(loggerSpy).toHaveBeenCalledWith('⚠️  Test warning');
      loggerSpy.mockRestore();
    });
  });
});
