/**
 * Action History Tracker
 *
 * Tracks user actions across commands for the context command to display.
 * Persists history to a temp file to maintain state between command runs.
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

interface Action {
  type: 'navigate' | 'click' | 'type' | 'fill' | 'select' | 'hover' | 'drag'
  target?: string
  value?: string
  timestamp: Date
  tabId?: string
}

class ActionHistory {
  private static instance: ActionHistory
  private actions: Action[] = []
  private maxActions = 10
  private historyFile: string

  private constructor() {
    this.historyFile = path.join(os.tmpdir(), 'playwright-cli-actions.json')
    this.loadActions()
  }

  static getInstance(): ActionHistory {
    if (!ActionHistory.instance) {
      ActionHistory.instance = new ActionHistory()
    }
    return ActionHistory.instance
  }

  private loadActions(): void {
    try {
      if (fs.existsSync(this.historyFile)) {
        const data = fs.readFileSync(this.historyFile, 'utf8')
        const parsed = JSON.parse(data)

        // Convert timestamp strings back to Date objects and filter recent actions
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
        this.actions = parsed
          .map((action: any) => ({
            ...action,
            timestamp: new Date(action.timestamp),
          }))
          .filter((action: Action) => action.timestamp > cutoff)
          .slice(-this.maxActions)
      }
    } catch (error) {
      // If loading fails, start fresh
      this.actions = []
    }
  }

  private saveActions(): void {
    try {
      fs.writeFileSync(this.historyFile, JSON.stringify(this.actions), 'utf8')
    } catch (error) {
      // Ignore save errors to prevent breaking commands
    }
  }

  addAction(action: Omit<Action, 'timestamp'>): void {
    this.actions.push({
      ...action,
      timestamp: new Date(),
    })

    // Keep only the most recent actions
    if (this.actions.length > this.maxActions) {
      this.actions = this.actions.slice(-this.maxActions)
    }

    // Persist to file
    this.saveActions()
  }

  getRecentActions(count = 5, tabId?: string): Action[] {
    let filtered = this.actions

    if (tabId) {
      filtered = this.actions.filter(a => a.tabId === tabId)
    }

    return filtered.slice(-count)
  }

  getLastAction(tabId?: string): Action | undefined {
    const actions = tabId
      ? this.actions.filter(a => a.tabId === tabId)
      : this.actions

    return actions[actions.length - 1]
  }

  clear(): void {
    this.actions = []
    this.saveActions()
  }

  // Method for tests to clear history via CLI
  static clearForTests(): void {
    const instance = ActionHistory.getInstance()
    instance.clear()
  }

  formatAction(action: Action): string {
    const timeAgo = this.getTimeAgo(action.timestamp)

    switch (action.type) {
      case 'navigate':
        return `Navigated to ${action.target} (${timeAgo})`
      case 'click':
        return `Clicked ${action.target} (${timeAgo})`
      case 'type':
        return `Typed into ${action.target} (${timeAgo})`
      case 'fill':
        return `Filled ${action.target}${action.value ? ` with "${action.value}"` : ''} (${timeAgo})`
      case 'select':
        return `Selected ${action.value} in ${action.target} (${timeAgo})`
      case 'hover':
        return `Hovered over ${action.target} (${timeAgo})`
      case 'drag':
        return `Dragged ${action.target} (${timeAgo})`
      default:
        return `${action.type} ${action.target || ''} (${timeAgo})`
    }
  }

  private getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)

    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }
}

export const actionHistory = ActionHistory.getInstance()
