import { describe, it, expect, vi, beforeEach } from '../../__tests__/vitest-compat';

import { BrowserHelper } from '../../lib/browser-helper';
import * as refUtils from '../../lib/ref-utils';
import { ClickCommand } from '../click-v2';

// Mock dependencies
vi.mock('../../lib/browser-helper');
vi.mock('../../lib/ref-utils');
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    text: '',
    succeed: vi.fn(),
    fail: vi.fn()
  }))
}));

describe('ClickCommand (Base Class Pattern)', () => {
  let clickCommand: ClickCommand;
  let mockPage: any;

  beforeEach(() => {
    clickCommand = new ClickCommand();
    mockPage = {
      click: vi.fn(),
      dblclick: vi.fn(),
      accessibility: {
        snapshot: vi.fn()
      }
    };

    vi.clearAllMocks();
  });

  describe('Command Setup', () => {
    it('should create command with correct name and description', () => {
      const command = clickCommand.getCommand();
      expect(command.name()).toBe('click-v2');
      expect(command.description()).toBe('Click on an element (v2 implementation)');
    });

    it('should have required argument and options', () => {
      const command = clickCommand.getCommand();
      expect(command.args).toHaveLength(1);
      expect(command.args[0].required).toBe(true);
    });
  });

  describe('Regular Selector Handling', () => {
    it('should handle simple selector click', async () => {
      const mockWithActivePage = vi.mocked(BrowserHelper.withActivePage);
      mockWithActivePage.mockImplementation(async (port, callback) => {
        return callback(mockPage);
      });

      const command = clickCommand.getCommand();
      const args = ['#button', {}];

      // Execute the command action directly
      await command.parseAsync(['node', 'test', 'click-v2', '#button']);

      expect(mockWithActivePage).toHaveBeenCalledWith(9222, expect.any(Function));
      expect(mockPage.click).toHaveBeenCalledWith('#button', {
        timeout: 5000,
        force: false,
        modifiers: undefined
      });
    });

    it('should handle double-click with modifiers', async () => {
      const mockWithActivePage = vi.mocked(BrowserHelper.withActivePage);
      mockWithActivePage.mockImplementation(async (port, callback) => {
        return callback(mockPage);
      });

      const command = clickCommand.getCommand();

      // Mock the command execution with options
      await command.parseAsync(['node', 'test', 'click-v2', '#button', '--double', '--shift', '--ctrl']);

      expect(mockPage.dblclick).toHaveBeenCalledWith('#button', {
        timeout: 5000,
        force: false,
        modifiers: ['Shift', 'Control']
      });
    });
  });

  describe('Ref Selector Handling', () => {
    it('should resolve ref selector correctly', async () => {
      const mockSnapshot = { role: 'button', name: 'Submit' };
      const mockElement = { role: 'button', name: 'Submit' };

      mockPage.accessibility.snapshot.mockResolvedValue(mockSnapshot);
      vi.mocked(refUtils.findElementByRef).mockReturnValue(mockElement);
      vi.mocked(refUtils.nodeToSelector).mockReturnValue('#submit-button');

      const mockWithActivePage = vi.mocked(BrowserHelper.withActivePage);
      mockWithActivePage.mockImplementation(async (port, callback) => {
        return callback(mockPage);
      });

      const command = clickCommand.getCommand();
      await command.parseAsync(['node', 'test', 'click-v2', '[ref=abc123]']);

      expect(refUtils.findElementByRef).toHaveBeenCalledWith(mockSnapshot, 'abc123');
      expect(refUtils.nodeToSelector).toHaveBeenCalledWith(mockElement);
      expect(mockPage.click).toHaveBeenCalledWith('#submit-button', expect.any(Object));
    });

    it('should throw error for non-existent ref', async () => {
      const mockSnapshot = { role: 'root' };

      mockPage.accessibility.snapshot.mockResolvedValue(mockSnapshot);
      vi.mocked(refUtils.findElementByRef).mockReturnValue(null);

      const mockWithActivePage = vi.mocked(BrowserHelper.withActivePage);
      mockWithActivePage.mockImplementation(async (port, callback) => {
        return callback(mockPage);
      });

      const command = clickCommand.getCommand();

      await expect(async () => {
        await command.parseAsync(['node', 'test', 'click-v2', '[ref=nonexistent]']);
      }).rejects.toThrow('No element found with ref=nonexistent');
    });
  });

  describe('Error Handling', () => {
    it('should handle browser connection errors gracefully', async () => {
      const mockWithActivePage = vi.mocked(BrowserHelper.withActivePage);
      mockWithActivePage.mockRejectedValue(new Error('Browser not found'));

      const command = clickCommand.getCommand();
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      try {
        await command.parseAsync(['node', 'test', 'click-v2', '#button']);
      } catch (error) {
        // Expected to exit, which throws
      }

      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });
  });

  describe('Base Class Benefits', () => {
    it('should use consistent port parsing from base class', () => {
      // This test demonstrates that the base class provides consistent port parsing
      // The parsePort method is protected, so we test it indirectly through command execution
      const command = clickCommand.getCommand();
      expect(command.getOptionValue('port')).toBe('9222'); // default value
    });

    it('should use consistent timeout parsing from base class', () => {
      const command = clickCommand.getCommand();
      expect(command.getOptionValue('timeout')).toBe('5000'); // default value
    });
  });
});
