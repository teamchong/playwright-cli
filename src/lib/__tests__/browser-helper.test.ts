import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import {
  createTestTab,
  closeTestTab,
  runCommand,
} from '../../test-utils/test-helpers'

/**
 * Browser Helper Real Integration Tests
 *
 * Tests browser helper functionality using real browser connections
 * via CLI commands instead of mocks.
 */
describe('BrowserHelper - Real Integration', () => {
  const CLI = 'node dist/src/index.js'
  const TEST_PORT = 19222  // Use same test port as global setup
  let testTabId: string

  beforeAll(async () => {
    // Ensure CLI is built
    try {
      execSync('pnpm run build:ts', { stdio: 'ignore' })
    } catch (e) {
      console.error('Build failed:', e)
    }

    // Create a test tab for browser helper tests
    testTabId = createTestTab('<div id="test">Browser Helper Test Page</div>')
  })

  afterAll(async () => {
    if (testTabId) {
      closeTestTab(testTabId)
    }
  })

  describe('browser connection', () => {
    it('should connect to browser successfully', () => {
      const { output, exitCode } = runCommand(`${CLI} list --port ${TEST_PORT}`)
      expect(exitCode).toBe(0)
      expect(output).toContain('Pages:')
    })

    it('should list pages correctly', () => {
      const { output, exitCode } = runCommand(`${CLI} list --port ${TEST_PORT}`)
      expect(exitCode).toBe(0)
      expect(output).toContain('Browser%20Helper%20Test%20Page')
    })
  })

  describe('page management', () => {
    it('should handle page navigation', () => {
      const { output, exitCode } = runCommand(
        `${CLI} navigate --tab-id ${testTabId} "data:text/html,<h1>New Page</h1>" --port ${TEST_PORT}`
      )
      expect(exitCode).toBe(0)
      expect(output).toContain('Successfully navigated to')
    })

    it('should handle page interactions', () => {
      // Set up test page with clickable element
      const { exitCode: navExitCode } = runCommand(
        `${CLI} navigate --tab-id ${testTabId} "data:text/html,<button id='test-btn'>Click Me</button>" --port ${TEST_PORT}`
      )
      expect(navExitCode).toBe(0)

      // Test clicking the button
      const { output, exitCode } = runCommand(
        `${CLI} click --tab-id ${testTabId} "#test-btn" --port ${TEST_PORT}`
      )
      expect(exitCode).toBe(0)
      expect(output).toContain('Clicked')
    })
  })

  describe('browser lifecycle', () => {
    it('should handle multiple tabs', () => {
      // Create another tab
      const { output: createOutput } = runCommand(
        `${CLI} tabs new --url "data:text/html,<div>Second Tab</div>" --port ${TEST_PORT}`
      )
      expect(createOutput).toContain('Created new tab')

      // List should show multiple tabs
      const { output: listOutput } = runCommand(`${CLI} list --port ${TEST_PORT}`)
      expect(listOutput).toContain('Pages: ')
      expect(listOutput).toContain('Second Tab')
    })

    it('should handle tab switching', () => {
      const { output, exitCode } = runCommand(
        `${CLI} tabs select --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      expect(exitCode).toBe(0)
      expect(output).toContain('Selected tab')
    })
  })

  describe('error handling', () => {
    it('should handle invalid selectors gracefully', () => {
      const { output, exitCode } = runCommand(
        `${CLI} click --tab-id ${testTabId} "invalid-selector-that-does-not-exist" --port ${TEST_PORT}`
      )
      expect(exitCode).toBe(1)
      expect(output).toContain('Element not found')
    })

    it('should handle invalid tab IDs gracefully', () => {
      const { output, exitCode } = runCommand(
        `${CLI} click --tab-id "invalid-tab-id" "button" --port ${TEST_PORT}`
      )
      expect(exitCode).toBe(1)
      expect(output).toContain('Tab with ID "invalid-tab-id" not found')
    })
  })
})