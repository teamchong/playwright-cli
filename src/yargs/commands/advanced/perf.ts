/**
 * Performance Command - Yargs Implementation
 * 
 * Views and manages performance statistics and monitoring data.
 * Supports filtering slow operations and JSON output formatting.
 */

import chalk from 'chalk';
import { createCommand } from '../../lib/command-builder';
import { performanceMonitor } from '../../../lib/performance-monitor';
import type { BaseCommandOptions } from '../../types';

interface PerfOptions extends BaseCommandOptions {
  slow?: boolean;
  limit?: number;
  clear?: boolean;
}

export const perfCommand = createCommand<PerfOptions>({
  metadata: {
    name: 'perf',
    category: 'advanced',
    description: 'View performance statistics and monitoring data',
    aliases: []
  },
  
  command: 'perf',
  describe: 'View performance statistics and monitoring data',
  
  builder: (yargs) => {
    return yargs
      .option('port', {
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
        alias: 'p'
      })
      .option('slow', {
        describe: 'Show only slow operations',
        type: 'boolean',
        default: false
      })
      .option('limit', {
        describe: 'Limit number of results',
        type: 'number',
        default: 10
      })
      .option('clear', {
        describe: 'Clear performance metrics',
        type: 'boolean',
        default: false
      })
      .option('json', {
        describe: 'Output as JSON',
        type: 'boolean',
        default: false
      })
      .example('$0 perf', 'Show performance statistics')
      .example('$0 perf --slow', 'Show slow operations')
      .example('$0 perf --clear', 'Clear performance metrics');
  },
  
  handler: async (cmdContext) => {
    try {
      const { argv, logger } = cmdContext;
      
      if (argv.clear) {
        performanceMonitor.clearMetrics();
        logger.success('Performance metrics cleared');
        return;
      }
      
      const stats = performanceMonitor.getStats();
      const limit = argv.limit || 10;
      
      if (argv.json) {
        if (argv.slow) {
          const slowOps = performanceMonitor.getSlowOperations(limit);
          logger.info(JSON.stringify({ slowOperations: slowOps }, null, 2));
        } else {
          logger.info(JSON.stringify(stats, null, 2));
        }
        return;
      }
      
      // Show formatted output
      if (argv.slow) {
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
      cmdContext.logger.error(`Failed to show performance stats: ${error.message}`);
      throw new Error("Command failed");
    }
  }
});