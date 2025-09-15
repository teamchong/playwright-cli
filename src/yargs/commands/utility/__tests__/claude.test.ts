import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { claudeCommand } from '../claude';
import { readFileSync } from 'fs';
import { join } from 'path';

vi.mock('fs');
vi.mock('path');

describe('claude command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('command structure', () => {
    it('should have correct command definition', () => {
      expect(claudeCommand.command).toBe('claude');
      expect(claudeCommand.aliases).toEqual(['claude-instructions']);
      expect(claudeCommand.describe).toBe('Output Claude-specific usage instructions');
    });
    
    it('should have handler', () => {
      expect(claudeCommand.handler).toBeDefined();
    });
  });
  
  describe('handler execution', () => {
    it('should read and output CLAUDE.md when file exists', async () => {
      const mockContent = '# Test Claude Instructions\n\nThis is a test file.';
      
      vi.mocked(join).mockReturnValue('/current/path/CLAUDE.md');
      vi.mocked(readFileSync).mockReturnValue(mockContent);
      
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const argv = {
        _: ['claude'],
        $0: 'playwright'
      };

      await claudeCommand.handler(argv as any);

      expect(join).toHaveBeenCalledWith(process.cwd(), 'CLAUDE.md');
      expect(readFileSync).toHaveBeenCalledWith('/current/path/CLAUDE.md', 'utf-8');
      
      logSpy.mockRestore();
    });

    it('should output fallback instructions when CLAUDE.md does not exist', async () => {
      vi.mocked(join).mockReturnValue('/current/path/CLAUDE.md');
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });
      
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const argv = {
        _: ['claude'],
        $0: 'playwright'
      };

      await claudeCommand.handler(argv as any);

      expect(join).toHaveBeenCalledWith(process.cwd(), 'CLAUDE.md');
      expect(readFileSync).toHaveBeenCalledWith('/current/path/CLAUDE.md', 'utf-8');
      
      logSpy.mockRestore();
    });

    it('should handle file read errors gracefully', async () => {
      vi.mocked(join).mockReturnValue('/current/path/CLAUDE.md');
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const argv = {
        _: ['claude'],
        $0: 'playwright'
      };

      // Should not throw, should fallback to default instructions
      await expect(claudeCommand.handler(argv as any)).resolves.not.toThrow();
      
      logSpy.mockRestore();
    });

    it('should use process.cwd() to construct file path', async () => {
      const mockCwd = '/test/directory';
      const originalCwd = process.cwd;
      process.cwd = vi.fn().mockReturnValue(mockCwd);
      
      vi.mocked(join).mockReturnValue('/test/directory/CLAUDE.md');
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('File not found');
      });
      
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const argv = {
        _: ['claude'],
        $0: 'playwright'
      };

      await claudeCommand.handler(argv as any);

      expect(process.cwd).toHaveBeenCalled();
      expect(join).toHaveBeenCalledWith(mockCwd, 'CLAUDE.md');
      
      process.cwd = originalCwd;
      logSpy.mockRestore();
    });

    it('should output fallback instructions containing core commands', async () => {
      vi.mocked(join).mockReturnValue('/current/path/CLAUDE.md');
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('File not found');
      });
      
      let loggedContent = '';
      const logSpy = vi.spyOn(console, 'log').mockImplementation((content) => {
        loggedContent = content;
      });
      
      const argv = {
        _: ['claude'],
        $0: 'playwright'
      };

      await claudeCommand.handler(argv as any);

      // Check that fallback contains expected content
      expect(loggedContent).toContain('# Playwright CLI - Claude Instructions');
      expect(loggedContent).toContain('playwright open');
      expect(loggedContent).toContain('playwright click');
      expect(loggedContent).toContain('playwright screenshot');
      
      logSpy.mockRestore();
    });
  });
});