import { spawn } from 'child_process';
import { CommandModule, Arguments } from 'yargs';
import { logger } from '../../../lib/logger';

interface TestArgs extends Arguments {
  spec?: string;
  ui?: boolean;
  debug?: boolean;
}

export const testCommand: CommandModule<{}, TestArgs> = {
  command: 'test [spec]',
  describe: 'Run Playwright tests',
  
  builder: (yargs) => {
    return yargs
      .positional('spec', {
        describe: 'Test spec file',
        type: 'string'
      })
      .option('ui', {
        describe: 'Open UI mode',
        type: 'boolean',
        default: false
      })
      .option('debug', {
        describe: 'Debug mode',
        type: 'boolean',
        default: false
      })
      .example('$0 test', 'Run all tests')
      .example('$0 test tests/login.spec.ts', 'Run specific test file')
      .example('$0 test --ui', 'Open test UI mode')
      .example('$0 test --debug', 'Run tests in debug mode');
  },
  
  handler: async (argv) => {
    const args = ['test'];
    if (argv.spec) args.push(argv.spec);
    if (argv.ui) args.push('--ui');
    if (argv.debug) args.push('--debug');

    logger.info('Running Playwright tests...');

    return new Promise<void>((resolve, reject) => {
      const child = spawn('npx', ['playwright', ...args], {
        stdio: 'inherit'
      });

      child.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Tests failed with exit code ${code}`));
        } else {
          resolve();
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });
  }
};