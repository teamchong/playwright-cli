#!/usr/bin/env node
/**
 * Performance monitoring and statistics command
 */

import chalk from 'chalk';
import { Command } from 'commander';

import { logger } from '../lib/logger';
import { performanceMonitor } from '../lib/performance-monitor';

export const perfCommand = new Command('perf')
  .description('View performance statistics and monitoring data')
  .option('--slow', 'Show only slow operations')
  .option('--limit <number>', 'Limit number of results', '10')
  .option('--clear', 'Clear performance metrics')
  .option('--json', 'Output as JSON')
  .action((options) => {
    try {
      if (options.clear) {
        performanceMonitor.clearMetrics();
        logger.success('Performance metrics cleared');
        return;
      }

      const stats = performanceMonitor.getStats();
      const limit = parseInt(options.limit, 10) || 10;

      if (options.json) {
        if (options.slow) {
          const slowOps = performanceMonitor.getSlowOperations(limit);
          logger.info(JSON.stringify({ slowOperations: slowOps }, null, 2));
        } else {
          logger.info(JSON.stringify(stats, null, 2));
        }
        return;
      }

      // Show formatted output
      if (options.slow) {
        const slowOps = performanceMonitor.getSlowOperations(limit);
        if (slowOps.length === 0) {
          logger.info(chalk.green('✅ No slow operations detected'));
          return;
        }

        logger.info(chalk.yellow(`🐌 Slow Operations (${slowOps.length} found):`));
        logger.info('');

        slowOps.forEach((op, index) => {
          const status = op.success ? chalk.green('✅') : chalk.red('❌');
          const time = chalk.yellow(`${op.executionTimeMs}ms`);
          const memory = chalk.blue(`${op.memoryUsageMB}MB`);

          logger.info(`${index + 1}. ${status} ${op.commandName} - ${time} | ${memory}`);
          if (!op.success && op.errorMessage) {
            logger.info(chalk.gray(`   Error: ${op.errorMessage}`));
          }
          logger.info(chalk.gray(`   ${op.timestamp.toISOString()}`));
          logger.info('');
        });
        return;
      }

      // Show general stats
      if (stats.totalCommands === 0) {
        logger.info(chalk.blue('📊 No performance data available yet'));
        logger.info(chalk.gray('Run some commands to start collecting performance metrics'));
        return;
      }

      logger.info(chalk.blue('📊 Performance Statistics'));
      logger.info('');

      logger.info(`${chalk.cyan('Total Commands:')} ${stats.totalCommands}`);
      logger.info(`${chalk.cyan('Average Execution Time:')} ${Math.round(stats.averageExecutionTime)}ms`);
      logger.info(`${chalk.cyan('Failure Rate:')} ${stats.failureRate.toFixed(1)}%`);
      logger.info('');

      if (stats.slowestCommand) {
        logger.info(chalk.yellow('🐌 Slowest Command:'));
        logger.info(`   ${stats.slowestCommand.commandName} - ${stats.slowestCommand.executionTimeMs}ms`);
        logger.info(`   ${stats.slowestCommand.memoryUsageMB}MB | ${stats.slowestCommand.timestamp.toISOString()}`);
        logger.info('');
      }

      if (stats.fastestCommand) {
        logger.info(chalk.green('⚡ Fastest Command:'));
        logger.info(`   ${stats.fastestCommand.commandName} - ${stats.fastestCommand.executionTimeMs}ms`);
        logger.info(`   ${stats.fastestCommand.memoryUsageMB}MB | ${stats.fastestCommand.timestamp.toISOString()}`);
        logger.info('');
      }

      // Show recent slow operations if any
      const recentSlowOps = performanceMonitor.getSlowOperations(3);
      if (recentSlowOps.length > 0) {
        logger.info(chalk.yellow('⚠️  Recent Slow Operations:'));
        recentSlowOps.forEach(op => {
          const status = op.success ? '✅' : '❌';
          logger.info(`   ${status} ${op.commandName} - ${op.executionTimeMs}ms`);
        });
        logger.info('');
        logger.info(chalk.gray('Use --slow to see all slow operations'));
      }

    } catch (error: any) {
      logger.commandError('Failed to show performance stats', error);
      process.exit(1);
    }
  });
