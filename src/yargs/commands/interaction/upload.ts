/**
 * Upload Command - Yargs Implementation
 * 
 * Uploads files to file input elements using Playwright's page.setInputFiles() method.
 * Supports uploading single or multiple files.
 */

import * as path from 'path';
import { createCommand } from '../../lib/command-builder';
import { BrowserHelper } from '../../../lib/browser-helper';
import type { UploadOptions } from '../../types';

export const uploadCommand = createCommand<UploadOptions>({
  metadata: {
    name: 'upload',
    category: 'interaction',
    description: 'Upload file(s) to a file input',
    aliases: []
  },
  
  command: 'upload <selector> <files...>',
  describe: 'Upload file(s) to a file input',
  
  builder: (yargs) => {
    return yargs
      .positional('selector', {
        describe: 'File input selector',
        type: 'string',
        demandOption: true
      })
      .positional('files', {
        describe: 'File path(s) to upload',
        type: 'string',
        array: true,
        demandOption: true
      })
      .option('port', {
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
        alias: 'p'
      })
      .option('timeout', {
        describe: 'Timeout in milliseconds',
        type: 'number',
        default: 5000
      });
  },
  
  handler: async ({ argv, logger, spinner }) => {
    const { selector, files, port } = argv;
    
    if (spinner) {
      spinner.text = `Uploading ${files.length} file(s) to ${selector}...`;
    }
    
    await BrowserHelper.withActivePage(port, async (page) => {
      // Resolve absolute paths
      const absolutePaths = files.map((file: string) =>
        path.isAbsolute(file) ? file : path.resolve(process.cwd(), file)
      );
      
      await page.setInputFiles(selector, absolutePaths);
    });
    
    logger.success(`Uploaded ${files.length} file(s) to ${selector}`);
  }
});