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

import { cli } from './yargs/cli';

// Fix for Bun compiled binaries: remove the extra argv entry
if (process.argv[0] === 'bun' && process.argv[2]?.includes('playwright')) {
  process.argv.splice(2, 1);
}

// Parse and execute the CLI
cli
  .parseAsync()
  .then(() => {
    // Ensure clean exit after successful command
    process.exit(0);
  })
  .catch((err) => {
    // Error already handled by yargs, just exit with error code
    process.exit(1);
  });