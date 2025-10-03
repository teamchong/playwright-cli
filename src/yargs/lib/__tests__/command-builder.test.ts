import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createCommand,
  createLogger,
  validators,
  createBrowserCommand,
  modifierMiddleware,
  formatOutput,
  withTimeout,
  withRetry,
  CommandRegistry,
} from '../command-builder'
import type { BaseCommandOptions, CommandMetadata } from '../../types'

describe('Command Builder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createCommand', () => {
    it('should create a command with proper structure', () => {
      const metadata: CommandMetadata = {
        name: 'test',
        category: 'utility',
        description: 'Test command',
      }

      const command = createCommand({
        metadata,
        command: 'test <arg>',
        describe: 'Test command',
        builder: yargs => yargs.positional('arg', { type: 'string' }),
        handler: async context => {
          context.logger.info('Test executed')
        },
      })

      expect(command.command).toBe('test <arg>')
      expect(command.describe).toBe('Test command')
      expect(command.handler).toBeDefined()
      expect(command.builder).toBeDefined()
    })

    it('should handle errors properly', async () => {
      const command = createCommand({
        metadata: {
          name: 'error',
          category: 'utility',
          description: 'Error test',
        },
        command: 'error',
        describe: 'Error test',
        builder: yargs => yargs,
        handler: async () => {
          throw new Error('Test error')
        },
      })

      const mockConsoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      const argv = { port: 9222, _: ['error'], $0: 'test' } as any

      await expect(command.handler(argv)).rejects.toThrow('Test error')
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        'Test error'
      )

      mockConsoleError.mockRestore()
    })

    it('should run validation if provided', async () => {
      const validateArgs = vi.fn().mockReturnValue('Validation error')

      const command = createCommand({
        metadata: {
          name: 'validate',
          category: 'utility',
          description: 'Validate test',
        },
        command: 'validate',
        describe: 'Validate test',
        builder: yargs => yargs,
        handler: async () => {},
        validateArgs,
      })

      const mockConsoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      const argv = { port: 9222, _: ['validate'], $0: 'test' } as any

      await expect(command.handler(argv)).rejects.toThrow('Validation error')
      expect(validateArgs).toHaveBeenCalledWith(argv)
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        'Validation error'
      )

      mockConsoleError.mockRestore()
    })

    it('should output JSON on error when json flag is set', async () => {
      const command = createCommand({
        metadata: {
          name: 'json-error',
          category: 'utility',
          description: 'JSON error test',
        },
        command: 'json-error',
        describe: 'JSON error test',
        builder: yargs => yargs,
        handler: async () => {
          throw new Error('JSON test error')
        },
        supportsJson: true,
      })

      const mockConsoleLog = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {})

      const argv = {
        port: 9222,
        json: true,
        _: ['json-error'],
        $0: 'test',
      } as any

      await expect(command.handler(argv)).rejects.toThrow('JSON test error')
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"success": false')
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"error": "JSON test error"')
      )

      mockConsoleLog.mockRestore()
    })
  })

  describe('createLogger', () => {
    let mockConsole: any

    beforeEach(() => {
      mockConsole = {
        log: vi.spyOn(console, 'log').mockImplementation(() => {}),
        error: vi.spyOn(console, 'error').mockImplementation(() => {}),
        warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      }
    })

    afterEach(() => {
      mockConsole.log.mockRestore()
      mockConsole.error.mockRestore()
      mockConsole.warn.mockRestore()
    })

    it('should create a logger that respects quiet mode', () => {
      const logger = createLogger({
        port: 9222,
        quiet: true,
      } as BaseCommandOptions)

      logger.info('Info message')
      logger.success('Success message')
      logger.warn('Warning message')

      expect(mockConsole.log).not.toHaveBeenCalled()
      expect(mockConsole.warn).not.toHaveBeenCalled()

      // Error should still work in quiet mode
      logger.error('Error message')
      expect(mockConsole.error).toHaveBeenCalled()
    })

    it('should create a logger that outputs JSON when json flag is set', () => {
      const logger = createLogger({
        port: 9222,
        json: true,
      } as BaseCommandOptions)

      logger.info('Info message')
      logger.success('Success message')
      expect(mockConsole.log).not.toHaveBeenCalled()

      logger.json({ data: 'test' })
      expect(mockConsole.log).toHaveBeenCalledWith('{\n  "data": "test"\n}')
    })

    it('should not output debug messages to stdout (prevents pollution)', () => {
      const logger = createLogger({ port: 9222 } as BaseCommandOptions)
      logger.debug('Debug message')
      expect(mockConsole.log).not.toHaveBeenCalled()

      // Even in verbose mode, debug output is suppressed to prevent stdout pollution
      const verboseLogger = createLogger({
        port: 9222,
        verbose: true,
      } as BaseCommandOptions)
      verboseLogger.debug('Debug message')
      expect(mockConsole.log).not.toHaveBeenCalled()
    })
  })

  describe('validators', () => {
    it('should validate URLs correctly', () => {
      expect(validators.isValidUrl('https://example.com')).toBe(true)
      expect(validators.isValidUrl('http://localhost:3000')).toBe(true)
      expect(validators.isValidUrl('not a url')).toBe(false)
      expect(validators.isValidUrl('')).toBe(false)
    })

    it('should validate port numbers correctly', () => {
      expect(validators.isValidPort(9222)).toBe(true)
      expect(validators.isValidPort(80)).toBe(true)
      expect(validators.isValidPort(65535)).toBe(true)
      expect(validators.isValidPort(0)).toBe(false)
      expect(validators.isValidPort(65536)).toBe(false)
      expect(validators.isValidPort(3.14)).toBe(false)
      expect(validators.isValidPort(-1)).toBe(false)
    })

    it('should validate selectors correctly', () => {
      expect(validators.isValidSelector('#id')).toBe(true)
      expect(validators.isValidSelector('.class')).toBe(true)
      expect(validators.isValidSelector('[data-test]')).toBe(true)
      expect(validators.isValidSelector('')).toBe(false)
      expect(validators.isValidSelector('  ')).toBe(false)
    })
  })

  describe('modifierMiddleware', () => {
    it('should parse modifier flags into an array', () => {
      const argv = {
        'shift': true,
        'ctrl': true,
        'alt': false,
        'meta': true,
        'ctrl-or-meta': true,
      } as any

      modifierMiddleware(argv)

      expect(argv.modifiers).toEqual([
        'Shift',
        'Control',
        'Meta',
        'ControlOrMeta',
      ])
    })

    it('should handle no modifiers', () => {
      const argv = {} as any
      modifierMiddleware(argv)
      expect(argv.modifiers).toEqual([])
    })
  })

  describe('formatOutput', () => {
    it('should format as JSON', () => {
      const data = { test: 'value' }
      const output = formatOutput(data, 'json')
      expect(output).toBe('{\n  "test": "value"\n}')
    })

    it('should format as list', () => {
      const data = ['item1', 'item2', 'item3']
      const output = formatOutput(data, 'list')
      expect(output).toBe('1. item1\n2. item2\n3. item3')
    })

    it('should format as table', () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ]
      const output = formatOutput(data, 'table')
      expect(output).toContain('name\tage')
      expect(output).toContain('Alice\t30')
      expect(output).toContain('Bob\t25')
    })
  })

  describe('withTimeout', () => {
    it('should resolve if operation completes within timeout', async () => {
      const result = await withTimeout(Promise.resolve('success'), 1000)
      expect(result).toBe('success')
    })

    it('should reject if operation times out', async () => {
      const slowOperation = new Promise(resolve => setTimeout(resolve, 2000))

      await expect(
        withTimeout(slowOperation, 100, 'Custom timeout message')
      ).rejects.toThrow('Custom timeout message')
    })
  })

  describe('withRetry', () => {
    it('should succeed on first try', async () => {
      const operation = vi.fn().mockResolvedValue('success')
      const result = await withRetry(operation)

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure and eventually succeed', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success')

      const result = await withRetry(operation, 3, 10)

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should throw after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'))

      await expect(withRetry(operation, 2, 10)).rejects.toThrow('Always fails')

      expect(operation).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })
  })

  describe('CommandRegistry', () => {
    it('should register and retrieve commands', () => {
      const registry = new CommandRegistry()

      const metadata1: CommandMetadata = {
        name: 'cmd1',
        category: 'navigation',
        description: 'Command 1',
      }

      const metadata2: CommandMetadata = {
        name: 'cmd2',
        category: 'interaction',
        description: 'Command 2',
      }

      registry.register('cmd1', metadata1)
      registry.register('cmd2', metadata2)

      expect(registry.get('cmd1')).toEqual(metadata1)
      expect(registry.get('cmd2')).toEqual(metadata2)
      expect(registry.get('cmd3')).toBeUndefined()
    })

    it('should get all commands', () => {
      const registry = new CommandRegistry()

      const metadata1: CommandMetadata = {
        name: 'cmd1',
        category: 'navigation',
        description: 'Command 1',
      }

      const metadata2: CommandMetadata = {
        name: 'cmd2',
        category: 'navigation',
        description: 'Command 2',
      }

      registry.register('cmd1', metadata1)
      registry.register('cmd2', metadata2)

      expect(registry.getAll()).toHaveLength(2)
      expect(registry.getAll()).toContainEqual(metadata1)
      expect(registry.getAll()).toContainEqual(metadata2)
    })

    it('should get commands by category', () => {
      const registry = new CommandRegistry()

      registry.register('nav1', {
        name: 'nav1',
        category: 'navigation',
        description: 'Nav 1',
      })

      registry.register('nav2', {
        name: 'nav2',
        category: 'navigation',
        description: 'Nav 2',
      })

      registry.register('int1', {
        name: 'int1',
        category: 'interaction',
        description: 'Int 1',
      })

      const navCommands = registry.getByCategory('navigation')
      expect(navCommands).toHaveLength(2)
      expect(navCommands[0].category).toBe('navigation')
      expect(navCommands[1].category).toBe('navigation')

      const intCommands = registry.getByCategory('interaction')
      expect(intCommands).toHaveLength(1)
      expect(intCommands[0].category).toBe('interaction')
    })
  })
})
