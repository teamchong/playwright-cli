import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { clickCommand } from '../click';
import { BrowserHelper } from '../../../../lib/browser-helper';

vi.mock('../../../../lib/browser-helper');

describe('click command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('command structure', () => {
    it('should have correct command definition', () => {
      expect(clickCommand.command).toBe('click <selector>');
      expect(clickCommand.describe).toBe('Click on an element');
    });
    
    it('should have proper builder', () => {
      expect(clickCommand.builder).toBeDefined();
    });
    
    it('should have handler', () => {
      expect(clickCommand.handler).toBeDefined();
    });
  });
  
  describe('handler execution', () => {
    it('should execute click action', async () => {
      const mockPage = {
        click: vi.fn().mockResolvedValue(undefined),
        accessibility: {
          snapshot: vi.fn().mockResolvedValue({})
        }
      };
      
      vi.mocked(BrowserHelper.withActivePage).mockImplementation(
        async (_port, callback) => callback(mockPage as any)
      );
      
      const mockLogger = {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn()
      };
      
      await clickCommand.handler({
        selector: '#button',
        port: 9222,
        timeout: 5000,
        force: false,
        double: false,
        button: 'left',
        shift: false,
        ctrl: false,
        alt: false,
        meta: false,
        'ctrl-or-meta': false,
        _: ['click'],
        $0: 'playwright'
      } as any);
      
      expect(mockPage.click).toHaveBeenCalledWith('#button', {
        timeout: 5000,
        force: false,
        button: 'left',
        modifiers: undefined
      });
    });
  });
});