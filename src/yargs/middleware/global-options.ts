/**
 * Global Options Middleware for Yargs CLI
 * 
 * This module provides middleware functions that process global options
 * and set up the environment before command execution. It replaces the
 * minimist preprocessing from cli-helper.ts with Yargs-native middleware.
 */

import type { ArgumentsCamelCase } from 'yargs';
import chalk from 'chalk';
import { BrowserConfig } from '../../lib/browser-config';
import type { BaseCommandOptions } from '../types';

/**
 * Environment variables that can be set by global options
 */
interface EnvironmentConfig {
  PLAYWRIGHT_VERBOSE?: string;
  PLAYWRIGHT_QUIET?: string;
  PLAYWRIGHT_DEBUG?: string;
  PLAYWRIGHT_BROWSER?: string;
  PLAYWRIGHT_HEADLESS?: string;
  PLAYWRIGHT_DEVTOOLS?: string;
  PLAYWRIGHT_TIMEOUT?: string;
  PLAYWRIGHT_PORT?: string;
}

/**
 * Configuration that can be loaded from files or environment
 */
interface CLIConfiguration {
  defaultPort?: number;
  defaultBrowser?: string;
  defaultTimeout?: number;
  logging?: {
    level?: 'debug' | 'info' | 'warn' | 'error';
    colors?: boolean;
  };
  browser?: {
    headless?: boolean;
    devtools?: boolean;
    slowMo?: number;
  };
}

/**
 * Global state for middleware chain
 */
interface GlobalState {
  startTime: number;
  config: CLIConfiguration;
  environmentApplied: boolean;
  browserConfigLoaded: boolean;
}

// Global state instance
let globalState: GlobalState = {
  startTime: Date.now(),
  config: {},
  environmentApplied: false,
  browserConfigLoaded: false
};

/**
 * Initialize global state (called at CLI startup)
 */
export function initializeGlobalState(): void {
  globalState = {
    startTime: Date.now(),
    config: {},
    environmentApplied: false,
    browserConfigLoaded: false
  };
}

/**
 * Middleware to load configuration from environment variables
 * This runs first in the middleware chain
 */
export async function environmentConfigMiddleware<T extends BaseCommandOptions>(
  argv: ArgumentsCamelCase<T>
): Promise<void> {
  if (globalState.environmentApplied) return;

  const env = process.env;
  
  // Load environment variable overrides
  if (env.PLAYWRIGHT_PORT && !argv.port) {
    argv.port = parseInt(env.PLAYWRIGHT_PORT) || 9222;
  }
  
  if (env.PLAYWRIGHT_VERBOSE === 'true' && !argv.verbose) {
    argv.verbose = true;
  }
  
  if (env.PLAYWRIGHT_QUIET === 'true' && !argv.quiet) {
    argv.quiet = true;
  }
  
  if (env.PLAYWRIGHT_DEBUG === 'true') {
    argv.verbose = true;
    process.env.DEBUG = 'playwright:*';
  }

  // Update global config from environment
  globalState.config = {
    ...globalState.config,
    defaultPort: env.PLAYWRIGHT_PORT ? parseInt(env.PLAYWRIGHT_PORT) : 9222,
    defaultTimeout: env.PLAYWRIGHT_TIMEOUT ? parseInt(env.PLAYWRIGHT_TIMEOUT) : 30000,
    logging: {
      level: (env.PLAYWRIGHT_LOG_LEVEL as any) || 'info',
      colors: env.NO_COLOR !== '1' && env.FORCE_COLOR !== '0'
    },
    browser: {
      headless: env.PLAYWRIGHT_HEADLESS === 'true',
      devtools: env.PLAYWRIGHT_DEVTOOLS === 'true',
      slowMo: env.PLAYWRIGHT_SLOW_MO ? parseInt(env.PLAYWRIGHT_SLOW_MO) : undefined
    }
  };

  globalState.environmentApplied = true;
}

/**
 * Middleware to apply global options and configure environment
 * This runs after environment config but before command-specific middleware
 */
export async function globalOptionsMiddleware<T extends BaseCommandOptions>(
  argv: ArgumentsCamelCase<T>
): Promise<void> {
  // Apply color settings
  if (argv.color === false || process.env.NO_COLOR === '1') {
    chalk.level = 0;
  }

  // Handle conflicting verbose/quiet flags
  if (argv.quiet && argv.verbose) {
    console.error(chalk.yellow('Warning: Both --quiet and --verbose specified, using --verbose'));
    argv.quiet = false;
  }

  // Set environment variables for downstream tools
  const envConfig: EnvironmentConfig = {};

  if (argv.verbose) {
    envConfig.PLAYWRIGHT_VERBOSE = 'true';
  }
  
  if (argv.quiet) {
    envConfig.PLAYWRIGHT_QUIET = 'true';
  }

  if (argv.port) {
    envConfig.PLAYWRIGHT_PORT = argv.port.toString();
  }

  // Apply environment variables
  Object.entries(envConfig).forEach(([key, value]) => {
    if (value !== undefined) {
      process.env[key] = value;
    }
  });

  // Validate port if provided
  if (argv.port) {
    if (!Number.isInteger(argv.port) || argv.port < 1 || argv.port > 65535) {
      throw new Error(`Invalid port number: ${argv.port}. Must be between 1 and 65535.`);
    }
  }

  // Set default port if not provided
  if (!argv.port) {
    argv.port = globalState.config.defaultPort || 9222;
  }
}

/**
 * Middleware to load and apply browser configuration
 * This runs after global options middleware
 */
export async function browserConfigMiddleware<T extends BaseCommandOptions>(
  argv: ArgumentsCamelCase<T>
): Promise<void> {
  if (globalState.browserConfigLoaded) return;

  try {
    // Load saved browser preference
    const savedBrowser = await BrowserConfig.getLastUsedBrowser();
    
    // Apply browser config to global state
    globalState.config = {
      ...globalState.config,
      defaultBrowser: savedBrowser
    };

    // Save browser preference if a new one is specified
    // (This would be handled in command-specific middleware that deals with browser selection)
    
    globalState.browserConfigLoaded = true;
  } catch (error) {
    // Ignore browser config errors - they're not critical
    if (argv.verbose) {
      console.warn(chalk.yellow(`Warning: Could not load browser config: ${error}`));
    }
  }
}

/**
 * Middleware for request/response logging and timing
 * This runs last in the setup chain, first in the teardown chain
 */
export async function loggingMiddleware<T extends BaseCommandOptions>(
  argv: ArgumentsCamelCase<T>
): Promise<void> {
  // Log command start in debug mode
  if (argv.verbose) {
    const command = argv._.length > 0 ? argv._[0] : 'unknown';
    console.log(chalk.gray(`[DEBUG] Starting command: ${command}`));
    console.log(chalk.gray(`[DEBUG] Port: ${argv.port}`));
    console.log(chalk.gray(`[DEBUG] Started at: ${new Date().toISOString()}`));
  }

  // Set up process exit handler to log timing
  if (argv.verbose && !process.env.NODE_ENV?.includes('test')) {
    const originalExit = process.exit;
    process.exit = ((code?: number) => {
      const duration = Date.now() - globalState.startTime;
      console.log(chalk.gray(`[DEBUG] Command completed in ${duration}ms`));
      return originalExit.call(process, code);
    }) as typeof process.exit;
  }
}

/**
 * Middleware to handle shorthand selector transformations
 * This replaces the parseShorthand functionality from cli-helper
 */
export function selectorShorthandMiddleware<T extends BaseCommandOptions & { selector?: string }>(
  argv: ArgumentsCamelCase<T>
): void {
  if (!argv.selector) return;

  const selector = argv.selector;
  
  // Transform shorthand patterns to full selectors
  if (selector.includes(':') && !selector.startsWith('[') && !selector.includes('(')) {
    const [elementType, text] = selector.split(':', 2);
    
    switch (elementType.toLowerCase()) {
      case 'button':
        argv.selector = `button:has-text("${text}")`;
        break;
      case 'link':
        argv.selector = `a:has-text("${text}")`;
        break;
      case 'text':
        argv.selector = `:has-text("${text}")`;
        break;
      case 'input':
        argv.selector = `input[placeholder*="${text}" i], input[name*="${text}" i], input[id*="${text}" i]`;
        break;
      case 'label':
        argv.selector = `label:has-text("${text}")`;
        break;
      default:
        // Keep original selector if no pattern matches
        break;
    }
    
    // Log transformation in verbose mode
    if (argv.verbose && argv.selector !== selector) {
      console.log(chalk.gray(`[DEBUG] Transformed selector "${selector}" to "${argv.selector}"`));
    }
  }
}

/**
 * Middleware to validate required browser connection for browser-dependent commands
 */
export async function browserConnectionMiddleware<T extends BaseCommandOptions>(
  argv: ArgumentsCamelCase<T>
): Promise<void> {
  // This will be implemented to check if browser is accessible
  // For now, just ensure port is valid
  if (!argv.port) {
    throw new Error('Port is required for browser commands');
  }

  // In verbose mode, log connection details
  if (argv.verbose) {
    console.log(chalk.gray(`[DEBUG] Will connect to browser on port ${argv.port}`));
  }
}

/**
 * Middleware to handle configuration file loading
 * This runs early in the chain to load user preferences
 */
export async function configFileMiddleware<T extends BaseCommandOptions>(
  argv: ArgumentsCamelCase<T>
): Promise<void> {
  // Look for configuration files in standard locations
  const configPaths = [
    '.playwright-cli.json',
    '.playwright-cli.js',
    'playwright-cli.config.json',
    'playwright-cli.config.js'
  ];

  for (const configPath of configPaths) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const fullPath = path.resolve(process.cwd(), configPath);
      const configContent = await fs.readFile(fullPath, 'utf-8');
      
      let config: CLIConfiguration;
      if (configPath.endsWith('.json')) {
        config = JSON.parse(configContent);
      } else {
        // For .js files, we'd need to use dynamic import
        // For now, skip JS config files
        continue;
      }

      // Merge config into global state
      globalState.config = {
        ...globalState.config,
        ...config
      };

      // Apply config to argv if not already set
      if (config.defaultPort && !argv.port) {
        argv.port = config.defaultPort;
      }

      if (argv.verbose) {
        console.log(chalk.gray(`[DEBUG] Loaded config from ${configPath}`));
      }
      
      break; // Use first config file found
    } catch (error) {
      // Config file doesn't exist or is invalid - continue
      continue;
    }
  }
}

/**
 * Combine all middleware into a single middleware chain
 * This is the main export that should be used in the CLI
 */
export async function globalMiddlewareChain<T extends BaseCommandOptions>(
  argv: ArgumentsCamelCase<T>
): Promise<void> {
  // Run middleware in order
  await environmentConfigMiddleware(argv);
  await configFileMiddleware(argv);
  await globalOptionsMiddleware(argv);
  await browserConfigMiddleware(argv);
  await loggingMiddleware(argv);
  
  // Apply selector shorthand if this command has a selector
  if ('selector' in argv) {
    selectorShorthandMiddleware(argv as any);
  }
}

/**
 * Get the current global state (for debugging and testing)
 */
export function getGlobalState(): Readonly<GlobalState> {
  return { ...globalState };
}

/**
 * Reset global state (for testing)
 */
export function resetGlobalState(): void {
  initializeGlobalState();
}

/**
 * Export individual middleware functions for fine-grained control
 */
export const middleware = {
  environmentConfig: environmentConfigMiddleware,
  configFile: configFileMiddleware,
  globalOptions: globalOptionsMiddleware,
  browserConfig: browserConfigMiddleware,
  logging: loggingMiddleware,
  selectorShorthand: selectorShorthandMiddleware,
  browserConnection: browserConnectionMiddleware
};

/**
 * Utility function to create a middleware function that only runs for specific commands
 */
export function conditionalMiddleware<T extends BaseCommandOptions>(
  condition: (argv: ArgumentsCamelCase<T>) => boolean,
  middlewareFunction: (argv: ArgumentsCamelCase<T>) => Promise<void> | void
) {
  return async (argv: ArgumentsCamelCase<T>): Promise<void> => {
    if (condition(argv)) {
      await middlewareFunction(argv);
    }
  };
}

/**
 * Utility to check if a command requires browser connection
 */
export function requiresBrowser<T extends BaseCommandOptions>(argv: ArgumentsCamelCase<T>): boolean {
  const browserCommands = [
    'click', 'hover', 'type', 'fill', 'select', 'drag', 'press', 'upload',
    'screenshot', 'pdf', 'navigate', 'back', 'forward', 'open', 'close',
    'wait', 'eval', 'exec', 'console', 'network', 'dialog', 'list',
    'snapshot', 'resize'
  ];
  
  const command = argv._.length > 0 ? argv._[0] : '';
  return browserCommands.includes(command as string);
}