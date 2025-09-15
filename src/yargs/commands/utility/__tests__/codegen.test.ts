import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { codegenCommand } from '../codegen';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

vi.mock('child_process');

describe('codegen command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('command structure', () => {
    it('should have correct command definition', () => {
      expect(codegenCommand.command).toBe('codegen [url]');
      expect(codegenCommand.describe).toBe('Open Playwright code generator');
    });
    
    it('should have proper builder', () => {
      expect(codegenCommand.builder).toBeDefined();
    });
    
    it('should have handler', () => {
      expect(codegenCommand.handler).toBeDefined();
    });
  });
  
  describe('handler execution', () => {
    it('should spawn codegen without URL', async () => {
      const mockChild = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockChild as any);
      
      const argv = {
        url: undefined,
        _: ['codegen'],
        $0: 'playwright'
      };

      const handlerPromise = codegenCommand.handler(argv as any);
      
      // Simulate child process exit
      setTimeout(() => {
        mockChild.emit('exit', 0);
      }, 10);

      // Process.exit already mocked in global setup

      await expect(handlerPromise).rejects.toThrow('process.exit called with code 1');
      
      expect(spawn).toHaveBeenCalledWith('npx', ['playwright', 'codegen'], {
        stdio: 'inherit'
      });
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should spawn codegen with URL', async () => {
      const mockChild = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockChild as any);
      
      const argv = {
        url: 'https://example.com',
        _: ['codegen'],
        $0: 'playwright'
      };

      const handlerPromise = codegenCommand.handler(argv as any);
      
      // Simulate child process exit
      setTimeout(() => {
        mockChild.emit('exit', 0);
      }, 10);

      // Process.exit already mocked in global setup

      await expect(handlerPromise).rejects.toThrow('process.exit called with code 1');
      
      expect(spawn).toHaveBeenCalledWith('npx', ['playwright', 'codegen', 'https://example.com'], {
        stdio: 'inherit'
      });
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should handle child process exit with error code', async () => {
      const mockChild = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockChild as any);
      
      const argv = {
        url: undefined,
        _: ['codegen'],
        $0: 'playwright'
      };

      const handlerPromise = codegenCommand.handler(argv as any);
      
      // Simulate child process exit with error
      setTimeout(() => {
        mockChild.emit('exit', 1);
      }, 10);

      // Process.exit already mocked in global setup

      await expect(handlerPromise).rejects.toThrow('process.exit called with code 1');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle child process exit with null code', async () => {
      const mockChild = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockChild as any);
      
      const argv = {
        url: undefined,
        _: ['codegen'],
        $0: 'playwright'
      };

      const handlerPromise = codegenCommand.handler(argv as any);
      
      // Simulate child process exit with null code
      setTimeout(() => {
        mockChild.emit('exit', null);
      }, 10);

      // Process.exit already mocked in global setup

      await expect(handlerPromise).rejects.toThrow('process.exit called with code 1');
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });
});