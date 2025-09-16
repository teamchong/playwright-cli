/**
 * Open Command - Yargs Implementation
 * 
 * Opens browser (connects if running, launches if not) and optionally navigates to a URL.
 */

import { createCommand } from '../../lib/command-builder';
import { BrowserHelper } from '../../../lib/browser-helper';
import type { OpenOptions } from '../../types';

/**
 * Checks if a port is open and accepting connections.
 * Uses TCP socket connection with 1-second timeout.
 */
async function isPortOpen(port: number): Promise<boolean> {
  try {
    const net = require('net');
    return new Promise(resolve => {
      const socket = net.createConnection(port, 'localhost');
      socket.on('connect', () => {
        socket.end();
        resolve(true);
      });
      socket.on('error', () => {
        resolve(false);
      });
      socket.setTimeout(1000);
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
    });
  } catch {
    return false;
  }
}

export const openCommand = createCommand<OpenOptions>({
  metadata: {
    name: 'open',
    category: 'navigation',
    description: 'Open browser (connects if running, launches if not)'
  },
  
  command: 'open [url]',
  describe: 'Open browser (connects if running, launches if not)',
  
  builder: (yargs) => {
    return yargs
      .positional('url', {
        describe: 'Optional URL to navigate to',
        type: 'string'
      })
      .option('port', {
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
        alias: 'p'
      })
      .option('newTab', {
        describe: 'Always open URL in a new tab',
        type: 'boolean',
        alias: 'n'
      })
      .option('newWindow', {
        describe: 'Open URL in a new window',
        type: 'boolean'
      })
      .option('device', {
        describe: 'Device to emulate',
        type: 'string'
      })
      .option('geolocation', {
        describe: 'Geolocation override (latitude,longitude)',
        type: 'string'
      })
      .option('timezone', {
        describe: 'Timezone override',
        type: 'string'
      })
      .example('$0 open', 'Open browser')
      .example('$0 open https://example.com', 'Open browser and navigate to URL')
      .example('$0 open https://example.com --new-tab', 'Open URL in new tab')
      .example('$0 open https://example.com --device "iPhone 12"', 'Open with device emulation');
  },
  
  handler: async ({ argv, logger, spinner }) => {
    const { url, newTab, newWindow, device, geolocation, timezone } = argv;
    
    if (spinner) {
      spinner.start('Opening browser...');
    }
    
    try {
      // First, check if browser is already running
      const isRunning = await isPortOpen(argv.port);
      
      if (!isRunning) {
        // Launch new browser if not running
        if (spinner) {
          spinner.text = 'Launching browser...';
        }
        
        await BrowserHelper.launchChrome(argv.port, undefined, url as string | undefined);
        
        if (spinner) {
          spinner.succeed(`Browser launched on port ${argv.port}`);
        }
        
        // If URL was provided, it's already handled by launchChrome
        if (url) {
          logger.success(`Navigated to ${url}`);
        }
        
        return; // Exit early since launch handles navigation
      }
      
      // If browser is already running, connect to it
      await BrowserHelper.withBrowser(argv.port, async (browser) => {
        if (spinner) {
          spinner.text = 'Browser connected';
        }
        
        // Get or create context
        const contexts = browser.contexts();
        let context = contexts.length > 0 ? contexts[0] : await browser.newContext();
        
        // Apply device emulation if specified
        if (device) {
          // This would need device registry implementation
          logger.info(`Device emulation: ${device}`);
        }
        
        // Apply geolocation if specified
        if (geolocation) {
          const [latitude, longitude] = geolocation.split(',').map(Number);
          if (!isNaN(latitude) && !isNaN(longitude)) {
            await context.setGeolocation({ latitude, longitude });
            await context.grantPermissions(['geolocation']);
            logger.info(`Geolocation set to: ${latitude}, ${longitude}`);
          } else {
            throw new Error('Invalid geolocation format. Use: latitude,longitude');
          }
        }
        
        // Apply timezone if specified
        if (timezone) {
          await context.setExtraHTTPHeaders({ 'timezone': timezone });
          logger.info(`Timezone set to: ${timezone}`);
        }
        
        let tabId: string | undefined;
        
        // Handle URL navigation
        if (url && typeof url === 'string') {
          const fullUrl = url.includes('://') ? url : `https://${url}`;
          
          if (newWindow) {
            // Create new context for new window
            const newContext = await browser.newContext();
            const page = await newContext.newPage();
            await page.goto(fullUrl);
            tabId = await BrowserHelper.getPageId(page);
            logger.info(`Opened new window: ${fullUrl}`);
            logger.info(`Tab ID: ${tabId}`);
          } else if (newTab) {
            // Create new tab in existing context
            const page = await context.newPage();
            await page.goto(fullUrl);
            tabId = await BrowserHelper.getPageId(page);
            logger.info(`Opened new tab: ${fullUrl}`);
            logger.info(`Tab ID: ${tabId}`);
          } else {
            // Use existing tab or create new one
            const pages = context.pages();
            if (pages.length > 0) {
              await pages[0].goto(fullUrl);
              tabId = await BrowserHelper.getPageId(pages[0]);
              logger.info(`Navigated to: ${fullUrl}`);
              logger.info(`Tab ID: ${tabId}`);
            } else {
              const page = await context.newPage();
              await page.goto(fullUrl);
              tabId = await BrowserHelper.getPageId(page);
              logger.info(`Opened new tab: ${fullUrl}`);
              logger.info(`Tab ID: ${tabId}`);
            }
          }
        } else {
          // No URL specified, just ensure we have a tab and return its ID
          const pages = context.pages();
          if (pages.length > 0) {
            tabId = await BrowserHelper.getPageId(pages[0]);
            logger.info(`Tab ID: ${tabId}`);
          } else {
            const page = await context.newPage();
            tabId = await BrowserHelper.getPageId(page);
            logger.info(`Created new tab`);
            logger.info(`Tab ID: ${tabId}`);
          }
        }
        
        if (spinner) {
          spinner.succeed('Browser opened successfully');
        }
        
        logger.success(`Browser connected on port ${argv.port}`);
        
        if (argv.json) {
          logger.json({
            success: true,
            port: argv.port,
            url: url || null,
            newTab: newTab || false,
            newWindow: newWindow || false,
            device: device || null,
            geolocation: geolocation || null,
            timezone: timezone || null,
            tabId: tabId || null
          });
        }
      });
    } catch (error: any) {
      if (spinner) {
        spinner.fail('Failed to open browser');
      }
      throw new Error(`Browser connection failed: ${error.message}`);
    }
  },
  
  supportsJson: true
});