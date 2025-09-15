import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { testCommand } from '../test';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

vi.mock('child_process');

describe('test command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('command structure', () => {
    it('should have correct command definition', () => {
      expect(testCommand.command).toBe('test [spec]');
      expect(testCommand.describe).toBe('Run Playwright tests');
    });
    
    it('should have proper builder', () => {
      expect(testCommand.builder).toBeDefined();
    });
    
    it('should have handler', () => {
      expect(testCommand.handler).toBeDefined();
    });
  });
  
  describe('handler execution', () => {
    it('should run all tests when no spec provided', async () => {
      const mockChild = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockChild as any);
      
      const argv = {
        spec: undefined,
        ui: false,
        debug: false,
        _: ['test'],
        $0: 'playwright'
      };

      const handlerPromise = testCommand.handler(argv as any);
      
      // Simulate child process exit
      setTimeout(() => {
        mockChild.emit('exit', 0);
      }, 10);

      // Process.exit already mocked in global setup

      await expect(handlerPromise).rejects.toThrow('process.exit called with code 1');
      
      expect(spawn).toHaveBeenCalledWith('npx', ['playwright', 'test'], {
        stdio: 'inherit'
      });
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should run specific test file when spec provided', async () => {
      const mockChild = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockChild as any);
      
      const argv = {
        spec: 'tests/login.spec.ts',
        ui: false,
        debug: false,
        _: ['test'],
        $0: 'playwright'
      };

      const handlerPromise = testCommand.handler(argv as any);
      
      // Simulate child process exit
      setTimeout(() => {
        mockChild.emit('exit', 0);
      }, 10);

      // Process.exit already mocked in global setup

      await expect(handlerPromise).rejects.toThrow('process.exit called with code 1');
      
      expect(spawn).toHaveBeenCalledWith('npx', ['playwright', 'test', 'tests/login.spec.ts'], {
        stdio: 'inherit'
      });
    });

    it('should run tests in UI mode when ui flag is set', async () => {
      const mockChild = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockChild as any);
      
      const argv = {
        spec: undefined,
        ui: true,
        debug: false,
        _: ['test'],
        $0: 'playwright'
      };

      const handlerPromise = testCommand.handler(argv as any);
      
      // Simulate child process exit
      setTimeout(() => {
        mockChild.emit('exit', 0);
      }, 10);

      // Process.exit already mocked in global setup

      await expect(handlerPromise).rejects.toThrow('process.exit called with code 1');
      
      expect(spawn).toHaveBeenCalledWith('npx', ['playwright', 'test', '--ui'], {
        stdio: 'inherit'
      });
    });

    it('should run tests in debug mode when debug flag is set', async () => {
      const mockChild = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockChild as any);
      
      const argv = {
        spec: undefined,
        ui: false,
        debug: true,
        _: ['test'],
        $0: 'playwright'
      };

      const handlerPromise = testCommand.handler(argv as any);
      
      // Simulate child process exit
      setTimeout(() => {
        mockChild.emit('exit', 0);
      }, 10);

      // Process.exit already mocked in global setup

      await expect(handlerPromise).rejects.toThrow('process.exit called with code 1');
      
      expect(spawn).toHaveBeenCalledWith('npx', ['playwright', 'test', '--debug'], {
        stdio: 'inherit'
      });
    });

    it('should combine spec, ui, and debug options', async () => {
      const mockChild = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockChild as any);
      
      const argv = {
        spec: 'tests/auth.spec.ts',
        ui: true,
        debug: true,
        _: ['test'],
        $0: 'playwright'
      };

      const handlerPromise = testCommand.handler(argv as any);
      
      // Simulate child process exit
      setTimeout(() => {
        mockChild.emit('exit', 0);
      }, 10);

      // Process.exit already mocked in global setup

      await expect(handlerPromise).rejects.toThrow('process.exit called with code 1');
      
      expect(spawn).toHaveBeenCalledWith('npx', ['playwright', 'test', 'tests/auth.spec.ts', '--ui', '--debug'], {
        stdio: 'inherit'
      });
    });

    it('should handle test failures with exit code 1', async () => {
      const mockChild = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockChild as any);
      
      const argv = {
        spec: undefined,
        ui: false,
        debug: false,
        _: ['test'],
        $0: 'playwright'
      };

      const handlerPromise = testCommand.handler(argv as any);
      
      // Simulate test failure
      setTimeout(() => {
        mockChild.emit('exit', 1);
      }, 10);

      // Process.exit already mocked in global setup

      await expect(handlerPromise).rejects.toThrow('process.exit called with code 1');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});