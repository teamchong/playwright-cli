/**
 * Network Command - Yargs Implementation
 *
 * Captures network requests and responses snapshot and returns immediately.
 * Returns tab ID and network activity for reference.
 */

import chalk from 'chalk'
import { createCommand } from '../../lib/command-builder'
import { BrowserHelper } from '../../../lib/browser-helper'
import type { NetworkOptions } from '../../types'

export const networkCommand = createCommand<NetworkOptions>({
  metadata: {
    name: 'network',
    category: 'advanced',
    description: 'Monitor network requests',
    aliases: [],
  },

  command: 'network',
  describe: 'Monitor network requests',

  builder: yargs => {
    return yargs
      .option('port', {
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
        alias: 'p',
      })
      .option('filter', {
        describe: 'Filter URLs by pattern',
        type: 'string',
        alias: 'f',
      })
      .option('method', {
        describe: 'Filter by HTTP method',
        type: 'string',
        choices: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
        alias: 'm',
      })
      .option('status', {
        describe: 'Filter by status code',
        type: 'number',
        alias: 's',
      })
      .option('json', {
        describe: 'Output as JSON',
        type: 'boolean',
        default: false,
      })
      .example('$0 network', 'Monitor all network requests')
      .example('$0 network --filter api', 'Monitor requests containing "api"')
      .example('$0 network --method POST', 'Monitor only POST requests')
      .example('$0 network --status 404', 'Monitor only 404 responses')
  },

  handler: async cmdContext => {
    try {
      const { argv, logger } = cmdContext

      const page = await BrowserHelper.getActivePage(argv.port)
      if (!page) {
        throw new Error('No active page. Use "playwright open" first')
      }

      const requests: any[] = []
      const requestMap = new Map<string, any>()

      // Set up request listener
      page.on('request', request => {
        const url = request.url()
        const method = request.method()

        // Apply filters
        if (argv.filter && !url.includes(argv.filter)) {
          return
        }
        if (argv.method && method !== argv.method) {
          return
        }

        const requestInfo = {
          url,
          method,
          resourceType: request.resourceType(),
          timestamp: new Date().toISOString(),
          headers: request.headers(),
        }

        // Store request for matching with response
        requestMap.set(request.url() + request.method(), requestInfo)
        requests.push(requestInfo)

        if (!argv.json) {
          logger.info(
            `${chalk.cyan(`→ ${method} ${requestInfo.resourceType}`)} ${url}`
          )
        }
      })

      // Set up response listener
      page.on('response', response => {
        const url = response.url()
        const status = response.status()
        const request = response.request()
        const method = request.method()

        // Apply filters
        if (argv.filter && !url.includes(argv.filter)) {
          return
        }
        if (argv.method && method !== argv.method) {
          return
        }
        if (argv.status && status !== argv.status) {
          return
        }

        const responseInfo = {
          url,
          status,
          method,
          statusText: response.statusText(),
          headers: response.headers(),
          timestamp: new Date().toISOString(),
        }

        // Update request with response data
        const requestKey = url + method
        const requestData = requestMap.get(requestKey)
        if (requestData) {
          requestData.response = responseInfo
        }

        if (!argv.json) {
          const statusColor =
            status >= 400
              ? chalk.red
              : status >= 300
                ? chalk.yellow
                : chalk.green
          logger.info(`${statusColor(`← ${status}`)} ${url}`)
        }
      })

      // Set up request failed listener
      page.on('requestfailed', request => {
        const url = request.url()
        const method = request.method()

        // Apply filters
        if (argv.filter && !url.includes(argv.filter)) {
          return
        }
        if (argv.method && method !== argv.method) {
          return
        }

        const failureInfo = {
          url,
          method,
          failure: request.failure()?.errorText || 'Unknown error',
          timestamp: new Date().toISOString(),
        }

        if (!argv.json) {
          logger.info(
            `${chalk.red(`✗ ${method}`)} ${url} - ${failureInfo.failure}`
          )
        }

        requests.push(failureInfo)
      })

      // Get tab ID for reference
      const tabId = BrowserHelper.getPageId(page)

      // Capture current network state and exit immediately
      // Wait briefly to capture any active requests (500ms)
      await new Promise(resolve => setTimeout(resolve, 500))

      if (argv.json) {
        logger.json({
          success: true,
          tabId,
          requests,
          count: requests.length,
          timestamp: new Date().toISOString(),
        })
      } else {
        logger.success(`✅ Network snapshot for tab: ${tabId}`)
        if (requests.length === 0) {
          logger.info(`📡 No active network requests`)
        } else {
          logger.info(`📡 ${requests.length} request(s) captured:`)
          requests.slice(0, 10).forEach(req => {
            const method = req.request?.method || 'GET'
            const status = req.response?.status
            const statusColor =
              status >= 400
                ? chalk.red
                : status >= 300
                  ? chalk.yellow
                  : chalk.green
            logger.info(
              `  ${method} ${req.url} ${status ? statusColor(status) : ''}`
            )
          })
          if (requests.length > 10) {
            logger.info(`  ... and ${requests.length - 10} more`)
          }
        }
      }
    } catch (error: any) {
      cmdContext.logger.error(`Failed to monitor network: ${error.message}`)
      throw new Error('Command failed')
    }
  },
})
