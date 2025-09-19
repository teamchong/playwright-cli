/**
 * Context Command - Show current browser/page state for LLM visibility
 * 
 * Provides contextual information about the current page state including:
 * - Current URL and title
 * - Page load status and timing
 * - Interactive element counts
 * - Form state information
 * - Navigation history availability
 * - Recent user actions
 */

import { CommandModule, Arguments } from 'yargs'
import chalk from 'chalk'
import { BrowserHelper } from '../../../lib/browser-helper'
import { logger } from '../../../lib/logger'
import { extractInteractiveElements } from '../../../lib/ref-utils'
import { actionHistory } from '../../../lib/action-history'

interface ContextArgs extends Arguments {
  'port': number
  'timeout': number
  'json'?: boolean
  'verbose'?: boolean
  'tab-index'?: number
  'tab-id'?: string
}

export const contextCommand: CommandModule<{}, ContextArgs> = {
  command: 'context',
  describe: 'Show current page context and state information',

  builder: yargs => {
    return yargs
      .option('port', {
        alias: 'p',
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
      })
      .option('timeout', {
        alias: 't',
        describe: 'Timeout in milliseconds',
        type: 'number',
        default: 10000,
      })
      .option('json', {
        describe: 'Output as JSON format',
        type: 'boolean',
      })
      .option('verbose', {
        describe: 'Show detailed information including technical details',
        type: 'boolean',
      })
      .option('tab-index', {
        describe: 'Target specific tab by index (0-based)',
        type: 'number',
        alias: 'tab',
      })
      .option('tab-id', {
        describe: 'Target specific tab by unique ID',
        type: 'string',
      })
      .conflicts('tab-index', 'tab-id')
  },

  handler: async argv => {
    const tabIndex = argv['tab-index'] as number | undefined
    const tabId = argv['tab-id'] as string | undefined

    try {
      const context = await BrowserHelper.withTargetPage(
        argv.port,
        tabIndex,
        tabId,
        async page => {
          // Gather page information
          const url = page.url()
          const title = await page.title().catch(() => 'Unknown')
          
          // Check page state
          const readyState = await page.evaluate('document.readyState').catch(() => 'unknown')
          const loadTime = await page.evaluate(`
            try {
              if (performance.timing) {
                const nav = performance.timing;
                const loadComplete = nav.loadEventEnd - nav.navigationStart;
                return loadComplete > 0 ? loadComplete : null;
              }
            } catch (e) {
              // Performance timing not available
            }
            return null;
          `).catch(() => null)

          // Get interactive elements count
          let interactiveElements: any[] = []
          let elementCounts = { buttons: 0, links: 0, inputs: 0, forms: 0 }
          
          try {
            const snapshot = await page.accessibility.snapshot()
            if (snapshot) {
              interactiveElements = extractInteractiveElements(snapshot)
              
              // Count element types
              elementCounts = interactiveElements.reduce((counts, elem) => {
                switch (elem.role) {
                  case 'button': counts.buttons++; break
                  case 'link': counts.links++; break
                  case 'textbox': counts.inputs++; break
                  default: break
                }
                return counts
              }, { buttons: 0, links: 0, inputs: 0, forms: 0 })
              
              // Count forms separately
              elementCounts.forms = await page.locator('form').count().catch(() => 0)
            }
          } catch (error) {
            // Accessibility snapshot might fail, continue without it
          }

          // Check navigation capabilities
          const canGoBack = await page.evaluate('history.length > 1').catch(() => false)
          
          // Get form state information
          const formInfo = await page.evaluate(`
            const forms = Array.from(document.querySelectorAll('form'));
            const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
            
            const filledInputs = inputs.filter(input => {
              if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
                return input.value && input.value.trim() !== '';
              }
              if (input.tagName === 'SELECT') {
                return input.selectedIndex > 0;
              }
              return false;
            });
            
            return {
              totalForms: forms.length,
              totalInputs: inputs.length,
              filledInputs: filledInputs.length,
              emptyInputs: inputs.length - filledInputs.length
            };
          `).catch(() => ({
            totalForms: 0,
            totalInputs: 0,
            filledInputs: 0,
            emptyInputs: 0
          }))

          // Get viewport info if verbose
          let viewportInfo = null
          if (argv.verbose) {
            viewportInfo = await page.evaluate(`({
              width: window.innerWidth,
              height: window.innerHeight,
              scrollX: window.scrollX,
              scrollY: window.scrollY,
              userAgent: navigator.userAgent
            })`).catch(() => null)
          }

          // Get recent actions
          const recentActions = actionHistory.getRecentActions(5, tabId)
          const lastAction = actionHistory.getLastAction(tabId)
          
          return {
            page: {
              url,
              title,
              readyState,
              loadTime,
              domain: new URL(url).hostname
            },
            navigation: {
              canGoBack,
              historyLength: await page.evaluate('history.length').catch(() => 1)
            },
            elements: {
              interactive: interactiveElements.length,
              ...elementCounts
            },
            forms: formInfo,
            viewport: viewportInfo,
            actions: {
              recent: recentActions.map(a => actionHistory.formatAction(a)),
              last: lastAction ? actionHistory.formatAction(lastAction) : null
            },
            tabInfo: {
              tabIndex,
              tabId: tabId?.slice(0, 8) + '...' || 'current'
            }
          }
        }
      )

      if (argv.json) {
        // Flatten the structure for JSON output to match expected format
        const jsonOutput = {
          url: context.page.url,
          title: context.page.title,
          domain: context.page.domain,
          readyState: context.page.readyState,
          loadTime: context.page.loadTime,
          elements: context.elements,
          forms: context.forms,
          navigation: context.navigation,
          history: context.actions.recent || [],
          lastAction: context.actions.last,
          tabInfo: context.tabInfo,
          viewport: context.viewport
        }
        logger.info(JSON.stringify(jsonOutput, null, 2))
      } else {
        // Format output for human reading
        logger.info(chalk.blue('📍 Current Page Context'))
        logger.info(chalk.gray('─'.repeat(50)))
        
        // Page information
        logger.info(`${chalk.green('URL:')} ${context.page.url}`)
        logger.info(`${chalk.green('Title:')} ${context.page.title}`)
        logger.info(`${chalk.green('Domain:')} ${context.page.domain}`)
        logger.info(`${chalk.green('State:')} ${context.page.readyState}`)

        // Always show load time info
        if (context.page.loadTime && typeof context.page.loadTime === 'number') {
          const loadTimeDesc = context.page.loadTime < 1000
            ? `${context.page.loadTime}ms`
            : `${(context.page.loadTime / 1000).toFixed(1)}s`
          logger.info(`${chalk.green('Load time:')} ${loadTimeDesc} ago`)
        } else {
          logger.info(`${chalk.green('Load time:')} Page loaded`)
        }

        logger.info('')
        
        // Interactive elements
        logger.info(chalk.blue('🔗 Interactive Elements'))
        logger.info(`  ${context.elements.buttons} button(s)`)
        logger.info(`  ${context.elements.links} link(s)`)
        logger.info(`  ${context.elements.inputs} input field(s)`)
        logger.info(`  ${context.elements.forms} form(s)`)
        logger.info(`  ${chalk.gray(`Total: ${context.elements.interactive} interactive elements`)}`)

        logger.info('')

        // Form state
        const forms = context.forms as any
        if (forms.totalForms > 0) {
          logger.info(chalk.blue('📝 Form Status'))
          logger.info(`  ${forms.totalInputs} total input fields`)
          if (forms.filledInputs > 0) {
            logger.info(`  ${chalk.green(`${forms.filledInputs} filled`)}`)
          }
          if (forms.emptyInputs > 0) {
            logger.info(`  ${chalk.yellow(`${forms.emptyInputs} empty`)}`)
          }
        }

        // Navigation
        logger.info('')
        logger.info(chalk.blue('🧭 Navigation'))
        logger.info(`  Can go back: ${context.navigation.canGoBack ? chalk.green('Yes') : chalk.gray('No')}`)
        logger.info(`  History length: ${context.navigation.historyLength}`)
        
        // Recent actions - always show section even if empty
        logger.info('')
        logger.info(chalk.blue('📜 Recent Actions'))
        const actions = context.actions as any
        if (actions && actions.recent && actions.recent.length > 0) {
          actions.recent.forEach((action: string, index: number) => {
            if (index === 0 && actions.last) {
              logger.info(`  Last: ${action}`)
            } else {
              logger.info(`  - ${action}`)
            }
          })
        } else {
          logger.info(`  ${chalk.gray('No recent actions')}`)
        }
        
        // Tab info
        if (tabIndex !== undefined || tabId) {
          logger.info('')
          logger.info(chalk.blue('🗂️  Tab Info'))
          if (tabIndex !== undefined) {
            logger.info(`  Tab Index: ${tabIndex}`)
          }
          if (tabId) {
            logger.info(`  Tab ID: ${context.tabInfo.tabId}`)
          }
        }

        // Verbose information
        const viewport = context.viewport as any
        if (argv.verbose && viewport) {
          logger.info('')
          logger.info(chalk.blue('🖥️  Technical Details'))
          logger.info(`  Viewport: ${viewport.width}x${viewport.height}`)
          logger.info(`  Scroll: (${viewport.scrollX}, ${viewport.scrollY})`)
          logger.info(`  User Agent: ${viewport.userAgent}`)
        }

        logger.info(chalk.gray('─'.repeat(50)))
        
        // Helpful suggestions
        if (context.elements.interactive === 0) {
          logger.info(chalk.yellow('💡 No interactive elements found. Try using `snapshot` to see page structure.'))
        } else if (forms.totalForms > 0 && forms.emptyInputs > 0) {
          logger.info(chalk.yellow('💡 Forms detected with empty fields. Use `snapshot --detailed` to see field information.'))
        }
      }

    } catch (error: any) {
      logger.error(chalk.red(`❌ Failed to get context: ${error.message}`))
      throw new Error('Command failed')
    }
  },
}