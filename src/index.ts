#!/usr/bin/env bun

/**
 * Playwright CLI - Browser automation command line interface
 *
 * A comprehensive CLI tool for Playwright browser automation using Chrome DevTools Protocol.
 * Provides commands for browser management, navigation, interaction, capture, and debugging.
 *
 * Features:
 * - Browser lifecycle management (open, close, tabs)
 * - Page navigation and interaction
 * - Element capture (screenshots, PDFs)
 * - JavaScript execution and debugging
 * - Accessibility tree analysis
 * - Session management and persistence
 *
 * @author Playwright CLI Team
 * @version 1.0.0
 */

import { cli } from './yargs/cli'
import { CDPConnectionPool } from './lib/cdp-connection-pool'

// Fix for Bun compiled binaries: remove the extra argv entry
if (process.argv[0] === 'bun' && process.argv[2]?.includes('pw')) {
  process.argv.splice(2, 1)
}

// Parse and execute the CLI
cli
  .parseAsync()
  .then(async () => {
    if (process.env.DEBUG_EXIT) {
      console.error('[DEBUG] Command completed, starting shutdown...')
    }

    // Shutdown the connection pool to allow process to exit
    // The pool keeps connections alive which prevents natural exit
    const pool = CDPConnectionPool.getInstance()

    // Set a timeout to force exit if shutdown takes too long
    // Playwright CDP connections don't always close cleanly
    const forceExitTimer = setTimeout(() => {
      if (process.env.DEBUG_EXIT) {
        console.error('[DEBUG] Shutdown timeout, forcing immediate exit...')
      }
      process.exit(0)
    }, 3000) // 3 second max wait (shutdown has 2s internal timeout)

    // Unref the timer so it doesn't keep the process alive
    forceExitTimer.unref()

    await pool.shutdown().catch(() => {
      // Ignore shutdown errors, we're exiting anyway
    })

    if (process.env.DEBUG_EXIT) {
      console.error('[DEBUG] Shutdown complete, exiting...')
    }

    // Clear the force-exit timeout since shutdown completed successfully
    clearTimeout(forceExitTimer)

    // Give a small moment for I/O to flush, then exit
    // 50ms should be enough for console output to flush
    setTimeout(() => {
      process.exit(0)
    }, 50).unref()
  })
  .catch(async err => {
    // Ensure error message is output for test capture
    if (err?.message) {
      console.error(err.message)
    }

    if (process.env.DEBUG_EXIT) {
      console.error('[DEBUG] Error occurred, shutting down...')
    }

    // Set timeout for error case too
    const forceExitTimer = setTimeout(() => {
      process.exit(1)
    }, 3000)

    // Unref the timer so it doesn't keep the process alive
    forceExitTimer.unref()

    // Shutdown pool on error too
    const pool = CDPConnectionPool.getInstance()
    await pool.shutdown().catch(() => {})

    if (process.env.DEBUG_EXIT) {
      console.error('[DEBUG] Shutdown complete, exiting with error...')
    }

    clearTimeout(forceExitTimer)

    // Exit with error code after cleanup, with small delay for I/O flush
    // 50ms should be enough for console output to flush
    setTimeout(() => {
      process.exit(1)
    }, 50).unref()
  })
