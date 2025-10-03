#!/usr/bin/env node
/**
 * Claude Code Hook for Playwright Integration
 *
 * This hook provides two main functions:
 * 1. Validates Playwright commands BEFORE execution to prevent context waste
 * 2. Intercepts Write operations to /dev/playwright/* and executes them as Playwright commands
 *
 * Usage in Claude Code:
 * 1. Add this script to your PreToolUse hook configuration
 * 2. It will validate commands and provide helpful error messages
 * 3. Write JavaScript code to /dev/playwright/script.js for complex automation
 */

import chalk from 'chalk'

import { BrowserHelper } from './lib/browser-helper'
import { logger } from './lib/logger'

interface HookInput {
  tool: string
  params: any
}

// Track browser connection state
let browserConnected: boolean | null = null

async function isBrowserConnected(port: number = 9222): Promise<boolean> {
  if (browserConnected !== null) return browserConnected

  try {
    const net = require('net')
    const result = await new Promise<boolean>(resolve => {
      const socket = net.createConnection(port, 'localhost')
      socket.on('connect', () => {
        socket.end()
        resolve(true)
      })
      socket.on('error', () => {
        resolve(false)
      })
      socket.setTimeout(500)
      socket.on('timeout', () => {
        socket.destroy()
        resolve(false)
      })
    })
    browserConnected = result
    return result
  } catch {
    browserConnected = false
    return false
  }
}

// Validate Bash commands before execution
function validateBashCommand(command: string): {
  valid: boolean
  message?: string
} {
  // Check if it's a playwright command
  if (!command.includes('pw')) {
    return { valid: true }
  }

  // Commands that need browser connection
  const needsBrowser = [
    'click',
    'type',
    'press',
    'fill',
    'select',
    'hover',
    'drag',
    'upload',
    'screenshot',
    'pdf',
    'snapshot',
    'eval',
    'console',
    'network',
    'dialog',
    'wait',
    'navigate',
    'back',
    'tabs',
    'resize',
  ]

  // Commands that don't need browser
  const noBrowserNeeded = [
    'open',
    'install',
    'codegen',
    'test',
    'claude',
    'list',
    'close',
    'help',
    '--version',
    '-v',
    '--help',
    '-h',
  ]

  // Extract the playwright subcommand
  const match = command.match(/playwright\s+(\S+)/)
  if (!match) return { valid: true } // Can't determine, allow it

  const subcommand = match[1]

  // Check if browser is needed
  if (needsBrowser.includes(subcommand)) {
    return {
      valid: true, // We'll check async later
      message: 'needs-browser-check',
    }
  }

  return { valid: true }
}

async function executePlaywrightCode(code: string) {
  try {
    const page = await BrowserHelper.getActivePage()
    if (!page) {
      return {
        error: 'No Playwright session. Run "pw open" first',
      }
    }

    // Parse the code to determine the type of operation
    if (code.includes('page.goto') || code.includes('navigate')) {
      // Navigation
      const urlMatch = code.match(/["']([^"']+)["']/)
      if (urlMatch) {
        await page.goto(urlMatch[1])
        return { success: true, action: 'navigate', url: urlMatch[1] }
      }
    }

    // Default: evaluate as JavaScript
    const result = await page.evaluate(code)
    return { success: true, result }
  } catch (error: any) {
    return { error: error.message }
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf-8')
}

async function main() {
  const input = await readStdin()
  const hookData: HookInput = JSON.parse(input)

  // Handle Bash commands - validate before execution
  if (hookData.tool === 'Bash' && hookData.params?.command) {
    const command = hookData.params.command
    const validation = validateBashCommand(command)

    if (validation.message === 'needs-browser-check') {
      // Async check if browser is connected
      const connected = await isBrowserConnected()
      if (!connected) {
        logger.error('No browser session active')
        logger.info('💡 Run "pw open" first to start a browser session')
        process.exit(1) // Block execution
      }
    } else if (!validation.valid) {
      logger.error(validation.message || 'Command validation failed')
      process.exit(1) // Block execution
    }

    // Command is valid, allow it
    process.exit(0)
  }

  // Check if this is a Write operation to /dev/playwright
  if (
    hookData.tool === 'Write' &&
    hookData.params?.file_path?.startsWith('/dev/playwright')
  ) {
    const code = hookData.params.content

    logger.info('🎭 Playwright Hook: Intercepting code execution')

    const result = await executePlaywrightCode(code)

    if (result.error) {
      logger.error(result.error)
      // Block the write operation
      process.exit(1)
    } else {
      logger.success('Code executed in Playwright session')
      if (result.result !== undefined) {
        logger.info(`Result: ${result.result}`)
      }
      // Block the actual file write but indicate success
      logger.warn('⚠️  Blocking file write to /dev/playwright (virtual path)')
      process.exit(1) // Exit with error to prevent actual write
    }
  }

  // Not a playwright operation, allow it
  process.exit(0)
}

main().catch(error => logger.error(`Hook error: ${error.message}`))
