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

export interface TabInfo {
  id: string
  index: number
  title: string
  url: string
}

export class TabManager {
  private static CLI = 'node dist/index.js'
  private static createdTabs: Set<string> = new Set()

  /**
   * Run command and check it doesn't hang
   */
  static runCommand(
    cmd: string,
    timeout = 5000
  ): { output: string; exitCode: number } {
    try {
      const output = execSync(cmd, {
        encoding: 'utf8',
        timeout,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
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
   * Create a new tab and return its ID for use in tests
   */
  static createTab(url?: string): string {
    const urlArg = url ? `--url ${url}` : ''
    const { output, exitCode } = this.runCommand(
      `${this.CLI} tabs new ${urlArg}`
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
    const { output, exitCode } = this.runCommand(`${this.CLI} tabs list`)

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

    const { output, exitCode } = this.runCommand(
      `${this.CLI} tabs close --index ${tab.index}`
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
}
