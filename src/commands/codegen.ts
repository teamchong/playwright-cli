import { spawn } from 'child_process';

import chalk from 'chalk';
import { Command } from 'commander';

import { logger } from '../lib/logger';

export const codegenCommand = new Command('codegen')
  .description('Open Playwright code generator')
  .argument('[url]', 'URL to start with')
  .action(url => {
    logger.info('Opening Playwright Codegen...');
    const args = ['codegen'];
    if (url) args.push(url);

    const child = spawn('npx', ['playwright', ...args], {
      stdio: 'inherit'
    });

    child.on('exit', code => {
      process.exit(code || 0);
    });
  });
