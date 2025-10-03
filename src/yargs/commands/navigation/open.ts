/**
 * Open Command - Yargs Implementation
 *
 * Opens browser (connects if running, launches if not) and optionally navigates to a URL.
 */

import { createCommand } from '../../lib/command-builder'
import { BrowserHelper } from '../../../lib/browser-helper'
import { logger } from '../../../lib/logger'
import type { OpenOptions } from '../../types'

/**
 * Checks if a port is open and accepting connections.
 * Uses TCP socket connection with 1-second timeout.
 */
async function isPortOpen(port: number): Promise<boolean> {
  try {
    const net = require('net')
    return new Promise(resolve => {
      const socket = net.createConnection(port, 'localhost')

      const cleanup = () => {
        socket.removeAllListeners()
        if (!socket.destroyed) {
          socket.destroy()
        }
      }

      socket.on('connect', () => {
        cleanup()
        resolve(true)
      })
      socket.on('error', () => {
        cleanup()
        resolve(false)
      })
      socket.setTimeout(1000)
      socket.on('timeout', () => {
        cleanup()
        resolve(false)
      })
    })
  } catch {
    return false
  }
}

export const openCommand = createCommand<OpenOptions>({
  metadata: {
    name: 'open',
    category: 'navigation',
    description: 'Open browser (connects if running, launches if not)',
  },

  command: 'open [url]',
  describe: 'Open browser (connects if running, launches if not)',

  builder: yargs => {
    return yargs
      .positional('url', {
        describe: 'Optional URL to navigate to',
        type: 'string',
      })
      .option('port', {
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
        alias: 'p',
      })
      .option('newTab', {
        describe: 'Always open URL in a new tab',
        type: 'boolean',
        alias: 'n',
      })
      .option('newWindow', {
        describe: 'Open URL in a new window',
        type: 'boolean',
      })
      .option('device', {
        describe: 'Device to emulate',
        type: 'string',
      })
      .option('geolocation', {
        describe: 'Geolocation override (latitude,longitude)',
        type: 'string',
      })
      .option('timezone', {
        describe: 'Timezone override',
        type: 'string',
      })
      .example('$0 open', 'Open browser')
      .example(
        '$0 open https://example.com',
        'Open browser and navigate to URL'
      )
      .example('$0 open https://example.com --new-tab', 'Open URL in new tab')
      .example(
        '$0 open https://example.com --device "iPhone 12"',
        'Open with device emulation'
      )
  },

  handler: async ({ argv, logger, spinner }) => {
    const { url, newTab, newWindow, device, geolocation, timezone } = argv

    if (spinner) {
      spinner.start('Opening browser...')
    }

    try {
      // First, check if browser is already running
      const isRunning = await isPortOpen(argv.port)

      if (!isRunning) {
        // Launch new browser if not running
        if (spinner) {
          spinner.text = 'Launching browser...'
        }

        // Launch browser WITHOUT URL to avoid Chrome crashes on invalid URLs
        // We'll navigate using Playwright which has better error handling
        await BrowserHelper.launchChrome(argv.port, undefined, undefined)

        if (spinner) {
          spinner.succeed(`Browser launched on port ${argv.port}`)
        }

        // If URL was provided, navigate to it and validate
        if (url) {
          await BrowserHelper.withBrowser(argv.port, async browser => {
            if (argv.verbose) console.log('withBrowser callback started')
            const contexts = browser.contexts()
            if (argv.verbose) console.log('Got contexts:', contexts.length)
            const context =
              contexts.length > 0 ? contexts[0] : await browser.newContext()
            if (argv.verbose) console.log('Got context')
            const pages = context.pages()
            if (argv.verbose) console.log('Got pages:', pages.length)

            let page
            if (pages.length > 0) {
              page = pages[0]
            } else {
              page = await context.newPage()
            }
            if (argv.verbose) console.log('Got page')

            // Add protocol if missing
            const urlString = url as string
            const fullUrl = urlString.includes('://') ? urlString : `https://${urlString}`
            if (argv.verbose) console.log('About to navigate to:', fullUrl)

            // Navigate using Playwright which validates properly
            const response = await Promise.race([
              page.goto(fullUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 5000,
              }),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(`Navigation timeout after 5000ms`)), 5000)
              )
            ])
            if (argv.verbose) console.log('Navigation completed')

            // Check if navigation succeeded
            const finalUrl = page.url()
            if (
              !response ||
              (response.status && response.status() >= 400) ||
              finalUrl.includes('chrome-error://')
            ) {
              throw new Error(
                `Cannot navigate to invalid URL or unreachable server: ${fullUrl}`
              )
            }

            logger.success(`Navigated to ${url}`)
          })
        }

        return // Exit early since launch handles navigation
      }

      // Port is open - try to connect, but handle zombie processes
      try {
        await BrowserHelper.withBrowser(argv.port, async browser => {
          // Connection succeeded, browser is responsive
          if (spinner) {
            spinner.text = 'Browser connected'
          }

          // Get or create context
          const contexts = browser.contexts()
          let context =
            contexts.length > 0 ? contexts[0] : await browser.newContext()

          // Apply device emulation if specified
          if (device) {
            // This would need device registry implementation
            logger.info(`Device emulation: ${device}`)
          }

          // Apply geolocation if specified
          if (geolocation) {
            const [latitude, longitude] = geolocation.split(',').map(Number)
            if (!isNaN(latitude) && !isNaN(longitude)) {
              await context.setGeolocation({ latitude, longitude })
              await context.grantPermissions(['geolocation'])
              logger.info(`Geolocation set to: ${latitude}, ${longitude}`)
            } else {
              throw new Error(
                'Invalid geolocation format. Use: latitude,longitude'
              )
            }
          }

          // Apply timezone if specified
          if (timezone) {
            await context.setExtraHTTPHeaders({ timezone: timezone })
            logger.info(`Timezone set to: ${timezone}`)
          }

          let tabId: string | undefined

          // Handle URL navigation
          if (url && typeof url === 'string') {
            const fullUrl = url.includes('://') ? url : `https://${url}`

            if (newWindow) {
              // Create new context for new window
              const newContext = await browser.newContext()
              const page = await newContext.newPage()

              const response = await page.goto(fullUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 5000,
              })
              // Check if navigation succeeded
              const finalUrl = page.url()
              // Allow redirects but catch error pages
              if (!response || response.status() >= 400 || finalUrl.includes('chrome-error://')) {
                throw new Error(
                  `Cannot navigate to invalid URL or unreachable server: ${fullUrl}`
                )
              }

              tabId = await BrowserHelper.getPageId(page)
              logger.info(`Opened new window: ${fullUrl}`)
              logger.info(`Tab ID: ${tabId}`)
            } else if (newTab) {
              // Create new tab in existing context
              const page = await context.newPage()

              const response = await page.goto(fullUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 5000,
              })
              // Check if navigation succeeded
              const finalUrl = page.url()
              // Allow redirects but catch error pages
              if (!response || response.status() >= 400 || finalUrl.includes('chrome-error://')) {
                throw new Error(
                  `Cannot navigate to invalid URL or unreachable server: ${fullUrl}`
                )
              }

              tabId = await BrowserHelper.getPageId(page)
              logger.info(`Opened new tab: ${fullUrl}`)
              logger.info(`Tab ID: ${tabId}`)
            } else {
              // Check if URL is already open in any tab - if so, reuse it
              const pages = context.pages()
              const existingPage = pages.find(p => p.url() === fullUrl)

              if (existingPage) {
                // URL is already open - just switch to that tab
                await existingPage.bringToFront()
                tabId = await BrowserHelper.getPageId(existingPage)
                logger.info(`✅ Already on ${fullUrl} - using existing tab`)
                logger.info(`Tab ID: ${tabId}`)
              } else if (pages.length > 0) {
                // Use first available tab and navigate
                const response = await pages[0].goto(fullUrl, {
                  waitUntil: 'domcontentloaded',
                  timeout: 5000,
                })
                // Check if navigation succeeded
                const finalUrl = pages[0].url()
                // Allow redirects but catch error pages
                if (!response || response.status() >= 400 || finalUrl.includes('chrome-error://')) {
                  throw new Error(
                    `Cannot navigate to invalid URL or unreachable server: ${fullUrl}`
                  )
                }

                tabId = await BrowserHelper.getPageId(pages[0])
                logger.info(`Navigated to: ${fullUrl}`)
                logger.info(`Tab ID: ${tabId}`)
              } else {
                const page = await context.newPage()

                const response = await page.goto(fullUrl, {
                  waitUntil: 'domcontentloaded',
                  timeout: 5000,
                })
                // Check if navigation succeeded
                const finalUrl = page.url()
                // Allow redirects but catch error pages
                if (!response || response.status() >= 400 || finalUrl.includes('chrome-error://')) {
                  throw new Error(
                    `Cannot navigate to invalid URL or unreachable server: ${fullUrl}`
                  )
                }

                tabId = await BrowserHelper.getPageId(page)
                logger.info(`Opened new tab: ${fullUrl}`)
                logger.info(`Tab ID: ${tabId}`)
              }
            }
          } else {
            // No URL specified, just ensure we have a tab and return its ID
            const pages = context.pages()
            if (pages.length > 0) {
              tabId = await BrowserHelper.getPageId(pages[0])
              logger.info(`Tab ID: ${tabId}`)
            } else {
              const page = await context.newPage()
              tabId = await BrowserHelper.getPageId(page)
              logger.info(`Created new tab`)
              logger.info(`Tab ID: ${tabId}`)
            }
          }

          if (spinner) {
            spinner.succeed('Browser opened successfully')
          }

          logger.success(`Browser connected on port ${argv.port}`)

          if (argv.json) {
            console.log(
              JSON.stringify({
                success: true,
                port: argv.port,
                url: url || null,
                newTab: newTab || false,
                newWindow: newWindow || false,
                device: device || null,
                geolocation: geolocation || null,
                timezone: timezone || null,
                tabId: tabId || null,
              })
            )
          }
        })
      } catch (connectionError: any) {
        // Port is open but connection failed - zombie process detected
        if (spinner) {
          spinner.text = 'Zombie process detected, relaunching browser...'
        }

        // Kill the zombie process
        try {
          const { execSync: execSyncKill } = require('child_process')
          execSyncKill(`lsof -ti:${argv.port} | xargs kill -9`, {
            stdio: 'ignore',
          })
        } catch {
          // If kill fails, continue anyway and try to launch
        }

        // Wait a bit for port to be released
        await new Promise(resolve => setTimeout(resolve, 500))

        // Now launch a fresh browser
        if (spinner) {
          spinner.text = 'Launching browser...'
        }

        await BrowserHelper.launchChrome(
          argv.port,
          undefined,
          url as string | undefined
        )

        if (spinner) {
          spinner.succeed(`Browser launched on port ${argv.port}`)
        }

        if (url) {
          logger.success(`Navigated to ${url}`)
        }

        return
      }
    } catch (error: any) {
      if (spinner) {
        // Check for various connection/navigation errors and provide user-friendly messages
        if (
          error.message &&
          (error.message.includes('ERR_CONNECTION_REFUSED') ||
            error.message.includes('Cannot navigate to invalid URL') ||
            error.message.includes('net::ERR_') ||
            error.message.includes('Protocol error'))
        ) {
          spinner.fail('Connection failed - no server running')
        } else {
          spinner.fail('Failed to open browser')
        }
      }

      // Throw a custom error with user-friendly message for connection/navigation errors
      if (
        error.message &&
        (error.message.includes('ERR_CONNECTION_REFUSED') ||
          error.message.includes('Cannot navigate to invalid URL') ||
          error.message.includes('net::ERR_') ||
          error.message.includes('Protocol error'))
      ) {
        throw new Error(
          'Connection failed - make sure a server is running at the target URL'
        )
      } else {
        throw new Error(`Browser connection failed: ${error.message}`)
      }
    }
  },

  supportsJson: true,
})
