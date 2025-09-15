import { spawn } from 'child_process';
import { CommandModule, Arguments } from 'yargs';
import { logger } from '../../../lib/logger';

interface CodegenArgs extends Arguments {
  url?: string;
}

export const codegenCommand: CommandModule<{}, CodegenArgs> = {
  command: 'codegen [url]',
  describe: 'Open Playwright code generator',
  
  builder: (yargs) => {
    return yargs
      .positional('url', {
        describe: 'URL to start with',
        type: 'string'
      })
      .example('$0 codegen', 'Open Playwright codegen without URL')
      .example('$0 codegen https://example.com', 'Open Playwright codegen with URL');
  },
  
  handler: async (argv) => {
    logger.info('Opening Playwright Codegen...');
    const args = ['codegen'];
    if (argv.url) args.push(argv.url);

    return new Promise<void>((resolve, reject) => {
      const child = spawn('npx', ['playwright', ...args], {
        stdio: 'inherit'
      });

      child.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Codegen exited with code ${code}`));
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