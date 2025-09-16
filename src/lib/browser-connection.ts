import chalk from 'chalk'

export interface BrowserPage {
  id: string
  url: string
  title: string
  webSocketDebuggerUrl: string
}

export class BrowserConnection {
  static async checkConnection(port: number = 9222): Promise<boolean> {
    const { spawnSync } = require('child_process')

    const result = spawnSync(
      'curl',
      [
        '-s',
        '-o',
        '/dev/null',
        '-w',
        '%{http_code}',
        `http://localhost:${port}/json/version`,
      ],
      {
        timeout: 3000,
        encoding: 'utf8',
      }
    )

    return result.stdout && result.stdout.trim() === '200'
  }

  static async getPages(port: number = 9222): Promise<BrowserPage[]> {
    const { spawnSync } = require('child_process')

    const result = spawnSync('curl', ['-s', `http://localhost:${port}/json`], {
      timeout: 3000,
      encoding: 'utf8',
    })

    if (!result.stdout) {
      throw new Error('No browser running on port ' + port)
    }

    try {
      return JSON.parse(result.stdout)
    } catch {
      throw new Error('Failed to get page list')
    }
  }

  static async getActivePage(port: number = 9222): Promise<BrowserPage | null> {
    const pages = await this.getPages(port)

    // Find the first non-chrome page (actual web page)
    const activePage = pages.find(
      (p: any) =>
        p.type === 'page' &&
        !p.url.startsWith('chrome://') &&
        !p.url.startsWith('about:')
    )

    return activePage || null
  }

  static async executeInPage(
    pageId: string,
    code: string,
    port: number = 9222
  ): Promise<any> {
    // Chrome DevTools Protocol requires WebSocket for Runtime.evaluate
    // But we CAN use the existing Playwright connection if available
    // For now, we'll need to establish a WebSocket connection

    // Alternative: Use chrome.debugger API or extension
    throw new Error(
      'Direct execution requires WebSocket connection. Use "playwright open" with Playwright mode.'
    )
  }
}
