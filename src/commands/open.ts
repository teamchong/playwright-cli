import { spawn } from 'child_process';
import * as fs from 'fs';

import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';

import { BrowserConfig } from '../lib/browser-config';
import { BrowserHelper } from '../lib/browser-helper';
import { logger } from '../lib/logger';

/**
 * Checks if a port is open and accepting connections.
 * Uses TCP socket connection with 1-second timeout.
 *
 * @param port - The port number to test
 * @returns Promise resolving to true if port is open
 */
async function isPortOpen(port: number): Promise<boolean> {
  try {
    // Use a simple TCP check instead of fetch which might not work in Bun
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

/**
 * Detects the first available browser installation on the system.
 * Checks common installation paths for Chrome, Brave, Edge, and Chromium.
 *
 * @returns Promise resolving to browser name or null if none found
 */
async function detectInstalledBrowser(): Promise<string | null> {
  const browsers = [
    {
      name: 'chrome',
      path: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    },
    {
      name: 'brave',
      path: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'
    },
    {
      name: 'edge',
      path: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    },
    {
      name: 'chromium',
      path: '/Applications/Chromium.app/Contents/MacOS/Chromium'
    }
  ];

  for (const browser of browsers) {
    try {
      await fs.promises.access(browser.path);
      return browser.name;
    } catch {}
  }

  return null;
}

export const openCommand = new Command('open')
  .description('Open browser (connects if running, launches if not)')
  .argument('[url]', 'Optional URL to navigate to')
  .option('-p, --port <port>', 'Debugging port', '9222')
  .option(
    '-b, --browser <type>',
    'Browser name, path, or "default" to clear saved'
  )
  .option('--headless', 'Run in headless mode')
  .option('--devtools', 'Auto-open DevTools')
  .option('-n, --new-tab', 'Always open URL in a new tab')
  .action(async (url, options) => {
    const port = parseInt(options.port);

    // Step 1: Check if browser is already running on this port
    const isRunning = await isPortOpen(port);

    if (isRunning) {
      const spinner = ora('Connecting to browser...').start();

      try {
        // Try to connect via Playwright CDP (with auto-disconnect)
        await BrowserHelper.withBrowser(port, async browser => {
          spinner.succeed(
            chalk.green(`✅ Connected to browser on port ${port}`)
          );

          // If URL provided, navigate to it
          if (url) {
            const fullUrl = url.includes('://') ? url : `https://${url}`;
            // Find first page or create new one
            const contexts = browser.contexts();
            if (contexts.length > 0) {
              if (options.newTab) {
                // Always create a new tab when --new-tab is specified
                const page = await contexts[0].newPage();
                await page.goto(fullUrl);
                logger.info(`   Opened new tab: ${fullUrl}`);
              } else {
                // Use existing tab or create new one if none exist
                const pages = contexts[0].pages();
                if (pages.length > 0) {
                  await pages[0].goto(fullUrl);
                  logger.info(`   Navigated to ${fullUrl}`);
                } else {
                  const page = await contexts[0].newPage();
                  await page.goto(fullUrl);
                  logger.info(`   Opened new tab: ${fullUrl}`);
                }
              }
            }
          }
        });
        return;
      } catch (error: any) {
        spinner.fail(chalk.yellow('⚠️  Could not connect via Playwright'));
        logger.info(`   ${error.message}`);

        // Fall back to HTTP API for simple tab creation
        if (url) {
          try {
            const fullUrl = url.includes('://') ? url : `https://${url}`;
            const response = await fetch(
              `http://localhost:${port}/json/new?${encodeURIComponent(fullUrl)}`,
              {
                method: 'PUT'
              }
            );
            if (response.ok) {
              logger.info(`   Opened new tab via HTTP: ${fullUrl}`);
              return;
            }
          } catch {}
        }
      }
    }

    // Step 2: Determine which browser to launch
    let browserType = options.browser;

    // Handle special 'default' value to clear saved browser
    if (browserType === 'default') {
      await BrowserConfig.saveLastUsedBrowser(undefined);
      logger.info(chalk.green('✓ Cleared saved browser preference'));
      browserType = undefined;
    }

    if (!browserType) {
      // Check for last used browser first
      browserType = await BrowserConfig.getLastUsedBrowser();

      if (browserType) {
        logger.info(`Using saved browser: ${browserType}`);
      } else {
        // No saved browser, check config for default
        const config = await BrowserConfig.loadConfig();
        browserType = config.defaultBrowser;

        if (!browserType || browserType === 'chromium') {
          // Auto-detect installed browser
          const detected = await detectInstalledBrowser();
          if (detected) {
            browserType = detected;
            logger.info(`🔍 Detected ${detected} browser`);
          }
        }
      }
    } else {
      // User specified a browser, save it for next time
      await BrowserConfig.saveLastUsedBrowser(browserType);
    }

    // Step 3: Launch the browser
    const spinner = ora(`Launching ${browserType || 'browser'}...`).start();

    try {
      // Check if it's a Playwright browser (firefox, webkit, or explicitly requested chromium)
      if (
        ['firefox', 'webkit', 'chromium'].includes(browserType) &&
        browserType !== 'chrome'
      ) {
        // Distinguish between 'chromium' (playwright) and 'chrome' (system)

        // Check if Playwright browsers are installed
        const installed = await BrowserConfig.checkBrowsersInstalled();
        if (!installed) {
          spinner.info(chalk.yellow('Installing Playwright browsers...'));
          const success = await BrowserConfig.installBrowsers();
          if (!success) {
            throw new Error('Failed to install Playwright browsers');
          }
        }

        // Launch Playwright browser - for now just throw error as we focus on system browsers
        throw new Error(
          'Playwright browser launch not yet implemented. Use system Chrome instead.'
        );
      } else {
        // Launch system browser (chrome, brave, edge, etc.)
        await BrowserHelper.launchChrome(port, browserType);
      }

      spinner.succeed(chalk.green(`✅ Launched ${browserType} on port ${port}`));

      // Save options for next time
      await BrowserConfig.saveLastUsedOptions({
        port,
        headless: options.headless,
        devtools: options.devtools
      });

      // Navigate to URL if provided
      if (url) {
        try {
          // Wait a bit for browser to be ready
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Try to connect and navigate via Playwright (with auto-disconnect)
          try {
            const fullUrl = url.includes('://') ? url : `https://${url}`;
            await BrowserHelper.withBrowser(port, async browser => {
              // Find first page or create new one
              const contexts = browser.contexts();
              if (contexts.length > 0) {
                if (options.newTab) {
                  // Always create a new tab when --new-tab is specified
                  const page = await contexts[0].newPage();
                  await page.goto(fullUrl);
                } else {
                  // Use existing tab or create new one if none exist
                  const pages = contexts[0].pages();
                  if (pages.length > 0) {
                    await pages[0].goto(fullUrl);
                  } else {
                    const page = await contexts[0].newPage();
                    await page.goto(fullUrl);
                  }
                }
              }
            });
            logger.info(
              chalk.gray(
                `   ${options.newTab ? 'Opened new tab' : 'Navigated to'}: ${fullUrl}`
              )
            );
          } catch {
            // If Playwright fails, use HTTP API
            const fullUrl = url.includes('://') ? url : `https://${url}`;
            await BrowserHelper.createTabHTTP(port, fullUrl);
            logger.info(`   Opened new tab: ${fullUrl}`);
          }
        } catch (error) {
          logger.warn(`   Could not navigate to ${url}`);
        }
      }
    } catch (error: any) {
      spinner.fail(chalk.red(`❌ Failed to launch browser: ${error.message}`));

      if (error.message.includes('not found')) {
        logger.info('\n' + chalk.yellow('No browser found. Install one of:'));
        logger.info('  • Chrome: https://www.google.com/chrome/');
        logger.info('  • Brave: https://brave.com/');
        logger.info('  • Edge: https://www.microsoft.com/edge');
        logger.info('\nOr install Playwright browsers:');
        logger.info('  npx playwright install');
      }
      process.exit(1);
    }
  });
