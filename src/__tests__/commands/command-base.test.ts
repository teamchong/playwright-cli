import { describe, it, expect, mock, beforeEach, spyOn } from 'bun:test';

import { CommandBase } from '../../lib/command-base';

// Concrete implementation for testing
class TestCommand extends CommandBase {
  public testExecute = mock(() => Promise.resolve());
  public testSetupCommand = mock(() => {});

  constructor() {
    super('test', 'Test command');
  }

  protected setupCommand(): void {
    this.testSetupCommand();
    this.addCommonOptions();
  }

  protected async execute(args: any[], options: any): Promise<void> {
    await this.testExecute(args, options);
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
      expect(command.testSetupCommand).toHaveBeenCalled();
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
      const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
      command.logSuccess('Test success');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log info message', () => {
      const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
      command.logInfo('Test info');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log warning message', () => {
      const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
      command.logWarning('Test warning');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
