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

import { program } from 'commander';
import minimist from 'minimist';

import { backCommand } from './commands/back';
import { clickCommand } from './commands/click';
import { closeCommand } from './commands/close';
import { codegenCommand } from './commands/codegen';
import { consoleCommand } from './commands/console';
import { dialogCommand } from './commands/dialog';
import { dragCommand } from './commands/drag';
import { evalCommand } from './commands/eval';
import { fillCommand } from './commands/fill';
import { listCommand } from './commands/list';
import { navigateCommand } from './commands/navigate';
import {
  parseGlobalOptions,
  parseShorthand,
  checkTypos
} from './lib/cli-helper';

// Fix for Bun compiled binaries: remove the extra argv entry
if (process.argv[0] === 'bun' && process.argv[2]?.includes('playwright')) {
  process.argv.splice(2, 1);
}
import chalk from 'chalk';

import { setupDefaultServices } from './lib/di-container';
import { logger } from './lib/logger';

// Browser management
import { openCommand } from './commands/open';
import { tabsCommand } from './commands/tabs';
import { resizeCommand } from './commands/resize';

// Navigation

// Interaction
import { typeCommand } from './commands/type';
import { pressCommand } from './commands/press';
import { selectCommand } from './commands/select';
import { hoverCommand } from './commands/hover';
import { uploadCommand } from './commands/upload';
import { waitCommand } from './commands/wait';

// Capture & Analysis
import { screenshotCommand } from './commands/screenshot';
import { pdfCommand } from './commands/pdf';
import { snapshotCommand } from './commands/snapshot';

// Debugging
import { execCommand } from './commands/exec';
import { networkCommand } from './commands/network';

// Playwright native
import { installCommand } from './commands/install';
import { testCommand } from './commands/test';

// Documentation
import { claudeCommand } from './commands/claude';

// Performance monitoring
import { perfCommand } from './commands/perf';

// Initialize dependency injection container
setupDefaultServices();

program
  .name('playwright')
  .description('CLI for Playwright browser automation')
  .version('1.0.0');

// Browser management
program.addCommand(openCommand);
program.addCommand(closeCommand);
program.addCommand(listCommand);
program.addCommand(tabsCommand);
program.addCommand(resizeCommand);

// Navigation
program.addCommand(navigateCommand);
program.addCommand(backCommand);

// Interaction
program.addCommand(clickCommand);
program.addCommand(typeCommand);
program.addCommand(pressCommand);
program.addCommand(fillCommand);
program.addCommand(selectCommand);
program.addCommand(hoverCommand);
program.addCommand(dragCommand);
program.addCommand(uploadCommand);
program.addCommand(waitCommand);

// Capture & Analysis
program.addCommand(screenshotCommand);
program.addCommand(pdfCommand);
program.addCommand(snapshotCommand);

// Debugging
program.addCommand(evalCommand);
program.addCommand(execCommand);
program.addCommand(consoleCommand);
program.addCommand(networkCommand);
program.addCommand(dialogCommand);

// Playwright native
program.addCommand(installCommand);
program.addCommand(codegenCommand);
program.addCommand(testCommand);

// Documentation
program.addCommand(claudeCommand);

// Performance monitoring
program.addCommand(perfCommand);

// Parse arguments and handle exit
program
  .parseAsync(process.argv)
  .then(() => {
    // Exit cleanly after command completes
    process.exit(0);
  })
  .catch(error => {
    logger.commandError('Error', error);
    process.exit(1);
  });

// Preprocess with minimist for better flexibility
const rawArgs = process.argv.slice(2);

// Show help if no command was provided
if (!rawArgs.length) {
  program.outputHelp();
  process.exit(0);
}

// Parse global options and apply shorthand transformations
const { options: globalOpts, remainingArgs } = parseGlobalOptions(rawArgs);

// Handle global help/version
if (globalOpts.help) {
  program.outputHelp();
  process.exit(0);
}
if (globalOpts.version) {
  logger.info(program.version() || '1.0.0');
  process.exit(0);
}

// Check for typos in command
if (remainingArgs.length > 0) {
  const command = remainingArgs[0];
  const suggestion = checkTypos(command);
  if (suggestion && !program.commands.find(cmd => cmd.name() === command)) {
    logger.warn(`Did you mean '${suggestion}'?`);
  }
}

// Apply shorthand notation
const processedArgs = parseShorthand(remainingArgs);

// Reconstruct argv with processed arguments
if (processedArgs.length > 0) {
  process.argv = [
    process.argv[0]!,
    process.argv[1]!,
    ...processedArgs,
    // Add back global options as flags
    ...(globalOpts.port ? ['-p', String(globalOpts.port)] : []),
    ...(globalOpts.browser ? ['-b', globalOpts.browser] : []),
    ...(globalOpts.headless ? ['--headless'] : []),
    ...(globalOpts.devtools ? ['--devtools'] : [])
  ];
}
