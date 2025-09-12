import chalk from 'chalk';
import { Command } from 'commander';
import ora, { Ora } from 'ora';

import { IBrowserService } from './browser-service';
import { container, SERVICE_TYPES } from './di-container';
import { logger } from './logger';
import { performanceMonitor, PerformanceTracker } from './performance-monitor';
import { findElementByRef, nodeToSelector } from './ref-utils';
import { RetryStrategy, RetryStrategyFactory, RetryConfigs, RetryableOperation } from './retry-strategy';
import { ValidationError } from './validation';

export interface BaseCommandOptions {
  port?: string;
  timeout?: string;
}

export interface RefSelectorResult {
  actualSelector: string;
  element?: any;
}

/**
 * Base class for all Playwright CLI commands
 * Provides common functionality like spinner management, error handling,
 * browser connection management, and ref selector processing
 */
export abstract class CommandBase {
  protected spinner?: Ora;
  protected command: Command;
  protected browserService: IBrowserService;
  protected retryStrategy: RetryStrategy;
  private performanceTracker?: PerformanceTracker;

  constructor(name: string, description: string, browserService?: IBrowserService) {
    this.command = new Command(name).description(description);
    this.browserService = browserService || container.resolve<IBrowserService>(SERVICE_TYPES.BrowserService);
    // Default to exponential retry for browser operations
    this.retryStrategy = RetryStrategyFactory.create('exponential', RetryConfigs.browser);
    this.setupCommand();
  }

  /**
   * Abstract method for subclasses to define their specific command setup
   */
  protected abstract setupCommand(): void;

  /**
   * Abstract method for subclasses to implement their execution logic
   */
  protected abstract execute(args: any[], options: any): Promise<void>;

  /**
   * Get the configured Command instance
   */
  public getCommand(): Command {
    return this.command.action(async (...actionArgs) => {
      const options = actionArgs[actionArgs.length - 1];
      const args = actionArgs.slice(0, -1);

      try {
        await this.executeWithErrorHandling(args, options);
      } catch (error: any) {
        this.handleError(error);
      }
    });
  }

  /**
   * Execute the command with common error handling
   */
  private async executeWithErrorHandling(args: any[], options: any): Promise<void> {
    // Start performance tracking
    this.performanceTracker = performanceMonitor.startTracking(this.command.name());

    try {
      await this.preExecute(args, options);
      await this.execute(args, options);
      await this.postExecute(args, options);

      // Mark successful completion
      this.performanceTracker.end(true);
    } catch (error) {
      // Mark failure with error message
      this.performanceTracker?.end(false, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Hook called before command execution
   */
  protected async preExecute(args: any[], options: any): Promise<void> {
    // Override in subclasses if needed
  }

  /**
   * Hook called after successful command execution
   */
  protected async postExecute(args: any[], options: any): Promise<void> {
    // Override in subclasses if needed
  }

  /**
   * Start a spinner with the given message
   */
  protected startSpinner(message: string): void {
    this.spinner = ora(message).start();
  }

  /**
   * Update spinner text
   */
  protected updateSpinner(message: string): void {
    if (this.spinner) {
      this.spinner.text = message;
    }
  }

  /**
   * Mark spinner as successful with message
   */
  protected succeedSpinner(message: string): void {
    if (this.spinner) {
      this.spinner.succeed(chalk.green(message));
    }
  }

  /**
   * Mark spinner as failed with message
   */
  protected failSpinner(message: string): void {
    if (this.spinner) {
      this.spinner.fail(chalk.red(message));
    }
  }

  /**
   * Parse port from options with default
   */
  protected parsePort(options: BaseCommandOptions, defaultPort = '9222'): number {
    return parseInt(options.port || defaultPort);
  }

  /**
   * Parse timeout from options with default
   */
  protected parseTimeout(options: any, defaultTimeout = '5000'): number {
    return parseInt(options.timeout || defaultTimeout);
  }

  /**
   * Handle ref selector format [ref=xxx] and convert to actual selector
   */
  protected async resolveRefSelector(
    selector: string,
    page: any,
    spinnerMessage?: string
  ): Promise<RefSelectorResult> {
    const refMatch = selector.match(/^\[ref=([a-f0-9]+)\]$/);

    if (!refMatch) {
      return { actualSelector: selector };
    }

    const targetRef = refMatch[1];

    if (spinnerMessage && this.spinner) {
      this.spinner.text = spinnerMessage;
    }

    // Get accessibility snapshot
    const snapshot = await page.accessibility.snapshot();

    // Find the element with this ref
    const element = findElementByRef(snapshot, targetRef);

    if (!element) {
      throw new Error(`No element found with ref=${targetRef}`);
    }

    // Convert to a selector
    const actualSelector = nodeToSelector(element);

    return { actualSelector, element };
  }

  /**
   * Execute a function with an active browser page
   */
  protected async withActivePage<T>(
    port: number,
    callback: (page: any) => Promise<T>
  ): Promise<T> {
    return this.browserService.withActivePage(port, callback);
  }

  /**
   * Execute a function with a browser instance
   */
  protected async withBrowser<T>(
    port: number,
    callback: (browser: any) => Promise<T>
  ): Promise<T> {
    return this.browserService.withBrowser(port, callback);
  }

  /**
   * Common error handling for all commands
   */
  protected handleError(error: any): void {
    if (error instanceof ValidationError) {
      this.failSpinner('❌ Invalid parameters:');
      error.errors.forEach(err => {
        logger.error(`   • ${err}`);
      });
      process.exit(1);
    }

    const message = error.message || 'Unknown error occurred';
    this.failSpinner(`❌ Command failed: ${message}`);
    process.exit(1);
  }

  /**
   * Add common options that most commands use
   */
  protected addCommonOptions(): void {
    this.command
      .option('-p, --port <port>', 'Debugging port', '9222')
      .option('--timeout <ms>', 'Timeout in milliseconds', '5000');
  }

  /**
   * Log success message with consistent formatting
   */
  protected logSuccess(message: string): void {
    logger.success(message);
  }

  /**
   * Log info message with consistent formatting
   */
  protected logInfo(message: string): void {
    logger.debug(`   ${message}`);
  }

  /**
   * Log warning message with consistent formatting
   */
  protected logWarning(message: string): void {
    logger.warn(`⚠️  ${message}`);
  }

  /**
   * Configure retry strategy for this command
   */
  protected configureRetryStrategy(type: 'linear' | 'exponential' | 'fixed', configType: keyof typeof RetryConfigs): void {
    this.retryStrategy = RetryStrategyFactory.create(type, RetryConfigs[configType]);
  }

  /**
   * Execute operation with retry strategy
   */
  protected async withRetry<T>(operation: RetryableOperation<T>, operationType?: 'browser' | 'interaction' | 'network' | 'file'): Promise<T> {
    // Use specific retry strategy if operationType provided
    if (operationType && operationType !== 'browser') {
      const tempStrategy = RetryStrategyFactory.create('exponential', RetryConfigs[operationType]);
      return await tempStrategy.execute(operation);
    }

    return await this.retryStrategy.execute(operation);
  }

  /**
   * Execute browser operation with retry (for browser connections)
   */
  protected async withBrowserRetry<T>(
    port: number,
    callback: (browser: any) => Promise<T>
  ): Promise<T> {
    return this.withRetry(async () => {
      return this.browserService.withBrowser(port, callback);
    }, 'browser');
  }

  /**
   * Execute page operation with retry (for page interactions)
   */
  protected async withActivePageRetry<T>(
    port: number,
    callback: (page: any) => Promise<T>
  ): Promise<T> {
    return this.withRetry(async () => {
      return this.browserService.withActivePage(port, callback);
    }, 'interaction');
  }

  /**
   * Get retry metrics for debugging
   */
  protected getRetryMetrics() {
    return this.retryStrategy.getMetrics();
  }

  /**
   * Reset retry metrics (useful for testing)
   */
  protected resetRetryMetrics(): void {
    this.retryStrategy.resetMetrics();
  }

  /**
   * Log retry metrics if there were failures
   */
  protected logRetryMetrics(): void {
    const metrics = this.getRetryMetrics();
    if (metrics.failedAttempts > 0) {
      this.logWarning(`Retry metrics: ${metrics.totalAttempts} attempts, ${metrics.failedAttempts} failures, ${Math.round(metrics.totalRetryTime)}ms total`);
      if (metrics.circuitBreakerState !== 'closed') {
        this.logWarning(`Circuit breaker state: ${metrics.circuitBreakerState}`);
      }
    }
  }
}
