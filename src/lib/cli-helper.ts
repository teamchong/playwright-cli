import minimist from 'minimist';

import { BrowserConfig } from './browser-config';

/**
 * Configuration interface for global CLI options.
 * These options can be used across all commands.
 */
interface GlobalOptions {
  /** Chrome debugging port number */
  port?: number;
  /** Browser type or path to use */
  browser?: string;
  /** Run in headless mode */
  headless?: boolean;
  /** Enable developer tools */
  devtools?: boolean;
  /** Show help information */
  help?: boolean;
  /** Show version information */
  version?: boolean;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Suppress output */
  quiet?: boolean;
}

/**
 * Parses global CLI options using minimist for flexible argument handling.
 * Allows options to be placed anywhere in the command line.
 * Supports both long and short forms of common flags.
 *
 * @param argv - Array of command line arguments to parse
 * @returns Object containing parsed options and remaining non-option arguments
 *
 * @example
 * ```typescript
 * const { options, remainingArgs } = parseGlobalOptions([
 *   'click', '--port', '9223', '-b', 'chrome', 'button'
 * ]);
 * // options: { port: 9223, browser: 'chrome' }
 * // remainingArgs: ['click', 'button']
 * ```
 */
export function parseGlobalOptions(argv: string[]): {
  options: GlobalOptions;
  remainingArgs: string[];
} {
  // Define aliases for common flags
  const opts = minimist(argv, {
    string: ['browser', 'b', 'port', 'p'],
    boolean: ['headless', 'devtools', 'help', 'h', 'version', 'v', 'verbose', 'quiet'],
    alias: {
      b: 'browser',
      p: 'port',
      h: 'help',
      v: 'version'
    },
    default: {
      port: 9222
    },
    // Stop parsing at first non-option
    stopEarly: false,
    // Unknown options are kept in _
    unknown: () => true
  });

  const options: GlobalOptions = {
    port: opts.port ? parseInt(opts.port) : undefined,
    browser: opts.browser,
    headless: opts.headless,
    devtools: opts.devtools,
    help: opts.help,
    version: opts.version,
    verbose: opts.verbose,
    quiet: opts.quiet
  };

  // Remaining args are non-flag arguments and unknown flags
  const remainingArgs = opts._;

  return { options, remainingArgs };
}

/**
 * Applies parsed global options to the runtime environment.
 * Sets environment variables, saves browser preferences, and returns processed options.
 *
 * @param options - The global options object from parseGlobalOptions
 * @returns Processed options with defaults applied
 *
 * @example
 * ```typescript
 * const globalOpts = { browser: 'brave', verbose: true };
 * const processed = await applyGlobalOptions(globalOpts);
 * // processed: { port: 9222, browser: 'brave', headless: false, devtools: false }
 * // Environment: PLAYWRIGHT_VERBOSE='true'
 * ```
 */
export async function applyGlobalOptions(options: GlobalOptions) {
  // Save browser preference if specified
  if (options.browser && options.browser !== 'default') {
    await BrowserConfig.saveLastUsedBrowser(options.browser);
  }

  // Set verbosity
  if (options.quiet) {
    process.env.PLAYWRIGHT_QUIET = 'true';
  }
  if (options.verbose) {
    process.env.PLAYWRIGHT_VERBOSE = 'true';
  }

  // Return processed options for commands to use
  return {
    port: options.port || 9222,
    browser: options.browser || await BrowserConfig.getLastUsedBrowser(),
    headless: options.headless || false,
    devtools: options.devtools || false
  };
}

/**
 * Transforms shorthand notation into full selector syntax.
 * Converts natural language patterns to Playwright-compatible selectors.
 * Makes commands more intuitive by supporting patterns like "button:Login".
 *
 * @param args - Array of command arguments to process
 * @returns Array with shorthand patterns expanded to full selectors
 *
 * @example
 * ```typescript
 * parseShorthand(['click', 'button:Login']);
 * // Returns: ['click', 'button:has-text("Login")']
 *
 * parseShorthand(['click', 'link:Home']);
 * // Returns: ['click', 'a:has-text("Home")']
 *
 * parseShorthand(['click', 'text:Submit']);
 * // Returns: ['click', ':has-text("Submit")']
 * ```
 */
export function parseShorthand(args: string[]): string[] {
  const [command, ...rest] = args;

  // Handle special shorthand patterns
  if (command === 'click' && rest.length === 1) {
    const target = rest[0];

    // Convert button:Login to button:has-text("Login")
    if (target.startsWith('button:') && !target.includes('has-text')) {
      const text = target.substring(7);
      return [command, `button:has-text("${text}")`];
    }

    // Convert link:Home to a:has-text("Home")
    if (target.startsWith('link:') && !target.includes('has-text')) {
      const text = target.substring(5);
      return [command, `a:has-text("${text}")`];
    }

    // Convert text:Submit to :has-text("Submit")
    if (target.startsWith('text:') && !target.includes('has-text')) {
      const text = target.substring(5);
      return [command, `:has-text("${text}")`];
    }
  }

  return args;
}

/**
 * Detects common typos in command names and suggests corrections.
 * Uses Levenshtein distance to find commands that are 1 character different.
 * Helps improve user experience by catching simple spelling mistakes.
 *
 * @param command - The potentially misspelled command name
 * @returns The suggested correct command name or null if no match found
 *
 * @example
 * ```typescript
 * checkTypos('clik');     // Returns: 'click'
 * checkTypos('naviage');  // Returns: 'navigate'
 * checkTypos('xyz123');   // Returns: null
 * ```
 */
export function checkTypos(command: string): string | null {
  const commands = [
    'open', 'close', 'list', 'tabs', 'resize',
    'navigate', 'goto', 'back',
    'click', 'type', 'press', 'fill', 'select', 'hover', 'drag', 'upload', 'wait',
    'screenshot', 'capture', 'pdf', 'snapshot',
    'eval', 'execute', 'exec', 'console', 'network', 'dialog',
    'install', 'codegen', 'test'
  ];

  // Simple typo detection (1 character difference)
  for (const cmd of commands) {
    if (levenshteinDistance(command, cmd) === 1) {
      return cmd;
    }
  }

  return null;
}

function levenshteinDistance(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[len1][len2];
}
