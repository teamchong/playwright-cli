import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { installCommand } from '../install';
import { exec } from 'child_process';
import { promisify } from 'util';

vi.mock('child_process');
vi.mock('util');

describe('install command', () => {
  const mockExecAsync = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(promisify).mockReturnValue(mockExecAsync);
  });
  
  describe('command structure', () => {
    it('should have correct command definition', () => {
      expect(installCommand.command).toBe('install [browser]');
      expect(installCommand.describe).toBe('Install browser binaries');
    });
    
    it('should have proper builder', () => {
      expect(installCommand.builder).toBeDefined();
    });
    
    it('should have handler', () => {
      expect(installCommand.handler).toBeDefined();
    });
  });
  
  describe('handler execution', () => {
    it('should install chromium by default', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'Chromium installed successfully',
        stderr: ''
      });
      
      const argv = {
        browser: undefined,
        _: ['install'],
        $0: 'playwright'
      };

      await installCommand.handler(argv as any);

      expect(mockExecAsync).toHaveBeenCalledWith('npx playwright install chromium');
    });

    it('should install specified browser', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'Firefox installed successfully',
        stderr: ''
      });
      
      const argv = {
        browser: 'firefox',
        _: ['install'],
        $0: 'playwright'
      };

      await installCommand.handler(argv as any);

      expect(mockExecAsync).toHaveBeenCalledWith('npx playwright install firefox');
    });

    it('should install webkit', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'WebKit installed successfully',
        stderr: ''
      });
      
      const argv = {
        browser: 'webkit',
        _: ['install'],
        $0: 'playwright'
      };

      await installCommand.handler(argv as any);

      expect(mockExecAsync).toHaveBeenCalledWith('npx playwright install webkit');
    });

    it('should handle installation with stderr output', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'Chromium installed successfully',
        stderr: 'Warning: Some components skipped'
      });
      
      const argv = {
        browser: 'chromium',
        _: ['install'],
        $0: 'playwright'
      };

      await installCommand.handler(argv as any);

      expect(mockExecAsync).toHaveBeenCalledWith('npx playwright install chromium');
    });

    it('should handle installation errors', async () => {
      mockExecAsync.mockRejectedValue(new Error('Installation failed: Network error'));
      
      const argv = {
        browser: 'chromium',
        _: ['install'],
        $0: 'playwright'
      };

      // Process.exit already mocked in global setup

      await expect(installCommand.handler(argv as any)).rejects.toThrow('process.exit called');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle empty stdout', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: '',
        stderr: ''
      });
      
      const argv = {
        browser: 'chromium',
        _: ['install'],
        $0: 'playwright'
      };

      await installCommand.handler(argv as any);

      expect(mockExecAsync).toHaveBeenCalledWith('npx playwright install chromium');
    });

    it('should use chromium when browser is explicitly undefined', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'Chromium installed successfully',
        stderr: ''
      });
      
      const argv = {
        browser: undefined,
        _: ['install'],
        $0: 'playwright'
      };

      await installCommand.handler(argv as any);

      expect(mockExecAsync).toHaveBeenCalledWith('npx playwright install chromium');
    });
  });
});