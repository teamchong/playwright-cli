import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
} from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { BrowserHelper } from '../browser-helper'
import { SessionManager, type SessionData } from '../session-manager'
import {
  createMockBrowser,
  createMockPage,
  createMockContext,
} from './mock-helpers'

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
  unlinkSync: vi.fn(),
}))
vi.mock('../browser-helper')
vi.mock('../platform-helper', () => ({
  PlatformHelper: {
    getClaudeDir: () => join(homedir(), '.claude'),
    getOrCreateClaudeDir: vi.fn(() => join(homedir(), '.claude'))
  }
}))

const CLAUDE_DIR = join(homedir(), '.claude')
const SESSIONS_DIR = join(CLAUDE_DIR, 'playwright-sessions')

describe('SessionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSessionPath', () => {
    it('should return correct session path', () => {
      const path = SessionManager.getSessionPath('my-session')
      expect(path).toBe(join(SESSIONS_DIR, 'my-session.json'))
    })
  })

  describe('saveSession', () => {
    it('should save session data', async () => {
      const mockPage = createMockPage('https://example.com')
      const mockContext = createMockContext([mockPage])
      const mockBrowser = createMockBrowser()

      mockContext.cookies = vi
        .fn()
        .mockResolvedValue([
          { name: 'session', value: 'abc123', domain: 'example.com' },
        ])

      mockPage.viewportSize = vi
        .fn()
        .mockReturnValue({ width: 1920, height: 1080 })
      mockPage.evaluate = vi
        .fn()
        .mockResolvedValueOnce('Mozilla/5.0') // userAgent
        .mockResolvedValueOnce({ theme: 'dark' }) // localStorage
        .mockResolvedValueOnce({ temp: 'data' }) // sessionStorage

      mockBrowser.contexts = vi.fn(() => [mockContext])

      vi.mocked(BrowserHelper.withBrowser).mockImplementation(
        async (port, action) => {
          return action(mockBrowser as any)
        }
      )

      vi.mocked(existsSync).mockReturnValue(false)

      await SessionManager.saveSession('test-session', 9222, 'Test description')

      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('test-session.json'),
        expect.stringContaining('"name": "test-session"')
      )

      const savedData = JSON.parse(
        vi.mocked(writeFileSync).mock.calls[0][1] as string
      ) as SessionData

      expect(savedData).toMatchObject({
        name: 'test-session',
        url: 'https://example.com',
        port: 9222,
        cookies: [{ name: 'session', value: 'abc123', domain: 'example.com' }],
        localStorage: { theme: 'dark' },
        sessionStorage: { temp: 'data' },
        viewportSize: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0',
        metadata: { description: 'Test description' },
      })
    })

    it('should create directories if not exist', async () => {
      const mockPage = createMockPage()
      const mockContext = createMockContext([mockPage])
      const mockBrowser = createMockBrowser()

      mockContext.cookies = vi.fn().mockResolvedValue([])
      mockPage.viewportSize = vi.fn().mockReturnValue(null)
      mockPage.evaluate = vi.fn().mockResolvedValue({})
      mockBrowser.contexts = vi.fn(() => [mockContext])

      vi.mocked(BrowserHelper.withBrowser).mockImplementation(
        async (port, action) => {
          return action(mockBrowser as any)
        }
      )

      vi.mocked(existsSync).mockReturnValue(false)

      await SessionManager.saveSession('test', 9222)

      expect(mkdirSync).toHaveBeenCalledWith(SESSIONS_DIR, { recursive: true })
    })

    it('should preserve createdAt when updating existing session', async () => {
      const existingSession = {
        name: 'test',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }

      const mockPage = createMockPage()
      const mockContext = createMockContext([mockPage])
      const mockBrowser = createMockBrowser()

      mockContext.cookies = vi.fn().mockResolvedValue([])
      mockPage.viewportSize = vi.fn().mockReturnValue(null)
      mockPage.evaluate = vi.fn().mockResolvedValue({})
      mockBrowser.contexts = vi.fn(() => [mockContext])

      vi.mocked(BrowserHelper.withBrowser).mockImplementation(
        async (port, action) => {
          return action(mockBrowser as any)
        }
      )

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existingSession))

      await SessionManager.saveSession('test', 9222)

      const savedData = JSON.parse(
        vi.mocked(writeFileSync).mock.calls[0][1] as string
      ) as SessionData

      expect(savedData.createdAt).toBe('2024-01-01T00:00:00.000Z')
      expect(savedData.updatedAt).not.toBe('2024-01-01T00:00:00.000Z')
    })

    it('should throw error when no browser context', async () => {
      const mockBrowser = createMockBrowser()
      mockBrowser.contexts = vi.fn(() => [])

      vi.mocked(BrowserHelper.withBrowser).mockImplementation(
        async (port, action) => {
          return action(mockBrowser as any)
        }
      )

      await expect(SessionManager.saveSession('test', 9222)).rejects.toThrow(
        'No browser context found'
      )
    })
  })

  describe('loadSession', () => {
    it('should load session data', async () => {
      const sessionData: SessionData = {
        name: 'test',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T12:00:00.000Z',
        url: 'https://example.com',
        port: 9222,
        cookies: [{ name: 'session', value: 'xyz789' }],
        localStorage: { user: 'john' },
        sessionStorage: { cart: 'items' },
        viewportSize: { width: 1280, height: 720 },
        userAgent: 'Chrome',
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(sessionData))

      const mockPage = createMockPage()
      const mockContext = createMockContext([mockPage])
      const mockBrowser = createMockBrowser()

      mockContext.addCookies = vi.fn()
      mockPage.setViewportSize = vi.fn()
      mockPage.goto = vi.fn()
      mockPage.evaluate = vi.fn()
      mockPage.reload = vi.fn()
      mockBrowser.contexts = vi.fn(() => [mockContext])

      vi.mocked(BrowserHelper.withBrowser).mockImplementation(
        async (port, action) => {
          return action(mockBrowser as any)
        }
      )

      await SessionManager.loadSession('test', 9222)

      expect(mockContext.addCookies).toHaveBeenCalledWith(sessionData.cookies)
      expect(mockPage.setViewportSize).toHaveBeenCalledWith(
        sessionData.viewportSize
      )
      expect(mockPage.goto).toHaveBeenCalledWith(sessionData.url)
      expect(mockPage.evaluate).toHaveBeenCalledTimes(2) // localStorage and sessionStorage
      expect(mockPage.reload).toHaveBeenCalled()
    })

    it('should create new page if none exists', async () => {
      const sessionData: SessionData = {
        name: 'test',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T12:00:00.000Z',
        url: 'https://example.com',
        port: 9222,
        cookies: [],
        localStorage: {},
        sessionStorage: {},
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(sessionData))

      const mockPage = createMockPage()
      const mockContext = createMockContext([])
      const mockBrowser = createMockBrowser()

      mockContext.newPage = vi.fn().mockResolvedValue(mockPage)
      mockContext.addCookies = vi.fn()
      mockPage.goto = vi.fn()
      mockPage.reload = vi.fn()
      mockBrowser.contexts = vi.fn(() => [mockContext])

      vi.mocked(BrowserHelper.withBrowser).mockImplementation(
        async (port, action) => {
          return action(mockBrowser as any)
        }
      )

      await SessionManager.loadSession('test', 9222)

      expect(mockContext.newPage).toHaveBeenCalled()
      expect(mockPage.goto).toHaveBeenCalledWith(sessionData.url)
    })

    it('should throw error when session not found', async () => {
      vi.mocked(existsSync).mockReturnValue(false)

      await expect(
        SessionManager.loadSession('nonexistent', 9222)
      ).rejects.toThrow("Session 'nonexistent' not found")
    })

    it('should handle error during load', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({ invalid: 'data' })
      )

      vi.mocked(BrowserHelper.withBrowser).mockRejectedValue(
        new Error('Browser error')
      )

      await expect(SessionManager.loadSession('test', 9222)).rejects.toThrow(
        'Failed to load session: Browser error'
      )
    })
  })

  describe('listSessions', () => {
    it('should list all sessions sorted by update time', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readdirSync).mockReturnValue([
        'session1.json',
        'session2.json',
        'other.txt',
      ] as any)

      const session1: SessionData = {
        name: 'session1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T10:00:00.000Z',
        url: 'https://example1.com',
        port: 9222,
        cookies: [],
        localStorage: {},
        sessionStorage: {},
      }

      const session2: SessionData = {
        name: 'session2',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T15:00:00.000Z',
        url: 'https://example2.com',
        port: 9222,
        cookies: [],
        localStorage: {},
        sessionStorage: {},
      }

      vi.mocked(readFileSync).mockImplementation(path => {
        if (path.toString().includes('session1.json')) {
          return JSON.stringify(session1)
        }
        if (path.toString().includes('session2.json')) {
          return JSON.stringify(session2)
        }
        return '{}'
      })

      const sessions = SessionManager.listSessions()

      expect(sessions).toHaveLength(2)
      expect(sessions[0].name).toBe('session2') // More recent
      expect(sessions[1].name).toBe('session1')
    })

    it('should handle corrupted session files', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readdirSync).mockReturnValue(['good.json', 'bad.json'] as any)

      vi.mocked(readFileSync).mockImplementation(path => {
        if (path.toString().includes('good.json')) {
          return JSON.stringify({
            name: 'good',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            url: 'https://example.com',
            port: 9222,
            cookies: [],
            localStorage: {},
            sessionStorage: {},
          })
        }
        throw new Error('Invalid JSON')
      })

      const sessions = SessionManager.listSessions()

      expect(sessions).toHaveLength(1)
      expect(sessions[0].name).toBe('good')
    })

    it('should return empty array when no sessions', () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(readdirSync).mockReturnValue([])

      const sessions = SessionManager.listSessions()

      expect(sessions).toEqual([])
    })
  })

  describe('deleteSession', () => {
    it('should delete session file', async () => {
      vi.mocked(existsSync).mockReturnValue(true)

      await SessionManager.deleteSession('test')

      expect(unlinkSync).toHaveBeenCalledWith(
        expect.stringContaining('test.json')
      )
    })

    it('should throw error when session not found', async () => {
      vi.mocked(existsSync).mockReturnValue(false)

      await expect(SessionManager.deleteSession('nonexistent')).rejects.toThrow(
        "Session 'nonexistent' not found"
      )
    })

    it('should handle deletion error', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(unlinkSync).mockImplementation(() => {
        throw new Error('Permission denied')
      })

      await expect(SessionManager.deleteSession('test')).rejects.toThrow(
        'Failed to delete session: Permission denied'
      )
    })
  })

  describe('sessionExists', () => {
    it('should return true when session exists', () => {
      vi.mocked(existsSync).mockReturnValue(true)

      const exists = SessionManager.sessionExists('test')

      expect(exists).toBe(true)
      expect(existsSync).toHaveBeenCalledWith(
        expect.stringContaining('test.json')
      )
    })

    it('should return false when session does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const exists = SessionManager.sessionExists('nonexistent')

      expect(exists).toBe(false)
    })
  })
})
