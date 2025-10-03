/**
 * Tab Manager for Real CLI Tests
 *
 * Ensures all tests properly manage tabs:
 * 1. Each test uses specific tab IDs
 * 2. Tabs are cleaned up after each test
 * 3. No workarounds - tests must pass with real usage
 * 4. When tab ID not found, no tabs should close
 */

import { execSync } from 'child_process'
import { TEST_PORT, CLI } from './test-constants'

export interface TabInfo {
  id: string
  index: number
  title: string
  url: string
}

export class TabManager {
  private static createdTabs: Set<string> = new Set()

  /**
   * Run command and check it doesn't hang
   */
  static runCommand(
    cmd: string,
    timeout = 5000
  ): { output: string; exitCode: number } {
    try {
      // Clean environment to avoid inheriting test-specific flags from test runner
      // But preserve flags explicitly set in the command
      const cleanEnv = { ...process.env }

      // Remove NODE_ENV=test so subprocesses don't activate test-mode behavior
      // The CLI's .fail() handler behaves differently in test mode (throws instead of exit)
      delete cleanEnv.NODE_ENV

      // Only remove verbose flags if --quiet or --json is NOT in the command
      const hasQuietOrJson = cmd.includes('--quiet') || cmd.includes('--json')
      if (!hasQuietOrJson) {
        delete cleanEnv.PLAYWRIGHT_VERBOSE
        delete cleanEnv.PLAYWRIGHT_DEBUG
        delete cleanEnv.DEBUG
      }

      const output = execSync(cmd, {
        encoding: 'utf8',
        timeout,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: cleanEnv,
      })
      return { output, exitCode: 0 }
    } catch (error: any) {
      if (error.code === 'ETIMEDOUT') {
        throw new Error(`Command timed out (hanging): ${cmd}`)
      }
      // Combine stdout and stderr for full error output
      const output = (error.stdout || '') + (error.stderr || '')
      return {
        output,
        exitCode: error.status || 1,
      }
    }
  }

  /**
   * Register a tab ID for cleanup
   * Use this when tests create tabs directly via CLI
   */
  static registerTab(tabId: string): void {
    this.createdTabs.add(tabId)
  }

  /**
   * Unregister a tab ID (when manually closed)
   */
  static unregisterTab(tabId: string): void {
    this.createdTabs.delete(tabId)
  }

  /**
   * Extract tab ID from CLI output and register it
   */
  static extractAndRegisterTabId(output: string): string {
    const tabIdMatch = output.match(/Tab ID: ([a-fA-F0-9]+)/)
    if (!tabIdMatch) {
      // Provide more context in error message
      const truncated = output.length > 200 ? output.substring(0, 200) + '...' : output
      throw new Error(`Could not extract tab ID from output. Output was: "${truncated}"`)
    }
    const tabId = tabIdMatch[1]
    this.registerTab(tabId)
    return tabId
  }

  /**
   * Create a new tab and return its ID for use in tests
   */
  static createTab(url?: string): string {
    const urlArg = url ? `--url ${url}` : ''
    const { output, exitCode } = this.runCommand(
      `${CLI} tabs new ${urlArg} --port ${TEST_PORT}`
    )

    if (exitCode !== 0) {
      throw new Error(`Failed to create tab: ${output}`)
    }

    // Extract tab ID from output
    const tabIdMatch = output.match(/Tab ID: ([a-fA-F0-9]+)/)
    if (!tabIdMatch) {
      throw new Error(`Could not extract tab ID from output: ${output}`)
    }

    const tabId = tabIdMatch[1]
    this.createdTabs.add(tabId)
    return tabId
  }

  /**
   * Get list of all tabs with their IDs
   */
  static getTabs(): TabInfo[] {
    const { output, exitCode } = this.runCommand(`${CLI} tabs list --port ${TEST_PORT}`)

    if (exitCode !== 0) {
      throw new Error(`Failed to list tabs: ${output}`)
    }

    const tabs: TabInfo[] = []
    const lines = output.split('\n')

    let currentTab: Partial<TabInfo> = {}
    for (const line of lines) {
      const trimmed = line.trim()

      // Match tab index and title: "  0: Example Title"
      const indexMatch = trimmed.match(/^(\d+): (.+)$/)
      if (indexMatch) {
        currentTab.index = parseInt(indexMatch[1])
        currentTab.title = indexMatch[2]
        continue
      }

      // Match URL: "     https://example.com"
      if (
        trimmed.startsWith('http') ||
        trimmed.startsWith('about:') ||
        trimmed.startsWith('chrome:')
      ) {
        currentTab.url = trimmed
        continue
      }

      // Match ID: "     ID: ABC123"
      const idMatch = trimmed.match(/^ID: ([a-fA-F0-9]+)$/)
      if (idMatch) {
        currentTab.id = idMatch[1]

        // Complete tab info, add to list
        if (
          currentTab.index !== undefined &&
          currentTab.title &&
          currentTab.url &&
          currentTab.id
        ) {
          tabs.push({
            index: currentTab.index,
            title: currentTab.title,
            url: currentTab.url,
            id: currentTab.id,
          })
        }
        currentTab = {}
      }
    }

    return tabs
  }

  /**
   * Close a tab by its specific ID
   * If tab ID not found, no tabs should close
   */
  static closeTabById(tabId: string): boolean {
    const tabs = this.getTabs()
    const tab = tabs.find(t => t.id === tabId)

    if (!tab) {
      // Tab ID not found, no tabs should close
      return false
    }

    const { exitCode } = this.runCommand(
      `${CLI} tabs close --index ${tab.index} --port ${TEST_PORT}`
    )
    this.createdTabs.delete(tabId)

    return exitCode === 0
  }

  /**
   * Close all tabs created during tests
   */
  static cleanupAllCreatedTabs(): void {
    const tabsToClose = Array.from(this.createdTabs)

    for (const tabId of tabsToClose) {
      try {
        this.closeTabById(tabId)
      } catch (error) {
        // Continue cleanup even if individual tab close fails
        console.warn(`Failed to close tab ${tabId}:`, error)
      }
    }

    this.createdTabs.clear()
  }

  /**
   * Get a tab by specific ID
   */
  static getTabById(tabId: string): TabInfo | null {
    const tabs = this.getTabs()
    return tabs.find(t => t.id === tabId) || null
  }

  /**
   * Verify a tab exists before using it in commands
   */
  static verifyTabExists(tabId: string): boolean {
    return this.getTabById(tabId) !== null
  }

  /**
   * Build command with tab targeting
   * Uses --tab-id if available, falls back to --tab-index
   */
  static buildCommandWithTab(baseCommand: string, tabId: string): string {
    const tab = this.getTabById(tabId)
    if (!tab) {
      throw new Error(`Tab ${tabId} not found`)
    }

    // Prefer tab ID if command supports it
    if (baseCommand.includes('--tab-id') || baseCommand.includes('tabId')) {
      return `${baseCommand} --tab-id ${tabId}`
    }

    // Fall back to tab index
    return `${baseCommand} --tab-index ${tab.index}`
  }

  /**
   * Execute command targeting specific tab
   */
  static executeWithTab(
    baseCommand: string,
    tabId: string,
    timeout = 5000
  ): { output: string; exitCode: number } {
    const fullCommand = this.buildCommandWithTab(baseCommand, tabId)
    return this.runCommand(fullCommand, timeout)
  }

  /**
   * Clear created tabs set (for test isolation)
   */
  static clearTracking(): void {
    this.createdTabs.clear()
  }

  /**
   * Get current tab count
   */
  static getTabCount(): number {
    try {
      const tabs = this.getTabs()
      return tabs.length
    } catch {
      return 0
    }
  }

  /**
   * Periodic cleanup to enforce tab limits during test execution
   * Call this in afterAll() of test suites that create many tabs
   */
  static enforceTabLimit(): void {
    try {
      const currentCount = this.getTabCount()
      const MAX_TABS = 10

      if (currentCount > MAX_TABS) {
        console.log(`⚠️  Tab count (${currentCount}) exceeds limit (${MAX_TABS}), performing cleanup...`)
        this.cleanupTestTabs()
      }
    } catch (error) {
      console.warn('Failed to enforce tab limit:', error)
    }
  }

  /**
   * Clean up test tabs that may have accumulated from previous runs
   * Closes tabs with test-like URLs (data: URLs, localhost, etc.)
   */
  static cleanupTestTabs(): void {
    try {
      const tabs = this.getTabs()

      // Identify test tabs by URL patterns
      const testTabs = tabs.filter(tab =>
        tab.url.startsWith('data:text/html') ||
        tab.url.includes('localhost') ||
        tab.url.includes('127.0.0.1') ||
        tab.url.includes('example.com') ||
        tab.title.includes('Test Page') ||
        tab.title.includes('Test')
      )

      console.log(`Found ${testTabs.length} potential test tabs out of ${tabs.length} total tabs`)

      if (testTabs.length > 0) {
        for (const tab of testTabs) {
          try {
            const { exitCode } = this.runCommand(
              `${CLI} tabs close --tab-id ${tab.id} --port ${TEST_PORT}`,
              3000 // Short timeout for cleanup
            )
            if (exitCode === 0) {
              console.log(`Closed test tab: ${tab.title.substring(0, 30)}...`)
            }
          } catch (error) {
            // Continue cleanup even if individual tab close fails
            console.warn(`Failed to close test tab ${tab.id}:`, error)
          }
        }
      }

      // Enforce a reasonable tab limit (close oldest tabs if too many)
      const remainingTabs = this.getTabs()
      const MAX_TABS = 10 // Lower limit to prevent browser crashes

      if (remainingTabs.length > MAX_TABS) {
        const excessTabs = remainingTabs
          .filter(tab => !tab.url.includes('chrome://') && !tab.url.includes('about:'))
          .slice(0, remainingTabs.length - MAX_TABS)

        console.log(`Closing ${excessTabs.length} excess tabs to enforce limit of ${MAX_TABS}`)

        for (const tab of excessTabs) {
          try {
            this.runCommand(`${CLI} tabs close --tab-id ${tab.id} --port ${TEST_PORT}`, 2000)
          } catch (error) {
            console.warn(`Failed to close excess tab ${tab.id}:`, error)
          }
        }
      }
    } catch (error) {
      console.warn('Could not perform test tab cleanup:', error)
    }
  }
}
