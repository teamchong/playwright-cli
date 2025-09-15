/**
 * Shared TypeScript Types for Yargs CLI
 * 
 * This file contains all shared interfaces and types used across
 * the Yargs implementation to ensure type safety and consistency.
 */

import type { ArgumentsCamelCase, CommandModule } from 'yargs';
import type { Page } from 'playwright';

/**
 * Base options that all commands inherit
 */
export interface BaseCommandOptions {
  port: number;
  verbose?: boolean;
  quiet?: boolean;
  json?: boolean;
  color?: boolean; // Updated to match our CLI configuration
}

/**
 * Common browser interaction options
 */
export interface BrowserOptions extends BaseCommandOptions {
  timeout?: number;
  force?: boolean;
}

/**
 * Selector-based command options
 */
export interface SelectorOptions extends BrowserOptions {
  selector: string;
}

/**
 * Keyboard modifier options
 */
export interface ModifierOptions {
  shift?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  meta?: boolean;
  'ctrl-or-meta'?: boolean;
}

/**
 * Click command specific options
 */
export interface ClickOptions extends SelectorOptions, ModifierOptions {
  double?: boolean;
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  delay?: number;
}

/**
 * Type command specific options
 */
export interface TypeOptions extends SelectorOptions {
  text: string;
  delay?: number;
  clear?: boolean;
}

/**
 * Navigation command options
 */
export interface NavigateOptions extends BaseCommandOptions {
  url: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  timeout?: number;
  referer?: string;
}

/**
 * Screenshot command options
 */
export interface ScreenshotOptions extends BaseCommandOptions {
  path?: string;
  fullPage?: boolean;
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  quality?: number;
  type?: 'png' | 'jpeg';
  omitBackground?: boolean;
}

/**
 * Window resize options
 */
export interface ResizeOptions extends BaseCommandOptions {
  width: number;
  height: number;
}

/**
 * Evaluate command options
 */
export interface EvalOptions extends BaseCommandOptions {
  expression: string;
  arg?: any;
}

/**
 * Session management options
 */
export interface SessionOptions extends BaseCommandOptions {
  action: 'save' | 'load' | 'list' | 'delete';
  name?: string;
}

/**
 * Tab management options
 */
export interface TabOptions extends BaseCommandOptions {
  action: 'list' | 'new' | 'close' | 'select';
  index?: number;
  url?: string;
}

/**
 * Command handler result
 */
export interface CommandResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Command execution context
 */
export interface CommandContext {
  page?: Page;
  startTime: number;
  options: BaseCommandOptions;
}

/**
 * Helper type for creating Yargs commands with proper typing
 */
export type PlaywrightCommand<T extends BaseCommandOptions> = CommandModule<{}, T>;

/**
 * Helper type for command handlers
 */
export type CommandHandler<T extends BaseCommandOptions> = (
  argv: ArgumentsCamelCase<T>
) => Promise<void> | void;

/**
 * Command metadata for registration
 */
export interface CommandMetadata {
  name: string;
  category: 'navigation' | 'interaction' | 'capture' | 'advanced' | 'utility';
  description: string;
  aliases?: string[];
}

/**
 * Test helper options
 */
export interface TestParseOptions {
  exitProcess?: boolean;
  strict?: boolean;
  help?: boolean;
  version?: boolean;
}

/**
 * Logger interface for consistent output
 */
export interface Logger {
  info(message: string): void;
  success(message: string): void;
  error(message: string): void;
  warn(message: string): void;
  debug(message: string): void;
  json(data: any): void;
}

/**
 * Browser connection state
 */
export interface BrowserState {
  connected: boolean;
  port: number;
  pid?: number;
  contexts: number;
  pages: number;
}

/**
 * Element reference for accessibility tree navigation
 */
export interface ElementRef {
  ref: string;
  role: string;
  name?: string;
  selector?: string;
}

/**
 * Network request tracking
 */
export interface NetworkRequest {
  url: string;
  method: string;
  status?: number;
  type?: string;
  size?: number;
  duration?: number;
}

/**
 * Console message tracking
 */
export interface ConsoleMessage {
  type: 'log' | 'debug' | 'info' | 'error' | 'warning';
  text: string;
  timestamp: number;
  location?: string;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  timestamp: number;
  metrics: {
    Timestamp?: number;
    Documents?: number;
    Frames?: number;
    JSEventListeners?: number;
    Nodes?: number;
    LayoutCount?: number;
    RecalcStyleCount?: number;
    LayoutDuration?: number;
    RecalcStyleDuration?: number;
    ScriptDuration?: number;
    TaskDuration?: number;
    JSHeapUsedSize?: number;
    JSHeapTotalSize?: number;
  };
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  expected?: any;
  received?: any;
}

// ==============================================
// COMMAND-SPECIFIC TYPE DEFINITIONS
// ==============================================

/**
 * Fill command options - for filling form fields
 */
export interface FillOptions extends BaseCommandOptions {
  fields: string[]; // Array of "selector=value" pairs
}

/**
 * Drag command options
 */
export interface DragOptions extends SelectorOptions {
  target: string; // Target selector for drag destination
  delay?: number;
}

/**
 * Upload command options
 */
export interface UploadOptions extends SelectorOptions {
  files: string[]; // Array of file paths to upload
}

/**
 * Select command options  
 */
export interface SelectOptions extends SelectorOptions {
  values: string[]; // Values to select
  multiple?: boolean;
}

/**
 * Press command options - for keyboard interactions
 */
export interface PressOptions extends BaseCommandOptions {
  key: string; // Key to press (e.g., 'Enter', 'Escape')
  delay?: number;
  modifiers?: string[];
}

/**
 * PDF command options
 */
export interface PDFOptions extends BaseCommandOptions {
  path?: string;
  format?: 'A4' | 'A3' | 'A2' | 'A1' | 'A0' | 'Letter' | 'Legal' | 'Tabloid' | 'Ledger';
  landscape?: boolean;
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
  printBackground?: boolean;
  scale?: number;
  pageRanges?: string;
  width?: string;
  height?: string;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}

/**
 * Wait command options
 */
export interface WaitOptions extends BaseCommandOptions {
  selector?: string;
  timeout?: number;
  state?: 'attached' | 'detached' | 'visible' | 'hidden';
  waitFor?: 'load' | 'domcontentloaded' | 'networkidle';
}

/**
 * Dialog command options
 */
export interface DialogOptions extends BaseCommandOptions {
  action: 'accept' | 'dismiss';
  text?: string; // For prompt dialogs
}

/**
 * Console command options - for monitoring console messages
 */
export interface ConsoleOptions extends BaseCommandOptions {
  filter?: 'error' | 'warn' | 'info' | 'debug' | 'all';
  follow?: boolean; // Follow mode like tail -f
}

/**
 * Network command options - for monitoring network requests
 */
export interface NetworkOptions extends BaseCommandOptions {
  filter?: string; // URL pattern filter
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  status?: number; // Filter by status code
  follow?: boolean; // Follow mode
}

/**
 * Performance monitoring options
 */
export interface PerfOptions extends BaseCommandOptions {
  duration?: number; // How long to monitor (seconds)
  interval?: number; // Sample interval (milliseconds)
  format?: 'json' | 'csv' | 'table';
}

/**
 * Codegen command options
 */
export interface CodegenOptions extends BaseCommandOptions {
  url?: string; // Starting URL
  output?: string; // Output file path
  language?: 'javascript' | 'typescript' | 'python' | 'java' | 'csharp';
  device?: string; // Device to emulate
}

/**
 * Test command options
 */
export interface TestOptions extends BaseCommandOptions {
  spec?: string; // Test file pattern
  headed?: boolean; // Run in headed mode
  debug?: boolean; // Debug mode
  project?: string; // Project name
  grep?: string; // Test name pattern
  reporter?: string; // Test reporter
}

/**
 * Install command options
 */
export interface InstallOptions extends BaseCommandOptions {
  browser?: 'chromium' | 'firefox' | 'webkit' | 'all';
  force?: boolean; // Force reinstall
  deps?: boolean; // Install system dependencies
}

/**
 * Back/Forward command options
 */
export interface NavigationHistoryOptions extends BaseCommandOptions {
  // Navigation commands don't need additional options beyond base
}

/**
 * Close command options
 */
export interface CloseOptions extends BaseCommandOptions {
  all?: boolean; // Close all tabs/windows
  saveSession?: string; // Save session before closing
}

/**
 * Open command options
 */
export interface OpenOptions extends BaseCommandOptions {
  newTab?: boolean; // Open in new tab
  newWindow?: boolean; // Open in new window
  device?: string; // Device emulation
  geolocation?: string; // Geolocation override
  timezone?: string; // Timezone override
}

/**
 * Snapshot command options - for accessibility tree snapshots
 */
export interface SnapshotOptions extends BaseCommandOptions {
  format?: 'json' | 'yaml' | 'tree';
  root?: string; // Root selector
  includeUnamed?: boolean; // Include unnamed elements
  interestingOnly?: boolean; // Only interesting elements
}

/**
 * List command options - for listing pages/contexts
 */
export interface ListOptions extends BaseCommandOptions {
  format?: 'json' | 'table' | 'simple';
  verbose?: boolean; // Override base verbose for more details
}

/**
 * Execute JavaScript options
 */
export interface ExecuteOptions extends BaseCommandOptions {
  expression?: string; // JavaScript expression
  file?: string; // JavaScript file path
  arg?: any; // Argument to pass to function
  waitForFunction?: boolean; // Wait for function result
  polling?: number; // Polling interval for waitForFunction
  timeout?: number; // Function execution timeout
}

/**
 * Claude helper command options
 */
export interface ClaudeOptions extends BaseCommandOptions {
  action: 'describe' | 'interact' | 'extract' | 'navigate';
  instruction: string; // Natural language instruction
  screenshot?: boolean; // Include screenshot in context
  format?: 'text' | 'json' | 'markdown';
}

// ==============================================
// UTILITY TYPES FOR COMMAND CATEGORIES
// ==============================================

/**
 * Navigation command types union
 */
export type NavigationCommandOptions = 
  | NavigateOptions
  | NavigationHistoryOptions
  | OpenOptions
  | CloseOptions
  | TabOptions
  | WaitOptions;

/**
 * Interaction command types union
 */
export type InteractionCommandOptions =
  | ClickOptions
  | TypeOptions
  | FillOptions
  | SelectOptions
  | DragOptions
  | PressOptions
  | UploadOptions;

/**
 * Capture command types union
 */
export type CaptureCommandOptions =
  | ScreenshotOptions
  | PDFOptions
  | SnapshotOptions
  | ListOptions
  | ResizeOptions;

/**
 * Advanced command types union
 */
export type AdvancedCommandOptions =
  | EvalOptions
  | ExecuteOptions
  | ConsoleOptions
  | NetworkOptions
  | DialogOptions
  | PerfOptions;

/**
 * Utility command types union
 */
export type UtilityCommandOptions =
  | CodegenOptions
  | TestOptions
  | SessionOptions
  | InstallOptions
  | ClaudeOptions;

/**
 * All command options union type
 */
export type AnyCommandOptions =
  | NavigationCommandOptions
  | InteractionCommandOptions
  | CaptureCommandOptions
  | AdvancedCommandOptions
  | UtilityCommandOptions;

// ==============================================
// BROWSER STATE AND DATA STRUCTURES
// ==============================================

/**
 * Enhanced browser state with more details
 */
export interface DetailedBrowserState extends BrowserState {
  version?: string;
  userAgent?: string;
  deviceScaleFactor?: number;
  viewport?: {
    width: number;
    height: number;
  };
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  permissions?: string[];
  cookies?: any[];
}

/**
 * Session data structure
 */
export interface SessionData {
  name: string;
  description?: string;
  created: string; // ISO date string
  url: string;
  cookies: any[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  viewport: {
    width: number;
    height: number;
  };
  userAgent: string;
  metadata?: Record<string, any>;
}

/**
 * Command execution metrics
 */
export interface CommandMetrics {
  commandName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  errorMessage?: string;
  memoryUsage?: {
    used: number;
    total: number;
  };
  networkRequests?: number;
  elementsFound?: number;
}

/**
 * Enhanced element reference with computed properties
 */
export interface EnhancedElementRef extends ElementRef {
  tagName?: string;
  attributes?: Record<string, string>;
  textContent?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  computedStyle?: Record<string, string>;
  visible?: boolean;
  enabled?: boolean;
}

/**
 * Command execution context with enhanced features
 */
export interface EnhancedCommandContext {
  command: string;
  args: any;
  startTime: number;
  sessionId?: string;
  browserState?: DetailedBrowserState;
  metrics?: CommandMetrics;
  screenshots?: string[]; // Paths to screenshots taken during execution
}

// ==============================================
// VALIDATION AND ERROR TYPES
// ==============================================

/**
 * Enhanced validation error with location info
 */
export interface DetailedValidationError extends ValidationError {
  code?: string;
  path?: string; // JSON path to the invalid field
  line?: number; // For file-based validations
  column?: number;
  severity?: 'error' | 'warning' | 'info';
  suggestions?: string[]; // Suggested fixes
}

/**
 * Command execution error with context
 */
export interface CommandExecutionError extends Error {
  code?: string;
  command?: string;
  args?: any;
  context?: EnhancedCommandContext;
  screenshot?: string; // Path to error screenshot
  suggestions?: string[];
}

/**
 * Browser connection error details
 */
export interface BrowserConnectionError extends Error {
  port?: number;
  host?: string;
  timeout?: number;
  pid?: number;
  retryAttempts?: number;
  lastResponse?: any;
}

// ==============================================
// CONFIGURATION TYPES
// ==============================================

/**
 * CLI configuration options
 */
export interface CLIConfig {
  defaultPort: number;
  timeouts: {
    default: number;
    navigation: number;
    element: number;
  };
  retries: {
    default: number;
    browser: number;
    network: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'text' | 'json';
    file?: string;
  };
  browser: {
    headless: boolean;
    slowMo?: number;
    devtools?: boolean;
    userDataDir?: string;
    executablePath?: string;
  };
  screenshots: {
    onError: boolean;
    directory: string;
    quality?: number;
    fullPage: boolean;
  };
}

/**
 * Plugin interface for extensibility
 */
export interface CLIPlugin {
  name: string;
  version: string;
  commands?: CommandModule[];
  middleware?: Array<(argv: any) => void>;
  hooks?: {
    beforeCommand?: (context: EnhancedCommandContext) => void | Promise<void>;
    afterCommand?: (context: EnhancedCommandContext, result: CommandResult) => void | Promise<void>;
    onError?: (error: CommandExecutionError) => void | Promise<void>;
  };
  config?: Partial<CLIConfig>;
}

/**
 * Export all types for external use
 */
export type {
  ArgumentsCamelCase,
  CommandModule,
  Page
};