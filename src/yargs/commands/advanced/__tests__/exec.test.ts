import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execCommand } from '../exec';
import { BrowserHelper } from '../../../../lib/browser-helper';
import * as fs from 'fs';
import { Readable } from 'stream';

vi.mock('../../../../lib/browser-helper');
vi.mock('fs');

describe('exec command', () => {
  let originalStdin: NodeJS.ReadStream;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Save original stdin
    originalStdin = process.stdin;
    
    // Mock stdin to prevent hanging on read
    const mockStdin = new Readable();
    mockStdin.push(null); // EOF immediately
    Object.defineProperty(process, 'stdin', {
      value: mockStdin,
      writable: true,
      configurable: true
    });
  });
  
  afterEach(() => {
    // Restore original stdin
    Object.defineProperty(process, 'stdin', {
      value: originalStdin,
      writable: true,
      configurable: true
    });
  });
  
  describe('command structure', () => {
    it('should have correct command definition', () => {
      expect(execCommand.command).toBe('exec [file]');
      expect(execCommand.describe).toBe('Execute JavaScript/TypeScript file in Playwright session');
    });
    
    it('should have proper builder', () => {
      expect(execCommand.builder).toBeDefined();
    });
    
    it('should have handler', () => {
      expect(execCommand.handler).toBeDefined();
    });
  });
  
  describe('handler execution', () => {
    it('should execute JavaScript file successfully', async () => {
      const mockCode = 'return page.title()';
      const mockPage = {
        title: vi.fn().mockResolvedValue('Test Page'),
        context: () => ({
          browser: () => ({})
        })
      };
      
      // Mock fs.promises.readFile properly
      vi.mocked(fs.promises).readFile = vi.fn().mockResolvedValue(mockCode);
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        success: vi.fn()
      };
      
      const context = {
        argv: {
          file: 'test.js',
          port: 9222,
          json: false,
          timeout: 30000,
          _: ['exec'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      await execCommand.handler(context as any);

      expect(fs.promises.readFile).toHaveBeenCalledWith('test.js', 'utf-8');
      expect(BrowserHelper.getActivePage).toHaveBeenCalledWith(9222);
      expect(mockLogger.info).toHaveBeenCalledWith('📄 Executing test.js...');
    });

    it('should handle code that returns undefined', async () => {
      const mockCode = 'console.log("Hello World")';
      const mockPage = {
        context: () => ({
          browser: () => ({})
        })
      };
      
      vi.mocked(fs.promises).readFile = vi.fn().mockResolvedValue(mockCode);
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        success: vi.fn()
      };
      
      const context = {
        argv: {
          file: 'test.js',
          port: 9222,
          json: false,
          timeout: 30000,
          _: ['exec'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      await execCommand.handler(context as any);

      expect(mockLogger.success).toHaveBeenCalledWith('Code executed successfully');
    });

    it('should output result as JSON when requested', async () => {
      const mockCode = 'return { title: page.title(), url: page.url() }';
      const mockPage = {
        title: vi.fn().mockReturnValue('Test Page'),
        url: vi.fn().mockReturnValue('https://example.com'),
        context: () => ({
          browser: () => ({})
        })
      };
      
      vi.mocked(fs.promises).readFile = vi.fn().mockResolvedValue(mockCode);
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        success: vi.fn()
      };
      
      const context = {
        argv: {
          file: 'test.js',
          port: 9222,
          json: true,
          timeout: 30000,
          _: ['exec'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      await execCommand.handler(context as any);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('"result":')
      );
    });

    it('should throw error when no browser session', async () => {
      const mockCode = 'return page.title()';
      
      vi.mocked(fs.promises).readFile = vi.fn().mockResolvedValue(mockCode);
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(null);
      
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        success: vi.fn()
      };
      
      const context = {
        argv: {
          file: 'test.js',
          port: 9222,
          json: false,
          timeout: 30000,
          _: ['exec'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      // Process.exit already mocked in global setup

      await expect(execCommand.handler(context as any)).rejects.toThrow('process.exit called');
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(mockLogger.error).toHaveBeenCalledWith('Execution failed: No browser session. Use "playwright open" first');
    });

    it('should handle file reading errors', async () => {
      vi.mocked(fs.promises).readFile = vi.fn().mockRejectedValue(new Error('File not found'));
      
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        success: vi.fn()
      };
      
      const context = {
        argv: {
          file: 'nonexistent.js',
          port: 9222,
          json: false,
          timeout: 30000,
          _: ['exec'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      // Process.exit already mocked in global setup

      await expect(execCommand.handler(context as any)).rejects.toThrow('process.exit called');
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(mockLogger.error).toHaveBeenCalledWith('Execution failed: File not found');
    });

    it('should handle JavaScript syntax errors', async () => {
      const mockCode = 'invalid.syntax(';
      const mockPage = {
        context: () => ({
          browser: () => ({})
        })
      };
      
      vi.mocked(fs.promises).readFile = vi.fn().mockResolvedValue(mockCode);
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        success: vi.fn()
      };
      
      const context = {
        argv: {
          file: 'invalid.js',
          port: 9222,
          json: false,
          timeout: 30000,
          _: ['exec'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      // Process.exit already mocked in global setup

      await expect(execCommand.handler(context as any)).rejects.toThrow('process.exit called');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should execute code with console output', async () => {
      const mockCode = 'console.log("Test message"); return "done"';
      const mockPage = {
        context: () => ({
          browser: () => ({})
        })
      };
      
      vi.mocked(fs.promises).readFile = vi.fn().mockResolvedValue(mockCode);
      vi.mocked(BrowserHelper.getActivePage).mockResolvedValue(mockPage as any);
      
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        success: vi.fn()
      };
      
      const context = {
        argv: {
          file: 'test.js',
          port: 9222,
          json: false,
          timeout: 30000,
          _: ['exec'],
          $0: 'playwright'
        },
        logger: mockLogger
      };

      await execCommand.handler(context as any);

      // Should capture console.log output
      expect(mockLogger.info).toHaveBeenCalledWith('Test message');
    });
  });
});