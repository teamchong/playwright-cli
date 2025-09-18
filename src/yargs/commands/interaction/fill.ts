/**
 * Fill Command - Yargs Implementation
 *
 * Fills multiple form fields with values using Playwright's page.fill() method.
 * Accepts selector=value pairs to fill multiple fields in one command.
 */

import { createCommand } from '../../lib/command-builder'
import { BrowserHelper } from '../../../lib/browser-helper'
import { refManager } from '../../../lib/ref-manager'
import { findBestSelector } from '../../../lib/selector-resolver'
import type { FillOptions } from '../../types'
import chalk from 'chalk'

interface FillWithRefOptions extends FillOptions {
  ref?: string
}

export const fillCommand = createCommand<FillWithRefOptions>({
  metadata: {
    name: 'fill',
    category: 'interaction',
    description: 'Fill form fields with values',
    aliases: [],
  },

  command: 'fill [fields...]',
  describe: 'Fill form fields with values',

  builder: yargs => {
    return yargs
      .positional('fields', {
        describe:
          'Field selector=value pairs (e.g., "#email=test@example.com" "#password=secret")',
        type: 'string',
        array: true,
      })
      .option('ref', {
        describe: 'Use reference from snapshot to fill a single field',
        type: 'string',
        alias: 'r',
      })
      .check(argv => {
        if (!argv.fields?.length && !argv.ref) {
          throw new Error('Either fields or --ref must be provided')
        }
        if (argv.ref && (!argv.fields || argv.fields.length !== 1)) {
          throw new Error('When using --ref, provide exactly one value')
        }
        return true
      })
      .option('form', {
        describe: 'Scope all fields to a specific form (CSS selector)',
        type: 'string',
      })
      .option('port', {
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
        alias: 'p',
      })
      .option('timeout', {
        describe: 'Timeout in milliseconds',
        type: 'number',
        default: 5000,
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
      .option('quiet', {
        describe: 'Suppress output',
        type: 'boolean',
        default: false,
      })
      .option('json', {
        describe: 'Output results as JSON',
        type: 'boolean',
        default: false,
      })
      .conflicts('tab-index', 'tab-id')
  },

  handler: async ({ argv, logger, spinner }) => {
    const { fields, port, timeout, ref } = argv
    const tabIndex = argv['tab-index'] as number | undefined
    const tabId = argv['tab-id'] as string | undefined
    const formScope = argv.form as string | undefined
    const quiet = argv.quiet as boolean
    const json = argv.json as boolean
    
    // Handle --ref mode (single field fill)
    if (ref) {
      const storedSelector = refManager.getSelector(ref, tabId)
      if (!storedSelector) {
        const errorMsg = `ref not found: Element with ref=${ref} not found`
        logger.error(chalk.red(`❌ ${errorMsg}`))
        throw new Error(errorMsg)
      }
      
      const value = fields![0] // We checked in validation that exactly one value is provided
      
      await BrowserHelper.withTargetPage(port, tabIndex, tabId, async page => {
        try {
          await page.fill(storedSelector, value, { timeout: timeout as number })
          logger.success(`Filled [ref=${ref}] with "${value}"`)
        } catch (err: any) {
          logger.error(`Failed to fill [ref=${ref}]: ${err.message}`)
          throw err
        }
      })
      return
    }

    const tabTarget =
      tabIndex !== undefined
        ? ` in tab ${tabIndex}`
        : tabId !== undefined
          ? ` in tab ${tabId.slice(0, 8)}...`
          : ''

    if (spinner) {
      spinner.text = `Filling ${fields.length} field(s)${tabTarget}...`
    }

    let filledCount = 0
    const errors: string[] = []
    const results: Array<{ field: string; value: string; success: boolean; error?: string }> = []

    await BrowserHelper.withTargetPage(port, tabIndex, tabId, async page => {
      for (const field of fields!) {
        const [selectorPart, ...valueParts] = field.split('=')
        const value = valueParts.join('=') // Handle values with = in them

        if (!selectorPart || value === undefined) {
          errors.push(`Invalid field format: ${field}. Use selector=value`)
          continue
        }

        try {
          let actualSelector = selectorPart
          let strategy = 'direct'
          let localFormScope = formScope || ''
          
          // Check if selector has inline form scoping (e.g., "#registration-form email")
          const parts = selectorPart.trim().split(/\s+/)
          if (parts.length === 2 && (parts[0].startsWith('#') || parts[0].startsWith('.'))) {
            localFormScope = parts[0]
            actualSelector = parts[1]
          }
          
          // For simple identifiers (no CSS selector syntax), try field-specific resolution
          if (!actualSelector.startsWith('#') && !actualSelector.startsWith('.') && !actualSelector.startsWith('[')) {
            // Try to find form field by various attributes
            const fieldSelectors = [
              `[name="${actualSelector}"]`,        // by name attribute
              `#${actualSelector}`,                 // by id
              `[placeholder*="${actualSelector}" i]`, // by placeholder (case-insensitive)
              `input[aria-label*="${actualSelector}" i]`, // by aria-label
            ]
            
            // Add form scope if provided
            if (localFormScope) {
              for (let i = 0; i < fieldSelectors.length; i++) {
                fieldSelectors[i] = `${localFormScope} ${fieldSelectors[i]}`
              }
            }
            
            let found = false
            for (const fieldSelector of fieldSelectors) {
              try {
                const element = await page.$(fieldSelector)
                if (element) {
                  actualSelector = fieldSelector
                  strategy = fieldSelector.includes('[name=') ? 'name' : 
                            fieldSelector.includes('#') && !fieldSelector.includes(' #') ? 'id' :
                            fieldSelector.includes('placeholder') ? 'placeholder' : 'aria-label'
                  found = true
                  break
                }
              } catch {
                // Continue to next selector
              }
            }
            
            // If still not found, try finding by label text
            if (!found) {
              try {
                // Try to find label with exact text match first
                const labelSelector = localFormScope ? 
                  `${localFormScope} label:text("${actualSelector}")` : 
                  `label:text("${actualSelector}")`
                const labelElement = await page.$(labelSelector)
                if (labelElement) {
                  const forAttr = await labelElement.getAttribute('for')
                  if (forAttr) {
                    actualSelector = localFormScope ? `${localFormScope} #${forAttr}` : `#${forAttr}`
                    strategy = 'label'
                    found = true
                  }
                }
              } catch {
                // Try contains text as fallback
                try {
                  const labelSelector = localFormScope ?
                    `${localFormScope} label:has-text("${actualSelector}")` :
                    `label:has-text("${actualSelector}")`
                  const labelElement = await page.$(labelSelector)
                  if (labelElement) {
                    const forAttr = await labelElement.getAttribute('for')
                    if (forAttr) {
                      actualSelector = localFormScope ? `${localFormScope} #${forAttr}` : `#${forAttr}`
                      strategy = 'label'
                      found = true
                    }
                  }
                } catch {
                  // Fall back to text-based selector resolution
                }
              }
            }
            
            // If no field-specific match found, try text-based selector resolution
            if (!found) {
              const textSelectorResult = await findBestSelector(page, actualSelector)
              if (textSelectorResult) {
                actualSelector = localFormScope ? 
                  `${localFormScope} ${textSelectorResult.selector}` : 
                  textSelectorResult.selector
                strategy = textSelectorResult.strategy
              }
            }
          }
          
          if (spinner) {
            spinner.text = `Filling field via ${strategy}: ${selectorPart}...`
          }
          
          await page.fill(actualSelector, value, { timeout: timeout as number })
          if (!quiet && !json) {
            logger.info(`  ✓ Filled ${selectorPart} with "${value}"`)
          }
          results.push({ field: selectorPart, value, success: true })
          filledCount++
        } catch (err: any) {
          const errorMsg = err.message
          errors.push(`Failed to fill ${selectorPart}: ${errorMsg}`)
          results.push({ field: selectorPart, value, success: false, error: errorMsg })
        }
      }
    })

    // Handle output based on flags
    if (json) {
      // JSON output
      console.log(JSON.stringify({
        success: errors.length === 0,
        filled: filledCount,
        total: fields!.length,
        results
      }, null, 2))
    } else if (!quiet) {
      // Normal output
      if (errors.length > 0) {
        errors.forEach(error => logger.warn(`  ⚠️  ${error}`))
      }
      
      // Report summary
      const summaryMsg = filledCount === fields!.length ? 
        `✅ Filled all ${filledCount} field(s)${tabTarget}` :
        `Filled ${filledCount} of ${fields!.length} field(s)${tabTarget}`
      logger.success(summaryMsg)
    }
  },
})
