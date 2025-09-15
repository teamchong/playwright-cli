import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { snapshotCommand } from '../snapshot';
import { BrowserHelper } from '../../../../lib/browser-helper';
import { extractInteractiveElements } from '../../../../lib/ref-utils';

vi.mock('../../../../lib/browser-helper');
vi.mock('../../../../lib/ref-utils');

describe('snapshot command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('command structure', () => {
    it('should have correct command definition', () => {
      expect(snapshotCommand.command).toBe('snapshot');
      expect(snapshotCommand.describe).toBe('Capture interactive elements from the current page');
    });
    
    it('should have proper builder', () => {
      expect(snapshotCommand.builder).toBeDefined();
    });
    
    it('should have handler', () => {
      expect(snapshotCommand.handler).toBeDefined();
    });
  });
  
  describe('handler execution', () => {
    it('should capture interactive elements by default', async () => {
      const mockSnapshot = {
        role: 'WebArea',
        name: 'Test Page',
        children: [
          { role: 'button', name: 'Click me' },
          { role: 'link', name: 'Go here' }
        ]
      };

      const mockInteractiveElements = [
        { role: 'button', name: 'Click me', ref: 'ref1' },
        { role: 'link', name: 'Go here', ref: 'ref2' }
      ];

      const mockPage = {
        accessibility: {
          snapshot: vi.fn().mockResolvedValue(mockSnapshot)
        }
      };
      
      vi.mocked(BrowserHelper.withActivePage).mockImplementation(
        async (_port, callback) => callback(mockPage as any)
      );
      vi.mocked(extractInteractiveElements).mockReturnValue(mockInteractiveElements);
      
      const argv = {
        port: 9222,
        timeout: 30000,
        json: false,
        full: false,
        _: ['snapshot'],
        $0: 'playwright'
      };

      await snapshotCommand.handler(argv as any);

      expect(BrowserHelper.withActivePage).toHaveBeenCalledWith(9222, expect.any(Function));
      expect(mockPage.accessibility.snapshot).toHaveBeenCalled();
      expect(extractInteractiveElements).toHaveBeenCalledWith(mockSnapshot);
    });

    it('should output interactive elements as JSON when requested', async () => {
      const mockSnapshot = {
        role: 'WebArea',
        children: []
      };

      const mockInteractiveElements = [
        { role: 'button', name: 'Test Button', ref: 'ref1' }
      ];

      const mockPage = {
        accessibility: {
          snapshot: vi.fn().mockResolvedValue(mockSnapshot)
        }
      };
      
      vi.mocked(BrowserHelper.withActivePage).mockImplementation(
        async (_port, callback) => callback(mockPage as any)
      );
      vi.mocked(extractInteractiveElements).mockReturnValue(mockInteractiveElements);
      
      const argv = {
        port: 9222,
        timeout: 30000,
        json: true,
        full: false,
        _: ['snapshot'],
        $0: 'playwright'
      };

      await snapshotCommand.handler(argv as any);

      expect(extractInteractiveElements).toHaveBeenCalledWith(mockSnapshot);
    });

    it('should show full accessibility tree when full option is used', async () => {
      const mockSnapshot = {
        role: 'WebArea',
        name: 'Test Page',
        children: [
          { 
            role: 'button', 
            name: 'Click me',
            children: []
          }
        ]
      };

      const mockPage = {
        accessibility: {
          snapshot: vi.fn().mockResolvedValue(mockSnapshot)
        }
      };
      
      vi.mocked(BrowserHelper.withActivePage).mockImplementation(
        async (_port, callback) => callback(mockPage as any)
      );
      
      const argv = {
        port: 9222,
        timeout: 30000,
        json: false,
        full: true,
        _: ['snapshot'],
        $0: 'playwright'
      };

      await snapshotCommand.handler(argv as any);

      expect(mockPage.accessibility.snapshot).toHaveBeenCalled();
      // Should not call extractInteractiveElements when full is true
      expect(extractInteractiveElements).not.toHaveBeenCalled();
    });

    it('should output full tree as JSON when both full and json options are used', async () => {
      const mockSnapshot = {
        role: 'WebArea',
        name: 'Test Page'
      };

      const mockPage = {
        accessibility: {
          snapshot: vi.fn().mockResolvedValue(mockSnapshot)
        }
      };
      
      vi.mocked(BrowserHelper.withActivePage).mockImplementation(
        async (_port, callback) => callback(mockPage as any)
      );
      
      const argv = {
        port: 9222,
        timeout: 30000,
        json: true,
        full: true,
        _: ['snapshot'],
        $0: 'playwright'
      };

      await snapshotCommand.handler(argv as any);

      expect(mockPage.accessibility.snapshot).toHaveBeenCalled();
      expect(extractInteractiveElements).not.toHaveBeenCalled();
    });

    it('should handle empty interactive elements', async () => {
      const mockSnapshot = {
        role: 'WebArea',
        children: []
      };

      const mockPage = {
        accessibility: {
          snapshot: vi.fn().mockResolvedValue(mockSnapshot)
        }
      };
      
      vi.mocked(BrowserHelper.withActivePage).mockImplementation(
        async (_port, callback) => callback(mockPage as any)
      );
      vi.mocked(extractInteractiveElements).mockReturnValue([]);
      
      const argv = {
        port: 9222,
        timeout: 30000,
        json: false,
        full: false,
        _: ['snapshot'],
        $0: 'playwright'
      };

      await snapshotCommand.handler(argv as any);

      expect(extractInteractiveElements).toHaveBeenCalledWith(mockSnapshot);
    });

    it('should handle snapshot errors', async () => {
      vi.mocked(BrowserHelper.withActivePage).mockRejectedValue(
        new Error('Failed to connect to browser')
      );
      
      const argv = {
        port: 9222,
        timeout: 30000,
        _: ['snapshot'],
        $0: 'playwright'
      };

      // Process.exit already mocked in global setup

      await expect(snapshotCommand.handler(argv as any)).rejects.toThrow('process.exit called');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});