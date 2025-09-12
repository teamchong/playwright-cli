import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';

import { logger } from '../lib/logger';
import { SessionManager, SessionData } from '../lib/session-manager';

export const sessionCommand = new Command('session')
  .description('Manage browser sessions (save/load/list browser state)')
  .usage('<action> [options]');

// Session save subcommand
sessionCommand
  .command('save')
  .description('Save current browser state as a session')
  .argument('<name>', 'Session name')
  .option('-p, --port <port>', 'Browser debugging port', '9222')
  .option('-d, --description <text>', 'Session description')
  .action(async (name, options) => {
    const port = parseInt(options.port);
    const spinner = ora('Saving session...').start();

    try {
      // Validate session name
      if (!name || name.includes('/') || name.includes('\\')) {
        throw new Error('Invalid session name. Use alphanumeric characters, hyphens, and underscores only.');
      }

      // Check if session already exists
      if (SessionManager.sessionExists(name)) {
        spinner.info(chalk.yellow(`⚠️  Session '${name}' already exists, updating...`));
      }

      await SessionManager.saveSession(name, port, options.description);

      spinner.succeed(chalk.green(`✅ Session '${name}' saved successfully`));

      if (options.description) {
        logger.info(`   Description: ${options.description}`);
      }

    } catch (error: any) {
      spinner.fail(chalk.red(`❌ Failed to save session: ${error.message}`));

      if (error.message.includes('No browser context found')) {
        logger.info('\n💡 Make sure browser is running and connected:');
        logger.info('   playwright open');
      } else if (error.message.includes('ECONNREFUSED')) {
        logger.info(`\n💡 No browser found on port ${port}. Start browser first:`);
        logger.info(`   playwright open --port ${port}`);
      }

      process.exit(1);
    }
  });

// Session load subcommand
sessionCommand
  .command('load')
  .description('Load a previously saved session')
  .argument('<name>', 'Session name')
  .option('-p, --port <port>', 'Browser debugging port', '9222')
  .action(async (name, options) => {
    const port = parseInt(options.port);
    const spinner = ora('Loading session...').start();

    try {
      await SessionManager.loadSession(name, port);

      spinner.succeed(chalk.green(`✅ Session '${name}' loaded successfully`));

    } catch (error: any) {
      spinner.fail(chalk.red(`❌ Failed to load session: ${error.message}`));

      if (error.message.includes('not found')) {
        logger.info('\n💡 Available sessions:');
        const sessions = SessionManager.listSessions();
        if (sessions.length === 0) {
          logger.info('   No saved sessions');
          logger.info('   playwright session save <name>');
        } else {
          sessions.slice(0, 5).forEach(session => {
            logger.info(chalk.cyan(`   ${session.name}`) + chalk.gray(` (${new Date(session.updatedAt).toLocaleDateString()})`));
          });
        }
      } else if (error.message.includes('ECONNREFUSED')) {
        logger.info(`\n💡 No browser found on port ${port}. Start browser first:`);
        logger.info(`   playwright open --port ${port}`);
      }

      process.exit(1);
    }
  });

// Session list subcommand
sessionCommand
  .command('list')
  .description('List all saved sessions')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const sessions = SessionManager.listSessions();

      if (options.json) {
        logger.info(JSON.stringify(sessions, null, 2));
        return;
      }

      if (sessions.length === 0) {
        logger.info('No saved sessions found.');
        logger.info('\n💡 Create a session:');
        logger.info('   playwright session save <name>');
        return;
      }

      logger.info(chalk.bold(`\n📋 Saved Sessions (${sessions.length})\n`));

      sessions.forEach((session, index) => {
        const updatedDate = new Date(session.updatedAt);
        const createdDate = new Date(session.createdAt);
        const isRecent = (Date.now() - updatedDate.getTime()) < 24 * 60 * 60 * 1000; // Within 24 hours

        logger.info(chalk.bold(session.name) + (isRecent ? chalk.green(' (recent)') : ''));
        logger.info(`   URL: ${session.url}`);
        logger.info(`   Updated: ${updatedDate.toLocaleString()}`);
        if (session.metadata?.description) {
          logger.info(`   Description: ${session.metadata.description}`);
        }
        logger.info(`   Cookies: ${session.cookies.length}, Storage keys: ${Object.keys(session.localStorage).length + Object.keys(session.sessionStorage).length}`);

        if (index < sessions.length - 1) {
          console.log(); // Add spacing between sessions
        }
      });

      logger.info('\n💡 Usage:');
      logger.info('   playwright session load <name>');
      logger.info('   playwright session delete <name>');

    } catch (error: any) {
      logger.commandError(`Failed to list sessions: ${error.message}`);
      process.exit(1);
    }
  });

// Session delete subcommand
sessionCommand
  .command('delete')
  .alias('remove')
  .alias('rm')
  .description('Delete a saved session')
  .argument('<name>', 'Session name')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(async (name, options) => {
    try {
      if (!SessionManager.sessionExists(name)) {
        logger.info(chalk.red(`❌ Session '${name}' not found`));
        process.exit(1);
      }

      if (!options.force) {
        // Simple confirmation without external dependency
        logger.warn(`⚠️  Are you sure you want to delete session '${name}'?`);
        logger.info('   This action cannot be undone.');
        logger.info('   Press Ctrl+C to cancel or run with --force to skip this prompt.');

        // Wait for user input
        process.stdout.write(chalk.cyan('Delete session? (y/N): '));
        const answer = await new Promise<string>((resolve) => {
          process.stdin.once('data', (data) => {
            resolve(data.toString().trim().toLowerCase());
          });
        });

        if (answer !== 'y' && answer !== 'yes') {
          logger.info('Operation cancelled.');
          return;
        }
      }

      await SessionManager.deleteSession(name);
      logger.success(`Session '${name}' deleted successfully`);

    } catch (error: any) {
      logger.commandError(`Failed to delete session: ${error.message}`);
      process.exit(1);
    }
  });

// Help for the main session command
sessionCommand
  .command('help', { isDefault: true })
  .description('Show session command help')
  .action(() => {
    logger.info(chalk.bold('\n🎭 Session Management\n'));
    logger.info('Save and restore complete browser state including:');
    logger.info('• Current URL and page state');
    logger.info('• Cookies and authentication');
    logger.info('• Local storage and session storage');
    logger.info('• Viewport size and user agent');
    console.log();

    logger.info(chalk.bold('Commands:'));
    logger.info(chalk.cyan('  save <name>     ') + 'Save current browser state');
    logger.info(chalk.cyan('  load <name>     ') + 'Restore saved browser state');
    logger.info(chalk.cyan('  list            ') + 'List all saved sessions');
    logger.info(chalk.cyan('  delete <name>   ') + 'Delete a saved session');
    console.log();

    logger.info(chalk.bold('Examples:'));
    logger.info('  playwright session save login-state');
    logger.info('  playwright session save dev-env -d "Development environment with auth"');
    logger.info('  playwright session load login-state');
    logger.info('  playwright session list');
    console.log();

    logger.info(chalk.bold('Options:'));
    logger.info(chalk.cyan('  -p, --port <port>        ') + 'Browser debugging port (default: 9222)');
    logger.info(chalk.cyan('  -d, --description <text> ') + 'Session description (for save)');
    logger.info(chalk.cyan('  -f, --force              ') + 'Skip confirmation (for delete)');
    logger.info(chalk.cyan('  --json                   ') + 'JSON output (for list)');
  });
