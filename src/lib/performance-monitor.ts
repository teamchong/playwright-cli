/**
 * Performance monitoring service for tracking execution time and resource usage
 */

import { logger } from './logger';

export interface PerformanceMetrics {
  commandName: string;
  executionTimeMs: number;
  memoryUsageMB: number;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

export interface PerformanceThresholds {
  slowOperationMs: number;
  memoryWarningMB: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private thresholds: PerformanceThresholds = {
    slowOperationMs: 5000, // 5 seconds
    memoryWarningMB: 100    // 100MB
  };

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start tracking performance for a command
   */
  startTracking(commandName: string): PerformanceTracker {
    return new PerformanceTracker(this, commandName);
  }

  /**
   * Record performance metrics
   */
  recordMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);

    // Log slow operations
    if (metrics.executionTimeMs > this.thresholds.slowOperationMs) {
      logger.warn(`Slow operation detected: ${metrics.commandName} took ${metrics.executionTimeMs}ms`);
    }

    // Log high memory usage
    if (metrics.memoryUsageMB > this.thresholds.memoryWarningMB) {
      logger.warn(`High memory usage: ${metrics.commandName} used ${metrics.memoryUsageMB}MB`);
    }

    // Debug log all performance data
    logger.debug(`Performance: ${metrics.commandName} - ${metrics.executionTimeMs}ms, ${metrics.memoryUsageMB}MB, ${metrics.success ? 'success' : 'failed'}`);

    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    totalCommands: number;
    averageExecutionTime: number;
    slowestCommand: PerformanceMetrics | null;
    fastestCommand: PerformanceMetrics | null;
    failureRate: number;
    } {
    if (this.metrics.length === 0) {
      return {
        totalCommands: 0,
        averageExecutionTime: 0,
        slowestCommand: null,
        fastestCommand: null,
        failureRate: 0
      };
    }

    const totalTime = this.metrics.reduce((sum, m) => sum + m.executionTimeMs, 0);
    const failures = this.metrics.filter(m => !m.success).length;

    return {
      totalCommands: this.metrics.length,
      averageExecutionTime: totalTime / this.metrics.length,
      slowestCommand: this.metrics.reduce((slowest, current) =>
        current.executionTimeMs > slowest.executionTimeMs ? current : slowest),
      fastestCommand: this.metrics.reduce((fastest, current) =>
        current.executionTimeMs < fastest.executionTimeMs ? current : fastest),
      failureRate: (failures / this.metrics.length) * 100
    };
  }

  /**
   * Get recent slow operations
   */
  getSlowOperations(limit = 10): PerformanceMetrics[] {
    return this.metrics
      .filter(m => m.executionTimeMs > this.thresholds.slowOperationMs)
      .sort((a, b) => b.executionTimeMs - a.executionTimeMs)
      .slice(0, limit);
  }

  /**
   * Update performance thresholds
   */
  setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
    logger.debug(`Performance thresholds updated: ${JSON.stringify(this.thresholds)}`);
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics(): void {
    this.metrics = [];
    logger.debug('Performance metrics cleared');
  }
}

export class PerformanceTracker {
  private startTime: number;
  private startMemory: number;
  private commandName: string;
  private monitor: PerformanceMonitor;

  constructor(monitor: PerformanceMonitor, commandName: string) {
    this.monitor = monitor;
    this.commandName = commandName;
    this.startTime = Date.now();
    this.startMemory = this.getMemoryUsageMB();
  }

  /**
   * Complete tracking and record metrics
   */
  end(success = true, errorMessage?: string): PerformanceMetrics {
    const endTime = Date.now();
    const endMemory = this.getMemoryUsageMB();

    const metrics: PerformanceMetrics = {
      commandName: this.commandName,
      executionTimeMs: endTime - this.startTime,
      memoryUsageMB: Math.max(endMemory - this.startMemory, 0), // Ensure non-negative
      timestamp: new Date(),
      success,
      errorMessage
    };

    this.monitor.recordMetrics(metrics);
    return metrics;
  }

  /**
   * Get current execution time
   */
  getCurrentExecutionTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get memory usage in MB
   */
  private getMemoryUsageMB(): number {
    const usage = process.memoryUsage();
    return Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100; // Round to 2 decimal places
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Helper function for easy use in commands
export function trackPerformance<T>(
  commandName: string,
  operation: () => Promise<T>
): Promise<T> {
  const tracker = performanceMonitor.startTracking(commandName);

  return operation()
    .then(result => {
      tracker.end(true);
      return result;
    })
    .catch(error => {
      tracker.end(false, error.message);
      throw error;
    });
}

// Helper for synchronous operations
export function trackPerformanceSync<T>(
  commandName: string,
  operation: () => T
): T {
  const tracker = performanceMonitor.startTracking(commandName);

  try {
    const result = operation();
    tracker.end(true);
    return result;
  } catch (error: any) {
    tracker.end(false, error.message);
    throw error;
  }
}
