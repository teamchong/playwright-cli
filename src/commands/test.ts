import { spawn } from 'child_process';

import chalk from 'chalk';
import { Command } from 'commander';

import { logger } from '../lib/logger';

export const testCommand = new Command('test')
  .description('Run Playwright tests')
  .argument('[spec]', 'Test spec file')
  .option('--ui', 'Open UI mode')
  .option('--debug', 'Debug mode')
  .action((spec, options) => {
    const args = ['test'];
    if (spec) args.push(spec);
    if (options.ui) args.push('--ui');
    if (options.debug) args.push('--debug');

    logger.info('Running Playwright tests...');

    const child = spawn('npx', ['playwright', ...args], {
      stdio: 'inherit'
    });

    child.on('exit', code => {
      process.exit(code || 0);
    });
  });
