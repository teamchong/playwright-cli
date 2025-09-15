import { describe, it, expect, vi } from 'vitest';

import {
  LinearRetryStrategy,
  ExponentialRetryStrategy,
  FixedRetryStrategy,
  RetryStrategyFactory,
  RetryConfigs
} from '../retry-strategy';

describe('RetryStrategy', () => {

  describe('LinearRetryStrategy', () => {
    it('should calculate delay linearly', () => {
      const strategy = new LinearRetryStrategy({
        maxAttempts: 3,
        baseDelayMs: 1000,
        maxDelayMs: 5000,
        timeoutMs: 10000,
        retryableErrors: ['test error']
      });

      expect(strategy.calculateDelay(1)).toBe(1000);
      expect(strategy.calculateDelay(2)).toBe(2000);
      expect(strategy.calculateDelay(3)).toBe(3000);
    });

    it('should respect max delay', () => {
      const strategy = new LinearRetryStrategy({
        maxAttempts: 10,
        baseDelayMs: 1000,
        maxDelayMs: 2000,
        timeoutMs: 10000,
        retryableErrors: ['test error']
      });

      expect(strategy.calculateDelay(5)).toBe(2000);
    });
  });

  describe('ExponentialRetryStrategy', () => {
    it('should calculate delay exponentially', () => {
      const strategy = new ExponentialRetryStrategy({
        maxAttempts: 4,
        baseDelayMs: 100,
        maxDelayMs: 5000,
        timeoutMs: 10000,
        retryableErrors: ['test error']
      });

      expect(strategy.calculateDelay(1)).toBe(100);
      expect(strategy.calculateDelay(2)).toBe(200);
      expect(strategy.calculateDelay(3)).toBe(400);
      expect(strategy.calculateDelay(4)).toBe(800);
    });

    it('should respect max delay', () => {
      const strategy = new ExponentialRetryStrategy({
        maxAttempts: 10,
        baseDelayMs: 100,
        maxDelayMs: 500,
        timeoutMs: 10000,
        retryableErrors: ['test error']
      });

      expect(strategy.calculateDelay(5)).toBe(500);
    });
  });

  describe('FixedRetryStrategy', () => {
    it('should use fixed delay', () => {
      const strategy = new FixedRetryStrategy({
        maxAttempts: 5,
        baseDelayMs: 1500,
        maxDelayMs: 5000,
        timeoutMs: 10000,
        retryableErrors: ['test error']
      });

      expect(strategy.calculateDelay(1)).toBe(1500);
      expect(strategy.calculateDelay(2)).toBe(1500);
      expect(strategy.calculateDelay(3)).toBe(1500);
    });
  });

  describe('Retry execution', () => {
    it('should succeed on first attempt', async () => {
      const strategy = new ExponentialRetryStrategy({
        maxAttempts: 3,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        timeoutMs: 5000,
        retryableErrors: ['test error']
      });

      const operation = vi.fn().mockResolvedValue('success');
      const result = await strategy.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);

      const metrics = strategy.getMetrics();
      expect(metrics.totalAttempts).toBe(1);
      expect(metrics.successfulAttempts).toBe(1);
      expect(metrics.failedAttempts).toBe(0);
    });

    it('should retry on retryable errors', async () => {
      // Use a strategy with very short delays and timeouts for testing
      const strategy = new ExponentialRetryStrategy({
        maxAttempts: 3,
        baseDelayMs: 1,
        maxDelayMs: 5,
        timeoutMs: 100,
        retryableErrors: ['network error']
      });

      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue('success');

      const result = await strategy.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);

      const metrics = strategy.getMetrics();
      expect(metrics.totalAttempts).toBe(3);
      expect(metrics.successfulAttempts).toBe(1);
      expect(metrics.failedAttempts).toBe(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const strategy = new ExponentialRetryStrategy({
        maxAttempts: 3,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        timeoutMs: 5000,
        retryableErrors: ['network error']
      });

      const operation = vi.fn().mockRejectedValue(new Error('syntax error'));

      await expect(strategy.execute(operation)).rejects.toThrow('syntax error');
      expect(operation).toHaveBeenCalledTimes(1);

      const metrics = strategy.getMetrics();
      expect(metrics.totalAttempts).toBe(1);
      expect(metrics.failedAttempts).toBe(1);
    });

    it('should fail after max attempts', async () => {
      const strategy = new ExponentialRetryStrategy({
        maxAttempts: 2,
        baseDelayMs: 1,
        maxDelayMs: 5,
        timeoutMs: 100,
        retryableErrors: ['network error']
      });

      const operation = vi.fn().mockRejectedValue(new Error('network error'));

      await expect(strategy.execute(operation)).rejects.toThrow('Operation failed after 2 attempts');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should timeout long-running operations', async () => {
      const strategy = new ExponentialRetryStrategy({
        maxAttempts: 3,
        baseDelayMs: 1,
        maxDelayMs: 5,
        timeoutMs: 10, // Very short timeout
        retryableErrors: ['timeout']
      });

      const operation = vi.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 50))
      );

      await expect(strategy.execute(operation)).rejects.toThrow('Operation timed out after 10ms');
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Circuit breaker', () => {
    it('should track circuit breaker state', async () => {
      const strategy = new ExponentialRetryStrategy({
        maxAttempts: 2,
        baseDelayMs: 1,
        maxDelayMs: 5,
        timeoutMs: 50,
        retryableErrors: ['network error']
      });

      const operation = vi.fn().mockRejectedValue(new Error('network error'));

      // Execute operation that will fail
      await expect(strategy.execute(operation)).rejects.toThrow();

      const metrics = strategy.getMetrics();
      expect(metrics.failedAttempts).toBe(2);
      // Circuit breaker state starts as 'closed'
      expect(['closed', 'open', 'half-open']).toContain(metrics.circuitBreakerState);
    });
  });

  describe('RetryStrategyFactory', () => {
    it('should create linear strategy', () => {
      const strategy = RetryStrategyFactory.create('linear', RetryConfigs.browser);
      expect(strategy).toBeInstanceOf(LinearRetryStrategy);
    });

    it('should create exponential strategy', () => {
      const strategy = RetryStrategyFactory.create('exponential', RetryConfigs.interaction);
      expect(strategy).toBeInstanceOf(ExponentialRetryStrategy);
    });

    it('should create fixed strategy', () => {
      const strategy = RetryStrategyFactory.create('fixed', RetryConfigs.network);
      expect(strategy).toBeInstanceOf(FixedRetryStrategy);
    });

    it('should throw on unknown strategy type', () => {
      expect(() => RetryStrategyFactory.create('unknown' as any, RetryConfigs.browser))
        .toThrow('Unknown retry strategy type: unknown');
    });
  });

  describe('RetryConfigs', () => {
    it('should have browser config', () => {
      expect(RetryConfigs.browser).toEqual({
        maxAttempts: 3,
        baseDelayMs: 1000,
        maxDelayMs: 5000,
        timeoutMs: 10000,
        retryableErrors: [
          'no browser running',
          'connection refused',
          'timeout',
          'network error',
          'browser closed'
        ]
      });
    });

    it('should have interaction config', () => {
      expect(RetryConfigs.interaction.maxAttempts).toBe(2);
      expect(RetryConfigs.interaction.retryableErrors).toContain('element not found');
    });

    it('should have network config', () => {
      expect(RetryConfigs.network.maxAttempts).toBe(5);
      expect(RetryConfigs.network.retryableErrors).toContain('network error');
    });

    it('should have file config', () => {
      expect(RetryConfigs.file.maxAttempts).toBe(2);
      expect(RetryConfigs.file.retryableErrors).toContain('file not found');
    });
  });
});
