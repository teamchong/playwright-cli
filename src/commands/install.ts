import { exec } from 'child_process';
import { promisify } from 'util';

import chalk from 'chalk';
import { Command } from 'commander';

import { logger } from '../lib/logger';

const execAsync = promisify(exec);

export const installCommand = new Command('install')
  .description('Install browser binaries')
  .argument(
    '[browser]',
    'Browser to install (chromium, firefox, webkit)',
    'chromium'
  )
  .action(async browser => {
    try {
      logger.info(`Installing ${browser}...`);
      const { stdout, stderr } = await execAsync(
        `npx playwright install ${browser}`
      );
      logger.info(stdout);
      if (stderr) logger.error(stderr);
      logger.success(`${browser} installed`);
    } catch (error: any) {
      logger.commandError(`Installation failed: ${error.message}`);
      process.exit(1);
    }
  });
